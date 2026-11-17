// Momento en que se compiló esta versión (npm run build); se muestra al pie de cada página
const actualizado = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date());

/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['pdfjs-dist', 'exceljs', 'pg'],
  env: { ACTUALIZADO: actualizado },
  // Las herramientas se movieron bajo /herramientas: los enlaces guardados siguen funcionando
  async redirects() {
    return [
      { source: '/empresas', destination: '/herramientas/empresas', permanent: true },
      { source: '/empresas/:id', destination: '/herramientas/empresas/:id', permanent: true },
    ];
  },
};
export default nextConfig;
