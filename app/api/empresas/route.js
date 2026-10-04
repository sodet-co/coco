import { listarEmpresas } from '@/lib/datos.js';
import { todasLasEmpresas, crearEmpresa } from '@/lib/admin.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ?todas=1 incluye inactivas y conteos (pantalla de Empresas); sin parámetro, solo activas (pantalla de Recibos)
export const GET = manejar(async (req) => {
  const todas = new URL(req.url).searchParams.get('todas');
  return todas ? todasLasEmpresas() : listarEmpresas();
});

export const POST = manejar(async (req) => crearEmpresa(await req.json()));
