// Consultas de administración: empresas, cuentas bancarias, terceros, alias y reglas
import { pool } from './db.js';

const CAMPOS_EMPRESA = ['nombre', 'nit', 'prefijo_rc', 'tercero_interno', 'nit_generico', 'nota_identificado',
  'nota_por_identificar', 'cta_clientes', 'cta_por_identificar', 'ultimo_consecutivo_rc', 'activa'];

export class ErrorDatos extends Error {
  constructor(mensaje, status = 400) { super(mensaje); this.status = status; }
}

const soloDigitos = (v) => /^\d+$/.test(String(v ?? '').trim());
const texto = (v) => String(v ?? '').trim();

export function validarEmpresa(e) {
  const d = {
    nombre: texto(e.nombre), nit: texto(e.nit), prefijo_rc: texto(e.prefijo_rc).toUpperCase(),
    tercero_interno: texto(e.tercero_interno), nit_generico: texto(e.nit_generico) || '999999999',
    nota_identificado: texto(e.nota_identificado) || 'Clientes-Pagos',
    nota_por_identificar: texto(e.nota_por_identificar) || 'Pagos por Identificar',
    cta_clientes: texto(e.cta_clientes), cta_por_identificar: texto(e.cta_por_identificar),
    ultimo_consecutivo_rc: Number(e.ultimo_consecutivo_rc ?? 0), activa: e.activa !== false,
  };
  if (!d.nombre) throw new ErrorDatos('Escribe el nombre de la empresa.');
  if (!soloDigitos(d.nit)) throw new ErrorDatos('El NIT va solo con números, sin dígito de verificación. También es la clave de los PDF.');
  if (!d.prefijo_rc) throw new ErrorDatos('Escribe el prefijo de los recibos de caja (ej. SLE).');
  if (!soloDigitos(d.tercero_interno)) throw new ErrorDatos('El tercero interno es la cédula del representante legal, solo números.');
  if (!soloDigitos(d.nit_generico)) throw new ErrorDatos('El NIT genérico va solo con números.');
  if (!soloDigitos(d.cta_clientes) || !soloDigitos(d.cta_por_identificar)) throw new ErrorDatos('Las cuentas contables van solo con números.');
  if (!Number.isInteger(d.ultimo_consecutivo_rc) || d.ultimo_consecutivo_rc < 0) throw new ErrorDatos('El último consecutivo debe ser un número entero.');
  return d;
}

export async function todasLasEmpresas() {
  const { rows } = await pool.query(
    `select e.*, (select count(*) from terceros t where t.empresa_id = e.id)::int as num_terceros,
            (select count(*) from cuentas_bancarias c where c.empresa_id = e.id)::int as num_cuentas
       from empresas e order by e.activa desc, e.nombre`);
  return rows;
}

export async function crearEmpresa(datos) {
  const d = validarEmpresa(datos);
  const { rows } = await pool.query(
    `insert into empresas (${CAMPOS_EMPRESA.join(', ')}) values (${CAMPOS_EMPRESA.map((_, i) => `$${i + 1}`).join(', ')}) returning *`,
    CAMPOS_EMPRESA.map((c) => d[c]));
  // Toda empresa nueva arranca excluyendo los intereses del banco
  await pool.query(`insert into reglas_movimiento (empresa_id, patron, accion, prioridad) values ($1, 'ABONO INTERESES AHORROS', 'excluir', 10)`, [rows[0].id]);
  return rows[0];
}

export async function actualizarEmpresa(id, datos) {
  const d = validarEmpresa(datos);
  const { rows } = await pool.query(
    `update empresas set ${CAMPOS_EMPRESA.map((c, i) => `${c} = $${i + 2}`).join(', ')} where id = $1 returning *`,
    [id, ...CAMPOS_EMPRESA.map((c) => d[c])]);
  if (!rows[0]) throw new ErrorDatos('La empresa no existe.', 404);
  return rows[0];
}

export async function detalleEmpresa(id) {
  const [emp, cuentas, terceros, reglas] = await Promise.all([
    pool.query('select * from empresas where id = $1', [id]),
    pool.query('select * from cuentas_bancarias where empresa_id = $1 order by banco, numero', [id]),
    pool.query(
      `select t.id, t.nombre, t.nit, t.nit_alt,
              coalesce(json_agg(json_build_object('id', a.id, 'alias', a.alias) order by a.alias) filter (where a.id is not null), '[]') as alias
         from terceros t left join terceros_alias a on a.tercero_id = t.id
        where t.empresa_id = $1 group by t.id order by t.nombre`, [id]),
    pool.query('select * from reglas_movimiento where empresa_id = $1 order by prioridad, patron', [id]),
  ]);
  if (!emp.rows[0]) throw new ErrorDatos('La empresa no existe.', 404);
  return { empresa: emp.rows[0], cuentas: cuentas.rows, terceros: terceros.rows, reglas: reglas.rows };
}

// ---------- Cuentas bancarias ----------
export async function crearCuenta(empresaId, c) {
  const d = { banco: texto(c.banco).toUpperCase() || 'BANCOLOMBIA', tipo: texto(c.tipo).toUpperCase() || 'AHORROS', numero: texto(c.numero), cta_contable: texto(c.cta_contable) };
  if (!soloDigitos(d.numero)) throw new ErrorDatos('El número de cuenta va solo con números, tal como aparece en el extracto.');
  if (!soloDigitos(d.cta_contable)) throw new ErrorDatos('La cuenta contable va solo con números (ej. 11200501).');
  const { rows } = await pool.query(
    `insert into cuentas_bancarias (empresa_id, banco, tipo, numero, cta_contable) values ($1, $2, $3, $4, $5) returning *`,
    [empresaId, d.banco, d.tipo, d.numero, d.cta_contable]);
  return rows[0];
}
export async function borrarCuenta(id) {
  await pool.query('delete from cuentas_bancarias where id = $1', [id]);
}

// ---------- Terceros ----------
function validarTercero(t) {
  const d = { nombre: texto(t.nombre), nit: texto(t.nit), nit_alt: texto(t.nit_alt) || null };
  if (!d.nombre) throw new ErrorDatos('Escribe el nombre del tercero.');
  if (!soloDigitos(d.nit)) throw new ErrorDatos(`NIT inválido para "${d.nombre}": solo números, sin dígito de verificación.`);
  if (d.nit_alt && !soloDigitos(d.nit_alt)) throw new ErrorDatos(`NIT alterno inválido para "${d.nombre}".`);
  return d;
}
export async function crearTercero(empresaId, t) {
  const d = validarTercero(t);
  const { rows } = await pool.query(
    `insert into terceros (empresa_id, nombre, nit, nit_alt) values ($1, $2, $3, $4) returning id, nombre, nit, nit_alt`,
    [empresaId, d.nombre, d.nit, d.nit_alt]);
  return { ...rows[0], alias: [] };
}
export async function actualizarTercero(id, t) {
  const d = validarTercero(t);
  const { rows } = await pool.query(
    'update terceros set nombre = $2, nit = $3, nit_alt = $4 where id = $1 returning id, nombre, nit, nit_alt', [id, d.nombre, d.nit, d.nit_alt]);
  if (!rows[0]) throw new ErrorDatos('El tercero no existe.', 404);
  return rows[0];
}
export async function borrarTercero(id) {
  await pool.query('delete from terceros where id = $1', [id]);
}
// Importación masiva: si el NIT ya existe actualiza el nombre, si no lo crea
export async function importarTerceros(empresaId, filas) {
  const validas = []; const errores = [];
  filas.forEach((f, i) => {
    try { validas.push(validarTercero(f)); } catch (e) { errores.push(`Fila ${f.fila ?? i + 1}: ${e.message}`); }
  });
  const cliente = await pool.connect();
  let creados = 0; let actualizados = 0;
  try {
    await cliente.query('begin');
    for (const t of validas) {
      const { rows } = await cliente.query(
        `insert into terceros (empresa_id, nombre, nit, nit_alt) values ($1, $2, $3, $4)
         on conflict (empresa_id, nit) do update set nombre = excluded.nombre, nit_alt = coalesce(excluded.nit_alt, terceros.nit_alt)
         returning (xmax = 0) as nuevo`, [empresaId, t.nombre, t.nit, t.nit_alt]);
      if (rows[0].nuevo) creados++; else actualizados++;
    }
    await cliente.query('commit');
  } catch (e) {
    await cliente.query('rollback'); throw e;
  } finally { cliente.release(); }
  return { creados, actualizados, errores };
}

// ---------- Alias ----------
export async function crearAlias(terceroId, alias) {
  const a = texto(alias).toUpperCase();
  if (!a) throw new ErrorDatos('Escribe el nombre tal como lo pone el banco.');
  const { rows } = await pool.query(
    'insert into terceros_alias (tercero_id, alias) values ($1, $2) on conflict do nothing returning id, alias', [terceroId, a]);
  return rows[0] || null;
}
export async function borrarAlias(id) {
  await pool.query('delete from terceros_alias where id = $1', [id]);
}

// ---------- Reglas ----------
export async function crearRegla(empresaId, r) {
  const d = {
    patron: texto(r.patron).toUpperCase(), accion: r.accion === 'asignar' ? 'asignar' : 'excluir',
    nit: texto(r.nit) || null, cta_contable: texto(r.cta_contable) || null, nota: texto(r.nota) || null,
    prioridad: Number(r.prioridad) || 100,
  };
  if (!d.patron) throw new ErrorDatos('Escribe el inicio de la descripción del movimiento (ej. SOBRANTE TRANSACCION).');
  if (d.accion === 'asignar' && !d.nit && !d.cta_contable) throw new ErrorDatos('Una regla de asignar necesita al menos NIT o cuenta.');
  if ((d.nit && !soloDigitos(d.nit)) || (d.cta_contable && !soloDigitos(d.cta_contable))) throw new ErrorDatos('NIT y cuenta van solo con números.');
  const { rows } = await pool.query(
    `insert into reglas_movimiento (empresa_id, patron, accion, nit, cta_contable, nota, prioridad) values ($1, $2, $3, $4, $5, $6, $7) returning *`,
    [empresaId, d.patron, d.accion, d.nit, d.cta_contable, d.nota, d.prioridad]);
  return rows[0];
}
export async function borrarRegla(id) {
  await pool.query('delete from reglas_movimiento where id = $1', [id]);
}
