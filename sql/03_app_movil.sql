-- App móvil (coco-movil): entidades (empresas o personas), quién accede a cada una, categorías
-- configurables en árbol y movimientos de ingresos, gastos, inventarios y activos.
--
-- Acceso: un usuario ve una entidad solo si está en entidad_usuarios. La app móvil entra por la API
-- pública con la sesión del usuario, así que RLS es lo que separa lo de cada quien. coco web entra
-- como postgres (salta RLS) y filtra por su cuenta.

-- ---------------------------------------------------------------------------------------------
-- Utilidades
-- ---------------------------------------------------------------------------------------------

-- actualizado_en con la hora del servidor: la sincronización baja "lo que cambió desde X"
create or replace function public.marcar_actualizado() returns trigger language plpgsql as $$
begin
  new.actualizado_en := now();
  return new;
end $$;

-- creado_por no se puede cambiar después de creado el registro
create or replace function public.conservar_creador() returns trigger language plpgsql as $$
begin
  new.creado_por := old.creado_por;
  return new;
end $$;

-- ---------------------------------------------------------------------------------------------
-- Entidades y acceso
-- ---------------------------------------------------------------------------------------------

create table public.entidades (
  id uuid primary key default gen_random_uuid(),
  tipo text not null check (tipo in ('empresa', 'persona')),
  nombre text not null,
  documento text check (documento ~ '^[0-9]+$'),           -- NIT sin dígito de verificación o cédula
  activa boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);
create trigger entidades_actualizado before insert or update on public.entidades
  for each row execute function public.marcar_actualizado();

create table public.entidad_usuarios (
  entidad_id uuid not null references public.entidades(id) on delete cascade,
  usuario_id uuid not null references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now(),
  primary key (entidad_id, usuario_id)
);
create index on public.entidad_usuarios (usuario_id);

-- Quién administra coco web (entidades, accesos, categorías y las herramientas contables)
create table public.administradores (
  usuario_id uuid primary key references auth.users(id) on delete cascade,
  creado_en timestamptz not null default now()
);

-- security definer: las políticas la usan sin chocar con el RLS de entidad_usuarios
create or replace function public.tiene_acceso(entidad uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.entidad_usuarios eu
    where eu.entidad_id = entidad and eu.usuario_id = (select auth.uid())
  )
$$;

-- ---------------------------------------------------------------------------------------------
-- Categorías: árbol por entidad. Cada nodo tiene el tipo de su raíz (ingreso, gasto, inventario o activo).
-- cuenta_contable y naturaleza en null = se heredan del padre; en la raíz, la naturaleza por defecto
-- es crédito para ingresos y débito para lo demás.
-- ---------------------------------------------------------------------------------------------

create table public.categorias (
  id uuid primary key default gen_random_uuid(),        -- el teléfono puede crearla sin red con su propio uuid
  entidad_id uuid not null references public.entidades(id) on delete cascade,
  padre_id uuid,
  tipo text not null check (tipo in ('ingreso', 'gasto', 'inventario', 'activo')),
  nombre text not null check (length(trim(nombre)) > 0),
  cuenta_contable text check (cuenta_contable ~ '^[0-9]+$'),
  naturaleza text check (naturaleza in ('debito', 'credito')),
  orden integer not null default 0,
  creado_por uuid default auth.uid() references auth.users(id),
  actualizado_en timestamptz not null default now(),
  borrado boolean not null default false,
  unique (id, entidad_id, tipo),
  -- El padre es de la misma entidad y del mismo tipo
  foreign key (padre_id, entidad_id, tipo) references public.categorias(id, entidad_id, tipo)
);
create index on public.categorias (entidad_id, actualizado_en);
create index on public.categorias (padre_id);
create trigger categorias_actualizado before insert or update on public.categorias
  for each row execute function public.marcar_actualizado();
create trigger categorias_creador before update on public.categorias
  for each row execute function public.conservar_creador();

-- ---------------------------------------------------------------------------------------------
-- Movimientos
-- ---------------------------------------------------------------------------------------------

create table public.movimientos (
  id uuid primary key default gen_random_uuid(),
  entidad_id uuid not null references public.entidades(id) on delete cascade,
  categoria_id uuid not null,
  tipo text not null check (tipo in ('ingreso', 'gasto', 'inventario', 'activo')),
  fecha date not null,
  valor numeric(16, 2) not null check (valor >= 0),
  -- Inventarios y activos: entrada (compra, alta) o salida (consumo, venta, baja)
  sentido text check (sentido in ('entrada', 'salida')),
  cantidad numeric(14, 3) check (cantidad >= 0),
  unidad text,
  descripcion text,
  tercero text,
  cuenta_contable text check (cuenta_contable ~ '^[0-9]+$'),
  naturaleza text not null check (naturaleza in ('debito', 'credito')),
  creado_por uuid not null default auth.uid() references auth.users(id),
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now(),
  borrado boolean not null default false,
  -- La categoría es de la misma entidad y del mismo tipo que el movimiento
  foreign key (categoria_id, entidad_id, tipo) references public.categorias(id, entidad_id, tipo),
  check ((tipo in ('inventario', 'activo')) = (sentido is not null))
);
create index on public.movimientos (entidad_id, actualizado_en);
create index on public.movimientos (entidad_id, fecha);
create trigger movimientos_actualizado before insert or update on public.movimientos
  for each row execute function public.marcar_actualizado();
create trigger movimientos_creador before update on public.movimientos
  for each row execute function public.conservar_creador();

-- ---------------------------------------------------------------------------------------------
-- Categorías base de toda entidad nueva (el nombre se puede cambiar después)
-- ---------------------------------------------------------------------------------------------

create or replace function public.crear_categorias_base() returns trigger language plpgsql as $$
begin
  insert into public.categorias (entidad_id, tipo, nombre, naturaleza, orden, creado_por) values
    (new.id, 'ingreso',    'Ingresos',    'credito', 1, null),
    (new.id, 'gasto',      'Gastos',      'debito',  2, null),
    (new.id, 'inventario', 'Inventarios', 'debito',  3, null),
    (new.id, 'activo',     'Activos',     'debito',  4, null);
  return new;
end $$;
create trigger entidades_categorias_base after insert on public.entidades
  for each row execute function public.crear_categorias_base();

-- ---------------------------------------------------------------------------------------------
-- RLS: la API pública solo ve lo de las entidades asignadas. anon no ve nada.
-- Borrar es marcar borrado = true (así también se sincroniza), por eso no hay políticas de delete.
-- ---------------------------------------------------------------------------------------------

alter table public.entidades enable row level security;
alter table public.entidad_usuarios enable row level security;
alter table public.administradores enable row level security;
alter table public.categorias enable row level security;
alter table public.movimientos enable row level security;

revoke all on public.entidades, public.entidad_usuarios, public.administradores, public.categorias, public.movimientos from anon;
revoke insert, update, delete on public.entidades, public.entidad_usuarios, public.administradores from authenticated;
revoke delete on public.categorias, public.movimientos from authenticated;

create policy entidades_ver on public.entidades for select to authenticated
  using (public.tiene_acceso(id));

create policy entidad_usuarios_ver on public.entidad_usuarios for select to authenticated
  using (usuario_id = (select auth.uid()));

create policy categorias_ver on public.categorias for select to authenticated
  using (public.tiene_acceso(entidad_id));
create policy categorias_crear on public.categorias for insert to authenticated
  with check (public.tiene_acceso(entidad_id) and creado_por = (select auth.uid()));
create policy categorias_editar on public.categorias for update to authenticated
  using (public.tiene_acceso(entidad_id)) with check (public.tiene_acceso(entidad_id));

create policy movimientos_ver on public.movimientos for select to authenticated
  using (public.tiene_acceso(entidad_id));
create policy movimientos_crear on public.movimientos for insert to authenticated
  with check (public.tiene_acceso(entidad_id) and creado_por = (select auth.uid()));
create policy movimientos_editar on public.movimientos for update to authenticated
  using (public.tiene_acceso(entidad_id)) with check (public.tiene_acceso(entidad_id));
