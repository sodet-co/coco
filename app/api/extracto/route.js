import { contextoEmpresa } from '@/lib/datos.js';
import { leerExtractoBancolombia, ErrorExtracto } from '@/lib/extracto/bancolombia.js';
import { proponerRecibos } from '@/lib/motor.js';
import { nombreHoja } from '@/lib/plantilla.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';

export const POST = manejar(async (req) => {
  const form = await req.formData();
  const empresaId = form.get('empresaId');
  const archivo = form.get('archivo');
  if (!empresaId || !archivo) return Response.json({ error: 'Elige la empresa y el PDF del extracto.' }, { status: 400 });

  const ctx = await contextoEmpresa(empresaId);
  if (!ctx) return Response.json({ error: 'La empresa no existe.' }, { status: 404 });

  let extracto;
  try {
    extracto = await leerExtractoBancolombia(Buffer.from(await archivo.arrayBuffer()), ctx.empresa.nit);
  } catch (e) {
    if (e instanceof ErrorExtracto) return Response.json({ error: e.message }, { status: 422 });
    throw e;
  }

  const cuenta = ctx.cuentas.find((c) => c.numero === extracto.numeroCuenta);
  if (!cuenta) {
    return Response.json({ error: `La cuenta ${extracto.numeroCuenta} del extracto no está registrada para ${ctx.empresa.nombre}. Agrégala en Empresas → Cuentas bancarias.` }, { status: 422 });
  }

  return Response.json({
    empresa: ctx.empresa,
    cuenta,
    terceros: ctx.terceros,
    extracto: { ...extracto, movimientos: undefined, cantidadMovimientos: extracto.movimientos.length },
    hoja: nombreHoja(extracto.anio, extracto.mes),
    propuestas: proponerRecibos(extracto.movimientos, ctx),
    consecutivoSugerido: ctx.empresa.ultimo_consecutivo_rc + 1,
  });
});
