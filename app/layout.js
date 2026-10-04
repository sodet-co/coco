import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import './globals.css';
import Navegacion from '@/components/Navegacion.jsx';

export const metadata = { title: 'coco · Recibos de caja', description: 'Plantillas de carga para WorldOffice desde extractos bancarios' };

export const viewport = { themeColor: '#12355b' };

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <Navegacion />
        {children}
      </body>
    </html>
  );
}
