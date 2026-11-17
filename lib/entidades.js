// Entidades de la app móvil (empresas o personas), quién accede a cada una y su árbol de categorías.
// coco web entra como postgres: las reglas de acceso de la app móvil (RLS) no aplican aquí, por eso
// el inicio filtra por usuario a mano y la administración es solo para administradores.
import { pool } from './db.js';
import { ErrorDatos } from './admin.js';

const texto = (v) => String(v ?? '').trim();
const TIPOS = ['ingreso', 'gasto', 'inventario', 'activo'];

function validarEntidad(e) {
  const d = { tipo: texto(e.tipo), nombre: texto(e.nombre), documento: texto(e.documento).split('-')[0].replace(/\D/g, '') || null };
  if (!['empresa', 'persona'].includes(d.tipo)) throw new ErrorDatos('Elige si es una empresa o una persona.');
  if (!d.nombre) throw new ErrorDatos('Escribe el nombre de la empresa o persona.');
  return d;
}

export async function listarEntidades() {
  const { rows } = await pool.query(`
    select e.*,
      (select count(*)::int from entidad_usuarios eu where eu.entidad_id = e.id) num_usuarios,
      (select count(*)::int from movimientos m where m.entidad_id = e.id and not m.borrado) num_movimientos
    from entidades e order by e.activa desc, e.nombre`);
  return rows;
}

export async function crearEntidad(datos) {
  const d = validarEntidad(datos);
  // El trigger entidades_categorias_base le crea Ingresos, Gastos, Inventarios y Activos
  const { rows } = await pool.query('insert into entidades (tipo, nombre, documento) values ($1, $2, $3) returning *', [d.tipo, d.nombre, d.documento]);
  return rows[0];
}

export async function detalleEntidad(id) {
  const { rows: [entidad] } = await pool.query('select * from entidades where id = $1', [id]);
  if (!entidad) throw new ErrorDatos('Esa empresa o persona no existe.', 404);
  const [usuarios, categorias] = await Promise.all([
    pool.query(`select u.id, u.email, eu.creado_en from entidad_usuarios eu join auth.users u on u.id = eu.usuario_id
                where eu.entidad_id = $1 order by u.email`, [id]),
    pool.query(`select c.id, c.padre_id, c.tipo, c.nombre, c.cuenta_contable, c.naturaleza, c.orden,
                  (select count(*)::int from movimientos m where m.categoria_id = c.id and not m.borrado) num_movimientos
                from categorias c where c.entidad_id = $1 and not c.borrado order by c.orden, c.nombre`, [id]),
  ]);
  return { entidad, usuarios: usuarios.rows, categorias: categorias.rows };
}

export async function actualizarEntidad(id, datos) {
  const d = validarEntidad(datos);
  const { rows } = await pool.query('update entidades set tipo = $2, nombre = $3, documento = $4, activa = $5 where id = $1 returning *',
    [id, d.tipo, d.nombre, d.documento, datos.activa !== false]);
  if (!rows[0]) throw new ErrorDatos('Esa empresa o persona no existe.', 404);
  return rows[0];
}

// El usuario debe existir en InsForge (Authentication → Users): aquí solo se le da acceso
export async function darAcceso(entidadId, email) {
  const correo = texto(email).toLowerCase();
  if (!correo) throw new ErrorDatos('Escribe el correo del usuario.');
  const { rows: [u] } = await pool.query('select id from auth.users where lower(email) = $1', [correo]);
  if (!u) throw new ErrorDatos(`No hay ningún usuario con el correo ${correo}. Créalo primero en InsForge (Authentication → Users).`, 404);
  await pool.query('insert into entidad_usuarios (entidad_id, usuario_id) values ($1, $2) on conflict do nothing', [entidadId, u.id]);
  return { ok: true };
}

export async function quitarAcceso(entidadId, usuarioId) {
  await pool.query('delete from entidad_usuarios where entidad_id = $1 and usuario_id = $2', [entidadId, usuarioId]);
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Categorías
// ---------------------------------------------------------------------------------------------

function validarCategoria(c) {
  const d = { nombre: texto(c.nombre), cuenta_contable: texto(c.cuenta_contable) || null, naturaleza: texto(c.naturaleza) || null };
  if (!d.nombre) throw new ErrorDatos('Escribe el nombre de la categoría.');
  if (d.cuenta_contable && !/^\d+$/.test(d.cuenta_contable)) throw new ErrorDatos('La cuenta contable va solo con números.');
  if (d.naturaleza && !['debito', 'credito'].includes(d.naturaleza)) throw new ErrorDatos('La naturaleza es débito o crédito.');
  return d;
}

// Sin padre crea una categoría principal nueva (de cualquiera de los cuatro tipos)
export async function crearCategoria(entidadId, datos) {
  const d = validarCategoria(datos);
  let tipo = texto(datos.tipo);
  const padreId = datos.padre_id || null;
  if (padreId) {
    const { rows: [padre] } = await pool.query('select tipo from categorias where id = $1 and entidad_id = $2 and not borrado', [padreId, entidadId]);
    if (!padre) throw new ErrorDatos('La categoría de arriba ya no existe. Recarga la página.', 404);
    tipo = padre.tipo;
  } else if (!TIPOS.includes(tipo)) {
    throw new ErrorDatos('Elige si es de ingresos, gastos, inventarios o activos.');
  }
  const { rows } = await pool.query(`
    insert into categorias (entidad_id, padre_id, tipo, nombre, cuenta_contable, naturaleza, orden)
    values ($1, $2, $3, $4, $5, $6,
      (select coalesce(max(orden), 0) + 1 from categorias where entidad_id = $1 and padre_id is not distinct from $2))
    returning *`, [entidadId, padreId, tipo, d.nombre, d.cuenta_contable, d.naturaleza]);
  return rows[0];
}

export async function actualizarCategoria(id, datos) {
  const d = validarCategoria(datos);
  const { rows } = await pool.query('update categorias set nombre = $2, cuenta_contable = $3, naturaleza = $4 where id = $1 and not borrado returning *',
    [id, d.nombre, d.cuenta_contable, d.naturaleza]);
  if (!rows[0]) throw new ErrorDatos('Esa categoría ya no existe. Recarga la página.', 404);
  return rows[0];
}

// Borrar es marcar (la app móvil también se entera) y arrastra a las subcategorías.
// Los movimientos ya registrados conservan su categoría.
export async function borrarCategoria(id) {
  const { rows: [c] } = await pool.query('select padre_id from categorias where id = $1', [id]);
  if (!c) throw new ErrorDatos('Esa categoría ya no existe.', 404);
  const { rows: [{ principales }] } = await pool.query(
    `select count(*)::int principales from categorias where padre_id is null and not borrado
       and (entidad_id, tipo) = (select entidad_id, tipo from categorias where id = $1)`, [id]);
  if (!c.padre_id && principales <= 1) throw new ErrorDatos('No se puede borrar la única categoría principal de este tipo. Puedes cambiarle el nombre.');
  await pool.query(`
    with recursive rama as (select id from categorias where id = $1 union all select c.id from categorias c join rama r on c.padre_id = r.id)
    update categorias set borrado = true where id in (select id from rama)`, [id]);
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Inicio: resumen de las entidades a las que tiene acceso el usuario
// ---------------------------------------------------------------------------------------------

export async function resumenParaUsuario(usuarioId) {
  const { rows: entidades } = await pool.query(`
    select e.id, e.nombre, e.tipo,
      coalesce(sum(m.valor) filter (where m.tipo = 'ingreso'), 0)::float ingresos,
      coalesce(sum(m.valor) filter (where m.tipo = 'gasto'), 0)::float gastos,
      count(m.id)::int movimientos
    from entidades e
    join entidad_usuarios eu on eu.entidad_id = e.id and eu.usuario_id = $1
    left join movimientos m on m.entidad_id = e.id and not m.borrado and m.fecha >= date_trunc('month', current_date)
    where e.activa
    group by e.id order by e.nombre`, [usuarioId]);
  if (!entidades.length) return { entidades, ultimos: [] };

  const { rows: ultimos } = await pool.query(`
    with recursive ruta as (
      select id, padre_id, nombre::text camino from categorias where padre_id is null
      union all select c.id, c.padre_id, r.camino || ' › ' || c.nombre from categorias c join ruta r on c.padre_id = r.id
    )
    select m.id, m.fecha::text, m.tipo, m.valor::float, m.sentido, m.descripcion, e.nombre entidad,
      regexp_replace(r.camino, '^[^›]+ › ', '') categoria
    from movimientos m
    join entidades e on e.id = m.entidad_id
    join ruta r on r.id = m.categoria_id
    where not m.borrado and m.entidad_id = any($1)
    order by m.fecha desc, m.creado_en desc limit 15`, [entidades.map((e) => e.id)]);
  return { entidades, ultimos };
}
