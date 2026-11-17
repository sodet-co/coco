-- Datos iniciales: Luis Florez como persona, con acceso y administración para su usuario,
-- y su árbol de categorías. Las cuatro raíces (Ingresos, Gastos, Inventarios, Activos) las crea
-- el trigger de entidades; aquí se cuelgan las subcategorías.
do $$
declare
  usuario uuid := (select id from auth.users where email = 'luisflorez426@hotmail.com');
  entidad uuid;
  raiz uuid;
  nodo uuid;
  sub uuid;

begin
  if usuario is null then
    raise exception 'No existe el usuario luisflorez426@hotmail.com en InsForge';
  end if;

  insert into public.entidades (tipo, nombre) values ('persona', 'Luis Florez') returning id into entidad;
  insert into public.entidad_usuarios (entidad_id, usuario_id) values (entidad, usuario);
  insert into public.administradores (usuario_id) values (usuario) on conflict do nothing;

  -- Ingresos > Honorarios (Contables, Auditoría y Revisión Fiscal, Otro), Venta Ganado, Otros Ingresos
  select id into raiz from public.categorias where entidad_id = entidad and tipo = 'ingreso' and padre_id is null;
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values (entidad, raiz, 'ingreso', 'Honorarios', 1) returning id into nodo;
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values
    (entidad, nodo, 'ingreso', 'Contables', 1),
    (entidad, nodo, 'ingreso', 'Auditoría y Revisión Fiscal', 2),
    (entidad, nodo, 'ingreso', 'Otro', 3),
    (entidad, raiz, 'ingreso', 'Venta Ganado', 2),
    (entidad, raiz, 'ingreso', 'Otros Ingresos', 3);

  -- Gastos > Personal 1, Personal 2, Finca (Cultivo Palma Aceite, Cultivo Palma Coco, Generales, Construcción)
  select id into raiz from public.categorias where entidad_id = entidad and tipo = 'gasto' and padre_id is null;
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values
    (entidad, raiz, 'gasto', 'Personal 1', 1),
    (entidad, raiz, 'gasto', 'Personal 2', 2);
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values (entidad, raiz, 'gasto', 'Finca', 3) returning id into nodo;
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values
    (entidad, nodo, 'gasto', 'Cultivo Palma Aceite', 1),
    (entidad, nodo, 'gasto', 'Cultivo Palma Coco', 2),
    (entidad, nodo, 'gasto', 'Generales', 3),
    (entidad, nodo, 'gasto', 'Construcción', 4);

  -- Inventarios > Palma de Coco, Palma de Aceite, Insumos > Fertilizantes (Abono, Otros)
  select id into raiz from public.categorias where entidad_id = entidad and tipo = 'inventario' and padre_id is null;
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values
    (entidad, raiz, 'inventario', 'Palma de Coco', 1),
    (entidad, raiz, 'inventario', 'Palma de Aceite', 2);
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values (entidad, raiz, 'inventario', 'Insumos', 3) returning id into nodo;
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values (entidad, nodo, 'inventario', 'Fertilizantes', 1) returning id into sub;
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values
    (entidad, sub, 'inventario', 'Abono', 1),
    (entidad, sub, 'inventario', 'Otros', 2);

  -- Activos > Activos Fijos (Inmuebles, Maquinaria y Equipos, Herramientas, Otros)
  select id into raiz from public.categorias where entidad_id = entidad and tipo = 'activo' and padre_id is null;
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values (entidad, raiz, 'activo', 'Activos Fijos', 1) returning id into nodo;
  insert into public.categorias (entidad_id, padre_id, tipo, nombre, orden) values
    (entidad, nodo, 'activo', 'Inmuebles', 1),
    (entidad, nodo, 'activo', 'Maquinaria y Equipos', 2),
    (entidad, nodo, 'activo', 'Herramientas', 3),
    (entidad, nodo, 'activo', 'Otros', 4);
end $$;
