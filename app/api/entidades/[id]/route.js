import { detalleEntidad, actualizarEntidad } from '@/lib/entidades.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const GET = manejar(async (_req, { params }) => detalleEntidad((await params).id));
export const PATCH = manejar(async (req, { params }) => actualizarEntidad((await params).id, await req.json()));
