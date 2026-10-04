import { pool } from '@/lib/db.js';
import { contextoEmpresa, aprenderAlias } from '@/lib/datos.js';
import { armarPlantilla } from '@/lib/plantilla.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';

export const POST = manejar(async (req) => {
  const { empresaId, cuentaId, anio, mes, consecutivoInicial, recibos } = await req.json();
  const ctx = await contextoEmpresa(empresaId);
  const cuentaBanco = ctx?.cuentas.find((c) => c.id === cuentaId);
  if (!ctx || !cuentaBanco) return Response.json({ error: 'Empresa o cuenta bancaria no encontrada.' }, { status: 404 });

  const inicial = Number(consecutivoInicial);
  if (!Number.isInteger(inicial) || inicial < 1) return Response.json({ error: 'El consecutivo inicial debe ser un número entero.' }, { status: 400 });
  if (!Array.isArray(recibos) || recibos.length === 0) return Response.json({ error: 'No hay recibos incluidos para generar.' }, { status: 400 });
  const incompleto = recibos.find((r) => !r.fecha || !r.nit || !r.cuenta || !r.nota || !(r.valor > 0));
  if (incompleto) return Response.json({ error: `Al recibo del ${incompleto.fecha} le falta tercero, cuenta o nota.` }, { status: 400 });

  const { buffer, hoja, ultimoConsecutivo } = await armarPlantilla({
    empresa: ctx.empresa, cuentaBanco, recibos, consecutivoInicial: inicial, anio, mes,
  });

  const cliente = await pool.connect();
  try {
    await cliente.query('begin');
    const aprendidos = recibos
      .filter((r) => r.asignadoAMano && r.nombreBanco && String(r.nit) !== String(ctx.empresa.nit_generico))
      .map((r) => ({ nit: String(r.nit), alias: r.nombreBanco }));
    await aprenderAlias(cliente, empresaId, aprendidos);
    // greatest: si se vuelve a generar el mismo mes, el consecutivo no se dispara
    await cliente.query('update empresas set ultimo_consecutivo_rc = greatest(ultimo_consecutivo_rc, $2) where id = $1', [empresaId, ultimoConsecutivo]);
    await cliente.query('commit');
  } catch (e) {
    await cliente.query('rollback');
    throw e;
  } finally {
    cliente.release();
  }

  const archivo = `${hoja}_${ctx.empresa.prefijo_rc}${inicial}-${ultimoConsecutivo}.xlsx`;
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${archivo}"`,
      'X-Ultimo-Consecutivo': String(ultimoConsecutivo),
    },
  });
});
