// Momento en que se compiló esta versión (npm run build); se muestra al pie de cada página
const actualizado = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date());

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfjs-dist', 'exceljs', 'pg'],
  env: { ACTUALIZADO: actualizado },
};
export default nextConfig;
