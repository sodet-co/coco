import { actualizarCategoria, borrarCategoria } from '@/lib/entidades.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';

export const PATCH = manejar(async (req, { params }) => actualizarCategoria((await params).id, await req.json()));
export const DELETE = manejar(async (_req, { params }) => borrarCategoria((await params).id));
