'use server';
// Entrar y salir corren en el servidor: así el token de refresco queda en una cookie httpOnly
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createAuthActions } from '@insforge/sdk/ssr';

// Por código HTTP: InsForge responde 401 (AUTH_UNAUTHORIZED) tanto si el correo no existe como si la clave está mal
const MENSAJES = {
  401: 'El correo o la clave no coinciden. Revísalos e intenta de nuevo.',
  403: 'Ese correo todavía no está verificado. Pide a quien administra coco que lo active.',
  429: 'Demasiados intentos. Espera un momento y vuelve a intentar.',
};

// Solo se vuelve a rutas internas: evita que ?siguiente= mande a otro sitio
const destinoSeguro = (v) => (typeof v === 'string' && v.startsWith('/') && !v.startsWith('//') && !v.startsWith('/\\') ? v : '/');

export async function iniciarSesion(_estado, form) {
  const email = String(form.get('email') ?? '').trim().toLowerCase();
  const password = String(form.get('password') ?? '');
  if (!email || !password) return { error: 'Escribe tu correo y tu clave.', email };

  const auth = createAuthActions({ cookies: await cookies() });
  const { data, error } = await auth.signInWithPassword({ email, password });
  if (error || !data?.user) {
    const mensaje = MENSAJES[error?.statusCode];
    if (mensaje) return { error: mensaje, email };
    return { error: `No se pudo entrar${error?.message ? `: ${error.message}` : ''}. Intenta de nuevo en un momento.`, email };
  }
  redirect(destinoSeguro(form.get('siguiente')));
}

export async function cerrarSesion() {
  const auth = createAuthActions({ cookies: await cookies() });
  await auth.signOut();
  redirect('/login');
}
