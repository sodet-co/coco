'use client';
import { useMemo, useState } from 'react';
import { api, limpiarNit } from '@/lib/cliente.js';

const letra = (i) => String.fromCharCode(65 + i);

// Elige la columna con más valores que parecen NIT y la de más texto como nombre
function adivinarColumnas(hoja) {
  const puntaje = Array.from({ length: hoja.columnas }, () => ({ nit: 0, texto: 0 }));
  for (const f of hoja.filas.slice(0, 50)) {
    f.valores.forEach((v, i) => {
      if (/^\d{6,12}(-\d)?$/.test(v.replace(/[.\s]/g, ''))) puntaje[i].nit++;
      else if (/[A-Za-zÁÉÍÓÚÑ]{3,}/.test(v)) puntaje[i].texto++;
    });
  }
  const mejor = (k, excluir) => puntaje.map((p, i) => [p[k], i]).filter(([, i]) => i !== excluir).sort((a, b) => b[0] - a[0])[0]?.[1] ?? 0;
  const nit = mejor('nit');
  return { nit, nombre: mejor('texto', nit), alt: -1 };
}

export default function ImportarTerceros({ empresaId, alTerminar }) {
  const [hojas, setHojas] = useState(null);
  const [hojaIdx, setHojaIdx] = useState(0);
  const [cols, setCols] = useState({ nombre: 0, nit: 1, alt: -1 });
  const [estado, setEstado] = useState({ trabajando: false, error: '', resultado: null });

  async function leer(ev) {
    const archivo = ev.target.files[0];
    if (!archivo) return;
    setEstado({ trabajando: true, error: '', resultado: null });
    try {
      const form = new FormData(); form.append('archivo', archivo);
      const d = await api(`/api/empresas/${empresaId}/terceros/importar`, { metodo: 'POST', form });
      if (!d.hojas.length) throw new Error('El archivo no tiene hojas con datos.');
      // Si hay una hoja que se llame como terceros/clientes, arranca en esa
      const idx = Math.max(0, d.hojas.findIndex((h) => /client|tercer/i.test(h.nombre)));
      setHojas(d.hojas); setHojaIdx(idx); setCols(adivinarColumnas(d.hojas[idx]));
      setEstado({ trabajando: false, error: '', resultado: null });
    } catch (e) { setEstado({ trabajando: false, error: e.message, resultado: null }); }
  }

  const hoja = hojas?.[hojaIdx];
  const filas = useMemo(() => {
    if (!hoja) return [];
    return hoja.filas
      .map((f) => ({ fila: f.n, nombre: (f.valores[cols.nombre] || '').trim(), nit: limpiarNit(f.valores[cols.nit]), nit_alt: cols.alt >= 0 ? limpiarNit(f.valores[cols.alt]) : '' }))
      .filter((f) => f.nombre && f.nit.length >= 5); // descarta encabezados y filas sin NIT
  }, [hoja, cols]);

  async function importar() {
    setEstado({ trabajando: true, error: '', resultado: null });
    try {
      const r = await api(`/api/empresas/${empresaId}/terceros/importar`, { metodo: 'POST', cuerpo: { filas } });
      setEstado({ trabajando: false, error: '', resultado: r });
      await alTerminar();
    } catch (e) { setEstado({ trabajando: false, error: e.message, resultado: null }); }
  }

  const selectorColumna = (k, opcional) => (
    <select value={cols[k]} onChange={(e) => setCols({ ...cols, [k]: Number(e.target.value) })}>
      {opcional && <option value={-1}>No usar</option>}
      {Array.from({ length: hoja.columnas }, (_, i) => (
        <option key={i} value={i}>Columna {letra(i)}{hoja.filas[0]?.valores[i] ? ` · ${hoja.filas[0].valores[i].slice(0, 25)}` : ''}</option>
      ))}
    </select>
  );

  return (
    <div className="importar">
      <label><span>Archivo de Excel (.xlsx) con el listado de terceros</span>
        <input type="file" accept=".xlsx" onChange={leer} />
      </label>
      {estado.trabajando && <p className="cargando">Procesando…</p>}

      {hoja && (
        <>
          <div className="fila-form">
            <label><span>Hoja</span>
              <select value={hojaIdx} onChange={(e) => { const i = Number(e.target.value); setHojaIdx(i); setCols(adivinarColumnas(hojas[i])); }}>
                {hojas.map((h, i) => <option key={h.nombre} value={i}>{h.nombre} ({h.filas.length} filas)</option>)}
              </select>
            </label>
            <label><span>Columna del nombre</span>{selectorColumna('nombre')}</label>
            <label><span>Columna del NIT</span>{selectorColumna('nit')}</label>
            <label><span>NIT alterno</span>{selectorColumna('alt', true)}</label>
          </div>
          <p className="ayuda">Se van a importar {filas.length} terceros. Las filas sin nombre o sin NIT válido se ignoran. Si un NIT ya existe, se actualiza su nombre.</p>
          <div className="tabla-envoltura vista-previa">
            <table>
              <thead><tr><th>Fila</th><th>Nombre</th><th>NIT</th><th>NIT alterno</th></tr></thead>
              <tbody>
                {filas.slice(0, 8).map((f) => <tr key={f.fila}><td className="fecha">{f.fila}</td><td>{f.nombre}</td><td className="fecha">{f.nit}</td><td className="fecha">{f.nit_alt}</td></tr>)}
                {filas.length > 8 && <tr><td colSpan={4} className="vacio">y {filas.length - 8} más</td></tr>}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={importar} disabled={estado.trabajando || !filas.length}>Importar {filas.length} terceros</button>
        </>
      )}
      {estado.error && <p className="txt-error">{estado.error}</p>}
      {estado.resultado && (
        <p className="txt-ok">
          Listo: {estado.resultado.creados} nuevos y {estado.resultado.actualizados} actualizados.
          {estado.resultado.errores.length > 0 && ` ${estado.resultado.errores.length} filas con error: ${estado.resultado.errores.slice(0, 3).join('; ')}`}
        </p>
      )}
    </div>
  );
}
