import { crearCategoria } from '@/lib/entidades.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';

// { padre_id, nombre, cuenta_contable, naturaleza } o, para una principal, { tipo, nombre, ... }
export const POST = manejar(async (req, { params }) => crearCategoria((await params).id, await req.json()));
