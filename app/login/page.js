import FormEntrar from '@/components/FormEntrar.jsx';

export const metadata = { title: 'Entrar · coco' };

export default async function PaginaLogin({ searchParams }) {
  const { siguiente } = await searchParams;
  return (
    <main className="pagina acceso">
      <FormEntrar siguiente={typeof siguiente === 'string' ? siguiente : '/'} />
    </main>
  );
}
