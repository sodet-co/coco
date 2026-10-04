import Generador from '@/components/Generador.jsx';

export default function Inicio() {
  return (
    <main className="pagina">
      <header className="cabecera">
        <h1>Recibos de caja para WorldOffice</h1>
        <p>Elige la empresa, sube sus extractos del banco, revisa a quién corresponde cada abono y descarga un Excel con una hoja por extracto, listo para cargar.</p>
      </header>
      <Generador />
    </main>
  );
}
