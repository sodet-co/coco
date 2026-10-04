import { borrarAlias } from '@/lib/admin.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';
export const DELETE = manejar(async (req, { params }) => borrarAlias((await params).id));
