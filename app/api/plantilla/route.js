import { pool } from '@/lib/db.js';
import { contextoEmpresa, aprenderAlias } from '@/lib/datos.js';
import { armarPlantilla } from '@/lib/plantilla.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';

// Cuerpo: { empresaId, consecutivoInicial, extractos: [{ cuentaId, anio, mes, recibos }] } → un Excel con una hoja por extracto
export const POST = manejar(async (req) => {
  const { empresaId, consecutivoInicial, extractos } = await req.json();
  const ctx = await contextoEmpresa(empresaId);
  if (!ctx) return Response.json({ error: 'La empresa no existe.' }, { status: 404 });

  const inicial = Number(consecutivoInicial);
  if (!Number.isInteger(inicial) || inicial < 1) return Response.json({ error: 'El consecutivo inicial debe ser un número entero.' }, { status: 400 });

  // Un extracto sin recibos incluidos no genera hoja
  const conRecibos = (Array.isArray(extractos) ? extractos : []).filter((e) => Array.isArray(e.recibos) && e.recibos.length > 0);
  if (conRecibos.length === 0) return Response.json({ error: 'No hay recibos incluidos para generar.' }, { status: 400 });

  const paraArmar = [];
  for (const e of conRecibos) {
    const cuentaBanco = ctx.cuentas.find((c) => c.id === e.cuentaId);
    if (!cuentaBanco) return Response.json({ error: 'Una de las cuentas bancarias ya no está registrada para esta empresa. Vuelve a leer los extractos.' }, { status: 404 });
    const anio = Number(e.anio); const mes = Number(e.mes);
    if (!Number.isInteger(anio) || !Number.isInteger(mes) || mes < 1 || mes > 12) return Response.json({ error: 'El periodo de uno de los extractos no es válido.' }, { status: 400 });
    const incompleto = e.recibos.find((r) => !r.fecha || !r.nit || !r.cuenta || !r.nota || !(r.valor > 0));
    if (incompleto) return Response.json({ error: `Al recibo del ${incompleto.fecha} (cuenta ${cuentaBanco.numero}) le falta tercero, cuenta o nota.` }, { status: 400 });
    paraArmar.push({ cuentaBanco, anio, mes, recibos: e.recibos });
  }

  const { buffer, hojas, ultimoConsecutivo } = await armarPlantilla({ empresa: ctx.empresa, extractos: paraArmar, consecutivoInicial: inicial });

  const cliente = await pool.connect();
  try {
    await cliente.query('begin');
    const aprendidos = paraArmar.flatMap((e) => e.recibos)
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

  const archivo = `${hojas.length === 1 ? hojas[0] : 'RC'}_${ctx.empresa.prefijo_rc}${inicial}-${ultimoConsecutivo}.xlsx`;
  return new Response(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${archivo}"`,
      'X-Ultimo-Consecutivo': String(ultimoConsecutivo),
    },
  });
});
