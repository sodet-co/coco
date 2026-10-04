import pg from 'pg';

const globalParaPool = globalThis;
export const pool = globalParaPool.__poolCoco ??= new pg.Pool({ connectionString: process.env.DATABASE_URL });
