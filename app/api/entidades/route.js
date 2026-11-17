import { listarEntidades, crearEntidad } from '@/lib/entidades.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = manejar(() => listarEntidades());
export const POST = manejar(async (req) => crearEntidad(await req.json()));
