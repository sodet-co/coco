// Envuelve los handlers para devolver errores entendibles en vez de un 500 mudo
import { ErrorDatos } from './admin.js';

export function manejar(fn) {
  return async (req, ctx) => {
    try {
      const resultado = await fn(req, ctx);
      return resultado instanceof Response ? resultado : Response.json(resultado ?? { ok: true });
    } catch (e) {
      if (e instanceof ErrorDatos) return Response.json({ error: e.message }, { status: e.status });
      if (e.code === '23505') return Response.json({ error: 'Ese registro ya existe (NIT, número de cuenta o alias repetido).' }, { status: 409 });
      if (e.code === '23503') return Response.json({ error: 'No se puede borrar porque otros datos dependen de este registro.' }, { status: 409 });
      if (['ECONNREFUSED', '28P01', '3D000'].includes(e.code)) return Response.json({ error: `No hay conexión con la base de datos (${e.code}). Revisa DATABASE_URL en .env.local.` }, { status: 500 });
      console.error(e);
      return Response.json({ error: `Error inesperado: ${e.message}` }, { status: 500 });
    }
  };
}
