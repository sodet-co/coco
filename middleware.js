// Todo coco (páginas y API) exige haber entrado con un usuario de InsForge, salvo /login.
// updateSession renueva el token de acceso con el de refresco cuando está por vencer; luego
// se verifica su firma contra las llaves públicas del proyecto (JWKS), no basta con que exista la cookie.
import { NextResponse } from 'next/server';
import { updateSession } from '@insforge/sdk/ssr/middleware';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const URL_INSFORGE = process.env.NEXT_PUBLIC_INSFORGE_URL;
const llaves = URL_INSFORGE ? createRemoteJWKSet(new URL('/.well-known/jwks.json', URL_INSFORGE)) : null;

async function usuarioValido(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, llaves, { algorithms: ['RS256'] });
    // Solo sesiones de usuarios: los tokens anónimos o de administración no sirven para entrar
    return payload.role === 'authenticated' && payload.sub ? payload : null;
  } catch {
    return null;
  }
}

export async function middleware(peticion) {
  if (!llaves || !process.env.NEXT_PUBLIC_INSFORGE_ANON_KEY) {
    return new Response('Falta configurar NEXT_PUBLIC_INSFORGE_URL y NEXT_PUBLIC_INSFORGE_ANON_KEY en las variables de entorno.', { status: 503 });
  }

  const { pathname, search } = peticion.nextUrl;
  // Primero una respuesta solo para recoger las cookies renovadas
  const conCookies = NextResponse.next();
  const { accessToken } = await updateSession({ requestCookies: peticion.cookies, responseCookies: conCookies.cookies });
  const usuario = await usuarioValido(accessToken);

  // El servidor sabe quién es el usuario por estos encabezados, que solo pone el middleware tras verificar
  // la firma (lib/usuario.js). Los que vengan del navegador se descartan.
  const encabezados = new Headers(peticion.headers);
  encabezados.delete('x-coco-usuario');
  encabezados.delete('x-coco-email');
  if (usuario) {
    encabezados.set('x-coco-usuario', usuario.sub);
    encabezados.set('x-coco-email', usuario.email ?? '');
  }
  const respuesta = NextResponse.next({ request: { headers: encabezados } });
  for (const cookie of conCookies.cookies.getAll()) respuesta.cookies.set(cookie);

  if (pathname === '/login') {
    return usuario ? NextResponse.redirect(new URL('/', peticion.url)) : respuesta;
  }
  if (usuario) return respuesta;

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: 'Tu sesión terminó. Vuelve a entrar con tu correo y tu clave.' }, { status: 401 });
  }
  const destino = new URL('/login', peticion.url);
  if (pathname !== '/') destino.searchParams.set('siguiente', pathname + search);
  return NextResponse.redirect(destino);
}

// Los archivos estáticos (incluidos el logo y el ícono que muestra /login) no pasan por aquí
export const config = { matcher: '/((?!_next/static|_next/image|icon.svg|coco-palabra.svg|favicon.ico).*)' };
