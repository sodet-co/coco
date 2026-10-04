import { pool } from './db.js';

export async function listarEmpresas() {
  const { rows } = await pool.query(
    `select id, nombre, nit, prefijo_rc, ultimo_consecutivo_rc from empresas where activa order by nombre`);
  return rows;
}

export async function contextoEmpresa(empresaId) {
  const [emp, cuentas, terceros, reglas] = await Promise.all([
    pool.query('select * from empresas where id = $1', [empresaId]),
    pool.query('select id, banco, tipo, numero, cta_contable from cuentas_bancarias where empresa_id = $1', [empresaId]),
    pool.query(
      `select t.id, t.nombre, t.nit, t.nit_alt,
              coalesce(array_agg(a.alias) filter (where a.alias is not null), '{}') as alias
         from terceros t left join terceros_alias a on a.tercero_id = t.id
        where t.empresa_id = $1
        group by t.id order by t.nombre`, [empresaId]),
    pool.query('select patron, accion, nit, cta_contable, nota, prioridad from reglas_movimiento where empresa_id = $1', [empresaId]),
  ]);
  if (!emp.rows[0]) return null;
  return { empresa: emp.rows[0], cuentas: cuentas.rows, terceros: terceros.rows, reglas: reglas.rows };
}

// Guarda los nombres que el banco usó para un tercero asignado a mano, para reconocerlo el próximo mes
export async function aprenderAlias(cliente, empresaId, pares) {
  for (const { nit, alias } of pares) {
    await cliente.query(
      `insert into terceros_alias (tercero_id, alias)
       select id, $3 from terceros where empresa_id = $1 and nit = $2
       on conflict do nothing`, [empresaId, nit, alias]);
  }
}
