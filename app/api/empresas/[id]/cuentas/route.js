import { crearCuenta } from '@/lib/admin.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';
export const POST = manejar(async (req, { params }) => crearCuenta((await params).id, await req.json()));
