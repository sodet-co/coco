// Ayuda para llamar la API desde el navegador: devuelve el JSON o lanza el mensaje de error
export async function api(url, { metodo = 'GET', cuerpo, form } = {}) {
  const r = await fetch(url, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: form || (cuerpo ? JSON.stringify(cuerpo) : undefined),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.error || `Error ${r.status}`);
  return d;
}

// "900.033.859-1" -> "900033859"
export const limpiarNit = (v) => String(v ?? '').split('-')[0].replace(/\D/g, '');
