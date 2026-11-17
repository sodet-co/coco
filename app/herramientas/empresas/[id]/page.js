import DetalleEmpresa from '@/components/DetalleEmpresa.jsx';

export default async function Empresa({ params }) {
  const { id } = await params;
  return (
    <main className="pagina">
      <DetalleEmpresa id={id} />
    </main>
  );
}
