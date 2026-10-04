'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navegacion() {
  const ruta = usePathname();
  const activo = (p) => (p === '/' ? ruta === '/' : ruta.startsWith(p));
  return (
    <nav className="nav">
      <div className="nav-interior">
        <span className="marca">coco</span>
        <Link href="/" className={activo('/') ? 'activo' : ''}>Recibos de caja</Link>
        <Link href="/empresas" className={activo('/empresas') ? 'activo' : ''}>Empresas</Link>
      </div>
    </nav>
  );
}
