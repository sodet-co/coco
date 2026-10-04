'use client';
import { useState } from 'react';
import { api } from '@/lib/cliente.js';

const VACIA = { banco: 'BANCOLOMBIA', tipo: 'AHORROS', numero: '', cta_contable: '' };

export default function Cuentas({ empresaId, cuentas, recargar }) {
  const [nueva, setNueva] = useState(VACIA);
  const [error, setError] = useState('');

  async function agregar(ev) {
    ev.preventDefault();
    try {
      await api(`/api/empresas/${empresaId}/cuentas`, { metodo: 'POST', cuerpo: nueva });
      setNueva(VACIA); setError(''); await recargar();
    } catch (e) { setError(e.message); }
  }
  async function borrar(c) {
    if (!confirm(`¿Quitar la cuenta ${c.numero}? Sus extractos ya no se podrán leer.`)) return;
    try { await api(`/api/cuentas/${c.id}`, { metodo: 'DELETE' }); await recargar(); } catch (e) { setError(e.message); }
  }

  return (
    <section className="bloque">
      <h2>Cuentas bancarias</h2>
      <p className="ayuda">El sistema reconoce cada extracto por el número de cuenta impreso en el PDF. La cuenta contable es la que va en el débito del recibo.</p>
      <div className="tabla-envoltura">
        <table className="tarjetas">
          <thead><tr><th>Banco</th><th>Tipo</th><th>Número</th><th>Cuenta contable</th><th></th></tr></thead>
          <tbody>
            {cuentas.length === 0 && <tr><td colSpan={5} className="vacio">Sin cuentas. Agrega la primera abajo.</td></tr>}
            {cuentas.map((c) => (
              <tr key={c.id}>
                <td data-label="Banco">{c.banco}</td><td data-label="Tipo">{c.tipo}</td><td data-label="Número" className="fecha">{c.numero}</td><td data-label="Cuenta contable" className="fecha">{c.cta_contable}</td>
                <td className="derecha"><button type="button" className="enlace peligro" onClick={() => borrar(c)}>Quitar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form className="fila-form" onSubmit={agregar}>
        <label><span>Banco</span>
          <select value={nueva.banco} onChange={(e) => setNueva({ ...nueva, banco: e.target.value })}>
            <option value="BANCOLOMBIA">Bancolombia</option>
          </select>
        </label>
        <label><span>Tipo</span>
          <select value={nueva.tipo} onChange={(e) => setNueva({ ...nueva, tipo: e.target.value })}>
            <option value="AHORROS">Ahorros</option><option value="CORRIENTE">Corriente</option>
          </select>
        </label>
        <label><span>Número de cuenta</span><input value={nueva.numero} inputMode="numeric" onChange={(e) => setNueva({ ...nueva, numero: e.target.value.replace(/\D/g, '') })} /></label>
        <label><span>Cuenta contable</span><input value={nueva.cta_contable} inputMode="numeric" placeholder="11200501" onChange={(e) => setNueva({ ...nueva, cta_contable: e.target.value.replace(/\D/g, '') })} /></label>
        <button type="submit">Agregar cuenta</button>
      </form>
      {error && <p className="txt-error">{error}</p>}
    </section>
  );
}
