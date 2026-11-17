'use client';
import { useState } from 'react';
import { api } from '@/lib/cliente.js';

const TIPOS = [
  { tipo: 'ingreso', nombre: 'Ingresos' },
  { tipo: 'gasto', nombre: 'Gastos' },
  { tipo: 'inventario', nombre: 'Inventarios' },
  { tipo: 'activo', nombre: 'Activos' },
];
const NATURALEZA = { debito: 'Débito', credito: 'Crédito' };
// Lo que toma un movimiento si ninguna categoría de la rama define naturaleza
const NATURALEZA_POR_TIPO = { ingreso: 'credito', gasto: 'debito', inventario: 'debito', activo: 'debito' };

// Cuenta y naturaleza que de verdad aplican: las propias o las de la categoría de arriba más cercana
function heredado(cat, porId, campo) {
  for (let c = porId.get(cat.padre_id); c; c = porId.get(c.padre_id)) if (c[campo]) return c[campo];
  return campo === 'naturaleza' ? NATURALEZA_POR_TIPO[cat.tipo] : null;
}

export default function ArbolCategorias({ entidadId, categorias, hacer }) {
  const porId = new Map(categorias.map((c) => [c.id, c]));
  const hijos = new Map();
  for (const c of categorias) hijos.set(c.padre_id, [...(hijos.get(c.padre_id) ?? []), c]);
  const [nuevaPrincipal, setNuevaPrincipal] = useState(false);

  async function crearPrincipal(ev) {
    ev.preventDefault();
    const ok = await hacer(() => api(`/api/entidades/${entidadId}/categorias`, { metodo: 'POST', cuerpo: Object.fromEntries(new FormData(ev.currentTarget)) }), 'Categoría creada.');
    if (ok) setNuevaPrincipal(false);
  }

  return (
    <div className="arbol">
      {TIPOS.map(({ tipo, nombre }) => {
        const raices = (hijos.get(null) ?? []).filter((c) => c.tipo === tipo);
        if (!raices.length) return null;
        return (
          <div key={tipo} className="arbol-tipo">
            <span className="arbol-tipo-nombre">{nombre}</span>
            <ul>{raices.map((c) => <Nodo key={c.id} cat={c} {...{ porId, hijos, entidadId, hacer }} />)}</ul>
          </div>
        );
      })}
      <div className="barra">
        <button type="button" className="secundario" onClick={() => setNuevaPrincipal(!nuevaPrincipal)}>
          {nuevaPrincipal ? 'Cancelar' : 'Nueva categoría principal'}
        </button>
      </div>
      {nuevaPrincipal && (
        <form className="fila-form" onSubmit={crearPrincipal}>
          <label><span>Tipo</span>
            <select name="tipo">{TIPOS.map((t) => <option key={t.tipo} value={t.tipo}>{t.nombre}</option>)}</select>
          </label>
          <label><span>Nombre</span><input name="nombre" required /></label>
          <button type="submit">Crear</button>
        </form>
      )}
    </div>
  );
}

function Nodo({ cat, porId, hijos, entidadId, hacer }) {
  const [modo, setModo] = useState(null); // 'editar' | 'agregar'
  const propios = hijos.get(cat.id) ?? [];
  const cuentaHeredada = heredado(cat, porId, 'cuenta_contable');
  const naturalezaHeredada = heredado(cat, porId, 'naturaleza');
  const cuenta = cat.cuenta_contable ?? cuentaHeredada;
  const naturaleza = cat.naturaleza ?? naturalezaHeredada;

  async function guardar(ev) {
    ev.preventDefault();
    const ok = await hacer(() => api(`/api/categorias/${cat.id}`, { metodo: 'PATCH', cuerpo: Object.fromEntries(new FormData(ev.currentTarget)) }), 'Categoría guardada.');
    if (ok) setModo(null);
  }

  async function agregar(ev) {
    ev.preventDefault();
    const datos = { ...Object.fromEntries(new FormData(ev.currentTarget)), padre_id: cat.id };
    const ok = await hacer(() => api(`/api/entidades/${entidadId}/categorias`, { metodo: 'POST', cuerpo: datos }), 'Subcategoría creada.');
    if (ok) setModo(null);
  }

  function borrar() {
    const aviso = propios.length ? ` También se borran sus ${propios.length} subcategorías.` : '';
    if (confirm(`¿Borrar "${cat.nombre}"?${aviso} Los movimientos ya registrados la conservan.`)) {
      hacer(() => api(`/api/categorias/${cat.id}`, { metodo: 'DELETE' }), 'Categoría borrada.');
    }
  }

  return (
    <li>
      <div className="nodo">
        <span className="nodo-nombre">{cat.nombre}</span>
        <span className={`nodo-dato ${cat.cuenta_contable ? '' : 'heredado'}`} title={cat.cuenta_contable ? 'Cuenta propia' : 'Heredada'}>
          {cuenta ? `Cta ${cuenta}` : 'Sin cuenta'}
        </span>
        <span className={`nodo-dato ${cat.naturaleza ? '' : 'heredado'}`} title={cat.naturaleza ? 'Naturaleza propia' : 'Heredada'}>
          {NATURALEZA[naturaleza]}
        </span>
        {cat.num_movimientos > 0 && <span className="nodo-dato">{cat.num_movimientos} mov.</span>}
        <span className="nodo-acciones">
          <button type="button" className="enlace" onClick={() => setModo(modo === 'editar' ? null : 'editar')}>Editar</button>
          <button type="button" className="enlace" onClick={() => setModo(modo === 'agregar' ? null : 'agregar')}>+ Subcategoría</button>
          <button type="button" className="enlace peligro" onClick={borrar}>Borrar</button>
        </span>
      </div>

      {modo === 'editar' && (
        <form className="fila-form" onSubmit={guardar}>
          <label><span>Nombre</span><input name="nombre" defaultValue={cat.nombre} required /></label>
          <label><span>Cuenta contable</span>
            <input name="cuenta_contable" defaultValue={cat.cuenta_contable ?? ''} inputMode="numeric" placeholder={cuentaHeredada ?? ''} className="cuenta" />
          </label>
          <label><span>Naturaleza</span>
            <select name="naturaleza" defaultValue={cat.naturaleza ?? ''}>
              <option value="">Heredada ({NATURALEZA[naturalezaHeredada]})</option>
              <option value="debito">Débito</option>
              <option value="credito">Crédito</option>
            </select>
          </label>
          <button type="submit">Guardar</button>
        </form>
      )}
      {modo === 'agregar' && (
        <form className="fila-form" onSubmit={agregar}>
          <label><span>Subcategoría de {cat.nombre}</span><input name="nombre" required autoFocus /></label>
          <label><span>Cuenta contable (opcional)</span><input name="cuenta_contable" inputMode="numeric" placeholder={cuenta ?? ''} className="cuenta" /></label>
          <button type="submit">Agregar</button>
        </form>
      )}

      {propios.length > 0 && <ul>{propios.map((h) => <Nodo key={h.id} cat={h} {...{ porId, hijos, entidadId, hacer }} />)}</ul>}
    </li>
  );
}
