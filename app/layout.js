import '@fontsource/outfit/400.css';
import '@fontsource/outfit/500.css';
import '@fontsource/outfit/600.css';
import './globals.css';
import Navegacion from '@/components/Navegacion.jsx';

export const metadata = { title: 'coco', description: 'Gestión de la empresa: registros de la app móvil y herramientas contables' };

export const viewport = { themeColor: '#12355b' };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Navegacion />
        {children}
        <footer className="actualizado">Última actualización: {process.env.ACTUALIZADO}</footer>
      </body>
    </html>
  );
}
