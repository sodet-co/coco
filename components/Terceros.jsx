'use client';
import { useMemo, useState } from 'react';
import ImportarTerceros from './ImportarTerceros.jsx';
import { api, limpiarNit } from '@/lib/cliente.js';

const VACIO = { nombre: '', nit: '', nit_alt: '' };

function FilaTercero({ t, recargar, setError }) {
  const [editando, setEditando] = useState(false);
  const [datos, setDatos] = useState({ nombre: t.nombre, nit: t.nit, nit_alt: t.nit_alt || '' });
  const [alias, setAlias] = useState('');

  async function guardar() {
    try { await api(`/api/terceros/${t.id}`, { metodo: 'PUT', cuerpo: datos }); setEditando(false); setError(''); await recargar(); }
    catch (e) { setError(e.message); }
  }
  async function borrar() {
    if (!confirm(`¿Borrar a ${t.nombre}? También se borran sus alias.`)) return;
    try { await api(`/api/terceros/${t.id}`, { metodo: 'DELETE' }); await recargar(); } catch (e) { setError(e.message); }
  }
  async function agregarAlias(ev) {
    ev.preventDefault();
    try { await api(`/api/terceros/${t.id}/alias`, { metodo: 'POST', cuerpo: { alias } }); setAlias(''); setError(''); await recargar(); }
    catch (e) { setError(e.message); }
  }
  async function quitarAlias(a) {
    try { await api(`/api/alias/${a.id}`, { metodo: 'DELETE' }); await recargar(); } catch (e) { setError(e.message); }
  }

  if (editando) {
    return (
      <tr className="editando">
        <td><input value={datos.nombre} onChange={(e) => setDatos({ ...datos, nombre: e.target.value })} /></td>
        <td><input className="medio" value={datos.nit} inputMode="numeric" onChange={(e) => setDatos({ ...datos, nit: limpiarNit(e.target.value) })} /></td>
        <td><input className="medio" value={datos.nit_alt} inputMode="numeric" onChange={(e) => setDatos({ ...datos, nit_alt: limpiarNit(e.target.value) })} /></td>
        <td></td>
        <td className="derecha nowrap">
          <button type="button" className="enlace" onClick={guardar}>Guardar</button>{' '}
          <button type="button" className="enlace" onClick={() => setEditando(false)}>Cancelar</button>
        </td>
      </tr>
    );
  }
  return (
    <tr>
      <td className="desc">{t.nombre}</td>
      <td className="fecha">{t.nit}</td>
      <td className="fecha">{t.nit_alt || ''}</td>
      <td>
        <div className="chips">
          {t.alias.map((a) => (
            <span key={a.id} className="chip">{a.alias}
              <button type="button" aria-label={`Quitar alias ${a.alias}`} onClick={() => quitarAlias(a)}>×</button>
            </span>
          ))}
          <form onSubmit={agregarAlias} className="alias-form">
            <input value={alias} placeholder="Agregar alias" onChange={(e) => setAlias(e.target.value)} />
          </form>
        </div>
      </td>
      <td className="derecha nowrap">
        <button type="button" className="enlace" onClick={() => setEditando(true)}>Editar</button>{' '}
        <button type="button" className="enlace peligro" onClick={borrar}>Borrar</button>
      </td>
    </tr>
  );
}

export default function Terceros({ empresaId, terceros, recargar }) {
  const [buscar, setBuscar] = useState('');
  const [nuevo, setNuevo] = useState(VACIO);
  const [importando, setImportando] = useState(false);
  const [error, setError] = useState('');

  const filtrados = useMemo(() => {
    const q = buscar.trim().toUpperCase();
    if (!q) return terceros;
    return terceros.filter((t) => t.nombre.toUpperCase().includes(q) || t.nit.includes(q) || t.alias.some((a) => a.alias.includes(q)));
  }, [buscar, terceros]);

  async function agregar(ev) {
    ev.preventDefault();
    try { await api(`/api/empresas/${empresaId}/terceros`, { metodo: 'POST', cuerpo: nuevo }); setNuevo(VACIO); setError(''); await recargar(); }
    catch (e) { setError(e.message); }
  }

  return (
    <section className="bloque">
      <h2>Terceros <span className="contador">{terceros.length}</span></h2>
      <p className="ayuda">Los clientes de esta empresa. El nombre se compara con lo que escribe el banco (que lo corta a unos 15 caracteres); los alias cubren las otras formas en que el banco lo escribe.</p>

      <div className="barra">
        <input className="buscar" value={buscar} placeholder="Buscar por nombre, NIT o alias" onChange={(e) => setBuscar(e.target.value)} />
        <button type="button" className={importando ? 'secundario' : ''} onClick={() => setImportando(!importando)}>
          {importando ? 'Cerrar importación' : 'Importar desde Excel'}
        </button>
      </div>

      {importando && <ImportarTerceros empresaId={empresaId} alTerminar={recargar} />}

      <form className="fila-form" onSubmit={agregar}>
        <label className="crece"><span>Nombre</span><input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} /></label>
        <label><span>NIT sin DV</span><input value={nuevo.nit} inputMode="numeric" onChange={(e) => setNuevo({ ...nuevo, nit: limpiarNit(e.target.value) })} /></label>
        <label><span>NIT alterno (opcional)</span><input value={nuevo.nit_alt} inputMode="numeric" onChange={(e) => setNuevo({ ...nuevo, nit_alt: limpiarNit(e.target.value) })} /></label>
        <button type="submit">Agregar tercero</button>
      </form>
      {error && <p className="txt-error">{error}</p>}

      <div className="tabla-envoltura">
        <table>
          <thead><tr><th>Nombre</th><th>NIT</th><th>NIT alterno</th><th>Alias del banco</th><th></th></tr></thead>
          <tbody>
            {filtrados.length === 0 && <tr><td colSpan={5} className="vacio">{terceros.length ? 'Ningún tercero coincide con la búsqueda.' : 'Sin terceros. Agrégalos a mano o impórtalos desde Excel.'}</td></tr>}
            {filtrados.map((t) => <FilaTercero key={t.id} t={t} recargar={recargar} setError={setError} />)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
