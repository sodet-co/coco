import Link from 'next/link';
import ListaEntidades from '@/components/ListaEntidades.jsx';

export const metadata = { title: 'Empresas y personas · coco' };

export default function Entidades() {
  return (
    <main className="pagina">
      <header className="cabecera">
        <Link href="/herramientas" className="volver">Herramientas</Link>
        <h1>Empresas y personas</h1>
        <p>Las de la app móvil: a nombre de quién se registran los ingresos, gastos, inventarios y activos, quién puede verlas y con qué categorías.</p>
      </header>
      <ListaEntidades />
    </main>
  );
}
