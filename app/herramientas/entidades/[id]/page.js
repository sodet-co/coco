import DetalleEntidad from '@/components/DetalleEntidad.jsx';

export default async function Entidad({ params }) {
  const { id } = await params;
  return (
    <main className="pagina">
      <DetalleEntidad id={id} />
    </main>
  );
}
