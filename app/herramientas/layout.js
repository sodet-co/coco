import { usuarioActual, esAdmin } from '@/lib/usuario.js';

export const dynamic = 'force-dynamic';

// Todo /herramientas es solo para administradores; la API aplica la misma regla en lib/api.js
export default async function LayoutHerramientas({ children }) {
  const usuario = await usuarioActual();
  if (await esAdmin(usuario?.id)) return children;
  return (
    <main className="pagina">
      <header className="cabecera">
        <h1>Herramientas</h1>
        <p>Esta sección es solo para administradores de coco. Si necesitas entrar, pide acceso a quien lo administra.</p>
      </header>
    </main>
  );
}
