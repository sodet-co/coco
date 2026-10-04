import ListaEmpresas from '@/components/ListaEmpresas.jsx';

export default function Empresas() {
  return (
    <main className="pagina">
      <header className="cabecera">
        <h1>Empresas</h1>
        <p>Cada empresa necesita sus datos contables, al menos una cuenta bancaria y su lista de terceros para poder leer sus extractos.</p>
      </header>
      <ListaEmpresas />
    </main>
  );
}
