// coco no tiene inicio de sesión propio: todo el sitio (páginas y API) pide usuario y clave
// con la autenticación básica del navegador. Se configuran con COCO_USUARIO y COCO_CLAVE.
// En producción, si faltan, el sitio queda cerrado; en desarrollo local queda abierto.

export function middleware(peticion) {
  const usuario = process.env.COCO_USUARIO;
  const clave = process.env.COCO_CLAVE;

  if (!usuario || !clave) {
    if (process.env.NODE_ENV !== 'production') return;
    return new Response('Falta configurar COCO_USUARIO y COCO_CLAVE en las variables de entorno del servidor.', { status: 503 });
  }

  const encabezado = peticion.headers.get('authorization') ?? '';
  if (encabezado.startsWith('Basic ')) {
    let credenciales = '';
    try { credenciales = atob(encabezado.slice(6)); } catch { /* encabezado mal formado: se vuelve a pedir */ }
    const separador = credenciales.indexOf(':');
    if (separador >= 0 && credenciales.slice(0, separador) === usuario && credenciales.slice(separador + 1) === clave) return;
  }

  return new Response('Escribe el usuario y la clave de coco para entrar.', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="coco", charset="UTF-8"' },
  });
}

export const config = { matcher: '/:path*' };
