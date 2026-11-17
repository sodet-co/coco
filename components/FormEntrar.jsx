'use client';
import { useActionState } from 'react';
import { iniciarSesion } from '@/app/login/acciones.js';

export default function FormEntrar({ siguiente }) {
  const [estado, accion, enviando] = useActionState(iniciarSesion, null);
  return (
    <form action={accion} className="acceso-tarjeta">
      <h1>Entrar a coco</h1>
      <p className="ayuda">Usa el correo y la clave que te asignaron.</p>
      <input type="hidden" name="siguiente" value={siguiente} />
      <label>
        <span>Correo</span>
        <input type="email" name="email" autoComplete="username" required autoFocus defaultValue={estado?.email ?? ''} />
      </label>
      <label>
        <span>Clave</span>
        <input type="password" name="password" autoComplete="current-password" required />
      </label>
      {estado?.error && <p className="mensaje error" role="alert">{estado.error}</p>}
      <button type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
    </form>
  );
}
