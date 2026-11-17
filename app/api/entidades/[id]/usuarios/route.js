import { darAcceso, quitarAcceso } from '@/lib/entidades.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';

// POST { email } da acceso; DELETE ?usuario=<id> lo quita
export const POST = manejar(async (req, { params }) => darAcceso((await params).id, (await req.json()).email));
export const DELETE = manejar(async (req, { params }) => quitarAcceso((await params).id, new URL(req.url).searchParams.get('usuario')));
