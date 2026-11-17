import Link from 'next/link';
import { HERRAMIENTAS } from '@/lib/herramientas.js';
import { usuarioActual, esAdmin } from '@/lib/usuario.js';
import { resumenParaUsuario } from '@/lib/entidades.js';

export const dynamic = 'force-dynamic';

const pesos = (v) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(v);
const TIPO = { ingreso: 'Ingreso', gasto: 'Gasto', inventario: 'Inventario', activo: 'Activo' };
const mesActual = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'America/Bogota' });

// Inicio: lo que se registra desde la app móvil, solo de las empresas o personas asignadas al usuario
export default async function Inicio() {
  const usuario = await usuarioActual();
  const [admin, { entidades, ultimos }] = await Promise.all([esAdmin(usuario?.id), resumenParaUsuario(usuario?.id)]);

  return (
    <main className="pagina">
      <header className="cabecera">
        <h1>Inicio</h1>
        <p>Lo que se registra desde la app móvil en {mesActual.format(new Date())}.</p>
      </header>

      {entidades.length === 0 ? (
        <div className="vacio">
          <p>No tienes empresas ni personas asignadas.</p>
          <p className="ayuda">Pide a quien administra coco que te dé acceso{admin ? ' (en Herramientas → Empresas y personas)' : ''}.</p>
        </div>
      ) : (
        <div className="entidades-resumen">
          {entidades.map((e) => (
            <article key={e.id} className="entidad-resumen">
              <h3>{e.nombre}</h3>
              <dl>
                <dt>Ingresos del mes</dt><dd>{pesos(e.ingresos)}</dd>
                <dt>Gastos del mes</dt><dd>{pesos(e.gastos)}</dd>
                <dt>Resultado</dt><dd className={e.ingresos - e.gastos < 0 ? 'negativo' : ''}>{pesos(e.ingresos - e.gastos)}</dd>
                <dt>Registros del mes</dt><dd>{e.movimientos}</dd>
              </dl>
            </article>
          ))}
        </div>
      )}

      {entidades.length > 0 && (
        <section className="bloque">
          <h2>Últimos registros</h2>
          {ultimos.length === 0 ? (
            <div className="vacio"><p>Todavía no hay registros. Aparecerán aquí cuando se hagan desde la app móvil.</p></div>
          ) : (
            <div className="tabla-envoltura">
              <table className="tarjetas">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Categoría</th><th>A nombre de</th><th>Detalle</th><th className="num">Valor</th></tr></thead>
                <tbody>
                  {ultimos.map((m) => (
                    <tr key={m.id}>
                      <td className="fecha">{m.fecha}</td>
                      <td data-label="Tipo">{TIPO[m.tipo]}{m.sentido ? ` (${m.sentido})` : ''}</td>
                      <td data-label="Categoría" className="desc">{m.categoria}</td>
                      <td data-label="A nombre de">{m.entidad}</td>
                      <td data-label="Detalle">{m.descripcion}</td>
                      <td data-label="Valor" className="num">{pesos(m.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {admin && (
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
      )}
    </main>
  );
}
