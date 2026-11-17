'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cerrarSesion } from '@/app/login/acciones.js';

export default function Navegacion() {
  const ruta = usePathname();
  const activo = (p) => (p === '/' ? ruta === '/' : ruta.startsWith(p));
  const enLogin = ruta === '/login';
  return (
    <nav className="nav">
      <div className="nav-interior">
        <Link href="/" className="marca"><img src="/coco-palabra.svg" alt="coco" width="86" height="26" /></Link>
        {!enLogin && (
          <>
            <Link href="/" className={activo('/') ? 'activo' : ''}>Inicio</Link>
            <Link href="/herramientas" className={activo('/herramientas') ? 'activo' : ''}>Herramientas</Link>
            <form action={cerrarSesion} className="salir">
              <button type="submit" className="secundario">Salir</button>
            </form>
          </>
        )}
      </div>
    </nav>
  );
}
