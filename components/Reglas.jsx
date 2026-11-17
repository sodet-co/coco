'use client';
import { useState } from 'react';
import { api } from '@/lib/cliente.js';

const VACIA = { documento: 'RC', patron: '', accion: 'excluir', nit: '', cta_contable: '', nota: '', prioridad: 50 };
const APLICA_A = { RC: 'Abonos (RC)', CE: 'Cargos (CE)' };

export default function Reglas({ empresaId, reglas, recargar }) {
  const [nueva, setNueva] = useState(VACIA);
  const [error, setError] = useState('');

  async function agregar(ev) {
    ev.preventDefault();
    try {
      await api(`/api/empresas/${empresaId}/reglas`, { metodo: 'POST', cuerpo: nueva });
      setNueva({ ...VACIA, documento: nueva.documento }); setError(''); await recargar();
    } catch (e) { setError(e.message); }
  }
  async function borrar(r) {
    if (!confirm(`¿Borrar la regla "${r.patron}"?`)) return;
    try { await api(`/api/reglas/${r.id}`, { metodo: 'DELETE' }); await recargar(); } catch (e) { setError(e.message); }
  }

  return (
    <section className="bloque">
      <h2>Reglas especiales</h2>
      <p className="ayuda">Se aplican a los movimientos cuya descripción en el extracto empieza con el texto indicado, antes de buscar el tercero. Cada regla es para los abonos (recibos de caja) o para los cargos (comprobantes de egreso). Primero se evalúa la de menor prioridad.</p>
      <div className="tabla-envoltura">
        <table className="tarjetas">
          <thead><tr><th>Si la descripción empieza con</th><th>Aplica a</th><th>Entonces</th><th>NIT</th><th>Cuenta</th><th>Nota</th><th className="num">Prioridad</th><th></th></tr></thead>
          <tbody>
            {reglas.length === 0 && <tr><td colSpan={8} className="vacio">Sin reglas.</td></tr>}
            {reglas.map((r) => (
              <tr key={r.id}>
                <td className="desc">{r.patron}</td>
                <td data-label="Aplica a">{APLICA_A[r.documento]}</td>
                <td data-label="Entonces">{r.accion === 'excluir' ? `No va al ${r.documento}` : 'Asignar'}</td>
                <td data-label="NIT" className="fecha">{r.nit || ''}</td><td data-label="Cuenta" className="fecha">{r.cta_contable || ''}</td><td data-label="Nota">{r.nota || ''}</td>
                <td data-label="Prioridad" className="num">{r.prioridad}</td>
                <td className="derecha"><button type="button" className="enlace peligro" onClick={() => borrar(r)}>Borrar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="fila-form" onSubmit={agregar}>
        <label><span>Aplica a</span>
          <select value={nueva.documento} onChange={(e) => setNueva({ ...nueva, documento: e.target.value })}>
            <option value="RC">{APLICA_A.RC}</option><option value="CE">{APLICA_A.CE}</option>
          </select>
        </label>
        <label className="crece"><span>Si la descripción empieza con</span><input value={nueva.patron} placeholder={nueva.documento === 'CE' ? 'IMPTO GOBIERNO 4X1000' : 'SOBRANTE TRANSACCION'} onChange={(e) => setNueva({ ...nueva, patron: e.target.value })} /></label>
        <label><span>Entonces</span>
          <select value={nueva.accion} onChange={(e) => setNueva({ ...nueva, accion: e.target.value })}>
            <option value="excluir">No va al {nueva.documento}</option><option value="asignar">Asignar</option>
          </select>
        </label>
        {nueva.accion === 'asignar' && <>
          <label><span>NIT</span><input value={nueva.nit} inputMode="numeric" onChange={(e) => setNueva({ ...nueva, nit: e.target.value.replace(/\D/g, '') })} /></label>
          <label><span>Cuenta</span><input value={nueva.cta_contable} inputMode="numeric" onChange={(e) => setNueva({ ...nueva, cta_contable: e.target.value.replace(/\D/g, '') })} /></label>
          <label><span>Nota</span><input value={nueva.nota} onChange={(e) => setNueva({ ...nueva, nota: e.target.value })} /></label>
        </>}
        <label><span>Prioridad</span><input className="corto" value={nueva.prioridad} inputMode="numeric" onChange={(e) => setNueva({ ...nueva, prioridad: e.target.value.replace(/\D/g, '') })} /></label>
        <button type="submit">Agregar regla</button>
      </form>
      {error && <p className="txt-error">{error}</p>}
    </section>
  );
}
