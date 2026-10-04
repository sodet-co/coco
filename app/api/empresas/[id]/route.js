import { detalleEmpresa, actualizarEmpresa } from '@/lib/admin.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';

export const GET = manejar(async (req, { params }) => detalleEmpresa((await params).id));
export const PUT = manejar(async (req, { params }) => actualizarEmpresa((await params).id, await req.json()));
