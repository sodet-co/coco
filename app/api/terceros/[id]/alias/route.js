import { crearAlias } from '@/lib/admin.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';
export const POST = manejar(async (req, { params }) => crearAlias((await params).id, (await req.json()).alias));
