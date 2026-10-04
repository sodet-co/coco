import Generador from '@/components/Generador.jsx';

export default function Inicio() {
  return (
    <main className="pagina">
      <header className="cabecera">
        <h1>Recibos de caja para WorldOffice</h1>
        <p>Sube el extracto del banco, revisa a quién corresponde cada abono y descarga la plantilla lista para cargar.</p>
      </header>
      <Generador />
    </main>
  );
}
