// Quién está usando coco: el middleware verifica la sesión y pasa el usuario en encabezados internos.
// Solo para el servidor (Server Components y rutas de la API).
import { headers } from 'next/headers';
import { pool } from './db.js';
import { ErrorDatos } from './admin.js';

export async function usuarioActual() {
  const h = await headers();
  const id = h.get('x-coco-usuario');
  return id ? { id, email: h.get('x-coco-email') || '' } : null;
}

export async function esAdmin(usuarioId) {
  if (!usuarioId) return false;
  const { rowCount } = await pool.query('select 1 from administradores where usuario_id = $1', [usuarioId]);
  return rowCount > 0;
}

// Las herramientas y la administración de entidades son solo para administradores
export async function exigirAdmin() {
  const usuario = await usuarioActual();
  if (!usuario) throw new ErrorDatos('Tu sesión terminó. Vuelve a entrar con tu correo y tu clave.', 401);
  if (!(await esAdmin(usuario.id))) throw new ErrorDatos('Esta sección es solo para administradores de coco. Pide acceso a quien lo administra.', 403);
  return usuario;
}
