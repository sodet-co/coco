import { borrarCuenta } from '@/lib/admin.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';
export const DELETE = manejar(async (req, { params }) => borrarCuenta((await params).id));
