import { actualizarTercero, borrarTercero } from '@/lib/admin.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';
export const PUT = manejar(async (req, { params }) => actualizarTercero((await params).id, await req.json()));
export const DELETE = manejar(async (req, { params }) => borrarTercero((await params).id));
