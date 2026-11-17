import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import './globals.css';
import Navegacion from '@/components/Navegacion.jsx';
import { usuarioActual, esAdmin } from '@/lib/usuario.js';

export const metadata = { title: 'coco', description: 'Gestión de la empresa: registros de la app móvil y herramientas contables' };

export const viewport = { themeColor: '#12355b' };

export default async function RootLayout({ children }) {
  const usuario = await usuarioActual();
  const admin = await esAdmin(usuario?.id);
  return (
    <html lang="es">
      <body>
        <Navegacion admin={admin} email={usuario?.email} />
        {children}
        <footer className="actualizado">Última actualización: {process.env.ACTUALIZADO}</footer>
      </body>
    </html>
  );
}
