import Link from 'next/link';
import { HERRAMIENTAS } from '@/lib/herramientas.js';

// Dashboard: aquí se mostrará lo que registra la app móvil (coco-movil) cuando sus datos estén definidos
export default function Inicio() {
  return (
    <main className="pagina">
      <header className="cabecera">
        <h1>Inicio</h1>
        <p>El resumen de lo que se registra desde la app móvil y el acceso a las herramientas contables.</p>
      </header>

      <section className="bloque">
        <h2>Registros de la app móvil</h2>
        <div className="vacio">
          <p>Todavía no hay información para mostrar.</p>
          <p className="ayuda">Cuando la app móvil empiece a registrar datos, aquí verás los totales y los últimos registros.</p>
        </div>
      </section>

      <section className="bloque">
        <h2>Herramientas</h2>
        <div className="modulos">
          {HERRAMIENTAS.map((h) => (
            <Link key={h.ruta} href={h.ruta} className="modulo">
              <strong>{h.nombre}</strong>
              <span>{h.descripcion}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
