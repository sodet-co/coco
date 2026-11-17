import Link from 'next/link';
import Generador from '@/components/Generador.jsx';

export default function RecibosEgresos() {
  return (
    <main className="pagina">
      <header className="cabecera">
        <Link href="/herramientas" className="volver">Herramientas</Link>
        <h1>Recibos de caja y egresos para WorldOffice</h1>
        <p>Elige la empresa, sube sus extractos del banco y revisa a quién corresponde cada abono y cada cargo. Descargas por separado el Excel de recibos de caja y el de comprobantes de egreso, cada uno con una hoja por extracto, listos para cargar.</p>
      </header>
      <Generador />
    </main>
  );
}
