import Link from 'next/link';
import { HERRAMIENTAS } from '@/lib/herramientas.js';

export const metadata = { title: 'Herramientas · coco' };

export default function Herramientas() {
  return (
    <main className="pagina">
      <header className="cabecera">
        <h1>Herramientas</h1>
        <p>Utilidades contables de coco.</p>
      </header>
      <div className="modulos">
        {HERRAMIENTAS.map((h) => (
          <Link key={h.ruta} href={h.ruta} className="modulo">
            <strong>{h.nombre}</strong>
            <span>{h.descripcion}</span>
          </Link>
        ))}
      </div>
    </main>
  );
}
