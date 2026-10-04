'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/cliente.js';
import { nombresDeHojas } from '@/lib/hojas.js';

const pesos = (n) => n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function contrapartida(nit, empresa) {
  const generico = String(nit) === String(empresa.nit_generico);
  return {
    cuenta: generico ? empresa.cta_por_identificar : empresa.cta_clientes,
    nota: generico ? empresa.nota_por_identificar : empresa.nota_identificado,
  };
}

// Las hojas del Excel salen en orden de periodo y, dentro del mismo mes, por número de cuenta
const ordenar = (lista) => [...lista].sort((a, b) =>
  a.extracto.anio - b.extracto.anio || a.extracto.mes - b.extracto.mes || a.cuenta.numero.localeCompare(b.cuenta.numero));

export default function Generador() {
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [archivos, setArchivos] = useState([]);
  const [vuelta, setVuelta] = useState(0); // cambia para vaciar el selector de archivos
  const [empresa, setEmpresa] = useState(null);
  const [extractos, setExtractos] = useState([]); // [{ clave, archivo, cuenta, extracto, filas }]
  const [fallidos, setFallidos] = useState([]); // [{ archivo, error }]
  const [terceros, setTerceros] = useState([]);
  const [consecutivo, setConsecutivo] = useState('');
  const [verExcluidos, setVerExcluidos] = useState(false);
  const [nuevo, setNuevo] = useState(null); // { clave, renglon, nombre, nit }
  const [estado, setEstado] = useState({ cargando: false, progreso: '', error: '', aviso: '' });

  useEffect(() => {
    fetch('/api/empresas').then((r) => r.json()).then((d) => {
      if (d.error) setEstado((e) => ({ ...e, error: d.error }));
      else if (!d.length) setEstado((e) => ({ ...e, error: 'No hay empresas activas. Créalas en la pestaña Empresas.' }));
      else { setEmpresas(d); if (d.length === 1) setEmpresaId(d[0].id); }
    });
  }, []);

  // Los extractos, terceros y consecutivo son de una sola empresa: al cambiarla se empieza de cero
  function elegirEmpresa(id) {
    setEmpresaId(id);
    setEmpresa(null); setExtractos([]); setFallidos([]); setTerceros([]); setConsecutivo(''); setNuevo(null);
    setArchivos([]); setVuelta((v) => v + 1);
    setEstado({ cargando: false, progreso: '', error: '', aviso: '' });
  }

  async function leerExtractos(ev) {
    ev.preventDefault();
    const leidos = []; const fallos = [];
    const claves = new Set(extractos.map((x) => x.clave));
    let ultima = null;
    for (const [i, archivo] of archivos.entries()) {
      setEstado({ cargando: true, progreso: `Leyendo ${i + 1} de ${archivos.length}…`, error: '', aviso: '' });
      try {
        const form = new FormData();
        form.append('empresaId', empresaId);
        form.append('archivo', archivo);
        const d = await api('/api/extracto', { metodo: 'POST', form });
        const clave = `${d.cuenta.numero}_${d.extracto.desde}_${d.extracto.hasta}`;
        if (claves.has(clave)) { fallos.push({ archivo: archivo.name, error: 'Ya está cargado un extracto de esa cuenta y ese periodo.' }); continue; }
        claves.add(clave);
        leidos.push({ clave, archivo: archivo.name, cuenta: d.cuenta, extracto: d.extracto, filas: d.propuestas.map((p) => ({ ...p, asignadoAMano: false })) });
        ultima = d;
      } catch (e) {
        fallos.push({ archivo: archivo.name, error: e.message });
      }
    }
    if (ultima) {
      setEmpresa(ultima.empresa);
      setTerceros(ultima.terceros);
      setConsecutivo((c) => c || String(ultima.consecutivoSugerido));
    }
    setExtractos((xs) => ordenar([...xs, ...leidos]));
    setFallidos(fallos);
    setArchivos([]); setVuelta((v) => v + 1);
    setEstado({ cargando: false, progreso: '', error: '', aviso: '' });
  }

  function quitar(x) {
    if (!confirm(`¿Quitar el extracto ${x.archivo}? Se pierden los cambios que hiciste en sus recibos.`)) return;
    setExtractos((xs) => xs.filter((y) => y.clave !== x.clave));
    if (nuevo?.clave === x.clave) setNuevo(null);
  }

  const cambiar = (clave, renglon, cambios) => setExtractos((xs) => xs.map((x) => (x.clave !== clave ? x
    : { ...x, filas: x.filas.map((f) => (f.renglon === renglon ? { ...f, ...cambios } : f)) })));

  const elegirTercero = (clave, renglon, nit) => cambiar(clave, renglon, { nit, ...contrapartida(nit, empresa), asignadoAMano: true });

  async function guardarTercero(ev) {
    ev.preventDefault();
    try {
      const t = await api(`/api/empresas/${empresaId}/terceros`, { metodo: 'POST', cuerpo: { nombre: nuevo.nombre, nit: nuevo.nit } });
      setTerceros((ts) => [...ts.filter((x) => x.nit !== t.nit), t].sort((a, b) => a.nombre.localeCompare(b.nombre)));
      elegirTercero(nuevo.clave, nuevo.renglon, t.nit);
      setNuevo(null);
      setEstado((e) => ({ ...e, error: '' }));
    } catch (e) {
      setEstado((s) => ({ ...s, error: e.message }));
    }
  }

  // Por extracto: recibos incluidos, hoja que le toca y rango de números de recibo
  const secciones = useMemo(() => {
    const conRecibos = extractos.filter((x) => x.filas.some((f) => f.incluir));
    const hojas = nombresDeHojas(conRecibos.map((x) => ({ anio: x.extracto.anio, mes: x.extracto.mes, numeroCuenta: x.cuenta.numero })));
    let siguiente = Number(consecutivo) || 0;
    return extractos.map((x) => {
      const incluidas = x.filas.filter((f) => f.incluir);
      const desde = siguiente;
      siguiente += incluidas.length;
      return {
        ...x, incluidas, desde, hasta: siguiente - 1,
        hoja: incluidas.length ? hojas[conRecibos.indexOf(x)] : null,
        total: incluidas.reduce((s, f) => s + f.valor, 0),
        sinIdentificar: incluidas.filter((f) => String(f.nit) === String(empresa?.nit_generico)).length,
      };
    });
  }, [extractos, consecutivo, empresa]);

  const conHoja = secciones.filter((s) => s.hoja);
  const totales = {
    recibos: secciones.reduce((s, x) => s + x.incluidas.length, 0),
    valor: secciones.reduce((s, x) => s + x.total, 0),
    sinIdentificar: secciones.reduce((s, x) => s + x.sinIdentificar, 0),
    excluidas: secciones.reduce((s, x) => s + x.filas.length - x.incluidas.length, 0),
  };

  async function descargar() {
    setEstado({ cargando: true, progreso: '', error: '', aviso: '' });
    try {
      const r = await fetch('/api/plantilla', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId, consecutivoInicial: Number(consecutivo),
          extractos: conHoja.map((s) => ({
            cuentaId: s.cuenta.id, anio: s.extracto.anio, mes: s.extracto.mes,
            recibos: s.incluidas.map(({ fecha, nit, nota, cuenta, valor, nombreBanco, asignadoAMano }) => ({ fecha, nit, nota, cuenta, valor, nombreBanco, asignadoAMano })),
          })),
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || `Error ${r.status}`);
      const nombre = r.headers.get('Content-Disposition').match(/filename="(.+)"/)[1];
      const url = URL.createObjectURL(await r.blob());
      Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
      URL.revokeObjectURL(url);
      const ultimo = Number(r.headers.get('X-Ultimo-Consecutivo'));
      setEstado({ cargando: false, progreso: '', error: '', aviso: `Descargaste ${nombre} con ${conHoja.length === 1 ? 'una hoja' : `${conHoja.length} hojas`}. Recibos ${empresa.prefijo_rc} ${consecutivo} a ${ultimo}; la próxima vez arranca en ${ultimo + 1}.` });
    } catch (e) {
      setEstado({ cargando: false, progreso: '', error: e.message, aviso: '' });
    }
  }

  return (
    <>
      <form className="carga" onSubmit={leerExtractos}>
        <label>
          <span>1. Empresa</span>
          <select value={empresaId} onChange={(e) => elegirEmpresa(e.target.value)} disabled={estado.cargando} required>
            <option value="">Elige una empresa</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
        <label>
          <span>2. Extractos en PDF (puedes elegir varios)</span>
          <input key={vuelta} type="file" accept="application/pdf" multiple disabled={!empresaId || estado.cargando}
            onChange={(e) => setArchivos([...e.target.files])} />
        </label>
        <button type="submit" disabled={estado.cargando || !empresaId || !archivos.length}>
          {estado.progreso || (archivos.length > 1 ? `Leer ${archivos.length} extractos` : extractos.length ? 'Agregar extracto' : 'Leer extracto')}
        </button>
      </form>

      {estado.error && <p className="mensaje error" role="alert">{estado.error}</p>}
      {fallidos.length > 0 && (
        <div className="mensaje error" role="alert">
          {fallidos.length === 1 ? 'Un archivo no se pudo cargar:' : `${fallidos.length} archivos no se pudieron cargar:`}
          <ul>{fallidos.map((f, i) => <li key={i}><strong>{f.archivo}</strong>: {f.error}</li>)}</ul>
        </div>
      )}
      {estado.aviso && <p className="mensaje ok" role="status">{estado.aviso}</p>}

      {secciones.map((s) => {
        const visibles = verExcluidos ? s.filas : s.incluidas;
        return (
          <section className="extracto" key={s.clave}>
            <header className="extracto-cab">
              <h2>{s.hoja || 'Sin recibos'}</h2>
              <span className="archivo">{s.archivo}</span>
              <button type="button" className="enlace peligro" onClick={() => quitar(s)}>Quitar</button>
            </header>

            <div className="resumen">
              <div><small>Cuenta</small><strong>{s.cuenta.banco} {s.cuenta.tipo.toLowerCase()} {s.cuenta.numero}</strong></div>
              <div><small>Periodo</small><strong>{s.extracto.desde} a {s.extracto.hasta}</strong></div>
              <div><small>Abonos del banco</small><strong>${pesos(s.extracto.resumen.totalAbonos)}</strong></div>
              <div><small>Van al RC</small><strong>{s.incluidas.length} por ${pesos(s.total)}</strong></div>
              {s.hoja && consecutivo && <div><small>Recibos {empresa.prefijo_rc}</small><strong>{s.desde} a {s.hasta}</strong></div>}
              <div className={s.sinIdentificar ? 'pendiente' : ''}><small>Sin identificar</small><strong>{s.sinIdentificar}</strong></div>
            </div>

            {s.extracto.errores.length > 0 && (
              <div className="mensaje error">
                El extracto no cuadra con su propio resumen; revisa antes de cargar:
                <ul>{s.extracto.errores.map((e) => <li key={e}>{e}</li>)}</ul>
              </div>
            )}

            <div className="tabla-envoltura">
              <table className="tarjetas tabla-rc">
                <thead>
                  <tr>
                    <th>Incluir</th><th>Fecha</th><th>Movimiento del banco</th><th className="num">Valor</th>
                    <th>Tercero</th><th>Cuenta</th><th>Nota</th>
                  </tr>
                </thead>
                <tbody>
                  {visibles.length === 0 && <tr className="entera"><td colSpan={7} className="vacio">Ningún abono de este extracto va al RC; no genera hoja.</td></tr>}
                  {visibles.map((f) => {
                    const sinTercero = f.incluir && String(f.nit) === String(empresa.nit_generico);
                    const creando = nuevo?.clave === s.clave && nuevo.renglon === f.renglon;
                    return (
                      <Fragment key={f.renglon}>
                        <tr className={!f.incluir ? 'excluida' : sinTercero ? 'sin-tercero' : ''}>
                          <td><input type="checkbox" checked={f.incluir} aria-label="Incluir en el RC"
                            onChange={(e) => cambiar(s.clave, f.renglon, e.target.checked && !f.nit
                              ? { incluir: true, nit: empresa.nit_generico, ...contrapartida(empresa.nit_generico, empresa) }
                              : { incluir: e.target.checked })} /></td>
                          <td className="fecha">{f.fecha}</td>
                          <td>
                            <div className="desc">{f.descripcion}{f.sucursal && <span className="suc"> · {f.sucursal}</span>}</div>
                            <div className="motivo">{f.asignadoAMano ? 'Asignado a mano' : f.motivo}</div>
                          </td>
                          <td className="num">${pesos(f.valor)}</td>
                          <td data-label="Tercero">
                            {f.incluir && (
                              <div className="tercero">
                                <select value={f.nit} onChange={(e) => elegirTercero(s.clave, f.renglon, e.target.value)}>
                                  <option value={empresa.nit_generico}>{empresa.nit_generico} · Por identificar</option>
                                  {f.origen === 'regla' && !terceros.some((t) => t.nit === f.nit) && f.nit !== empresa.nit_generico &&
                                    <option value={f.nit}>{f.nit} · Regla</option>}
                                  {terceros.map((t) => <option key={t.id} value={t.nit}>{t.nombre} · {t.nit}</option>)}
                                </select>
                                {sinTercero && !creando && (
                                  <button type="button" className="enlace" onClick={() => setNuevo({ clave: s.clave, renglon: f.renglon, nombre: f.nombreBanco || '', nit: '' })}>
                                    Crear tercero
                                  </button>
                                )}
                              </div>
                            )}
                          </td>
                          <td data-label="Cuenta">{f.incluir && <input className="cuenta" value={f.cuenta} inputMode="numeric" onChange={(e) => cambiar(s.clave, f.renglon, { cuenta: e.target.value.replace(/\D/g, '') })} />}</td>
                          <td data-label="Nota">{f.incluir && <input className="nota" value={f.nota} onChange={(e) => cambiar(s.clave, f.renglon, { nota: e.target.value })} />}</td>
                        </tr>
                        {creando && (
                          <tr className="entera">
                            <td colSpan={7}>
                              <form className="nuevo-tercero" onSubmit={guardarTercero}>
                                <label><span>Nombre</span><input value={nuevo.nombre} autoFocus onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required /></label>
                                <label><span>NIT sin dígito de verificación</span><input value={nuevo.nit} inputMode="numeric" onChange={(e) => setNuevo({ ...nuevo, nit: e.target.value.replace(/\D/g, '') })} required /></label>
                                <button type="submit">Crear tercero</button>
                                <button type="button" className="secundario" onClick={() => setNuevo(null)}>Cancelar</button>
                              </form>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      {secciones.length > 0 && (
        <div className="pie">
          <p className="total">
            {secciones.length === 1 ? 'Un extracto' : `${secciones.length} extractos`} · {totales.recibos} recibos por ${pesos(totales.valor)}
            {totales.sinIdentificar > 0 && <span className="pendiente-txt"> · {totales.sinIdentificar} sin identificar</span>}
          </p>
          {totales.excluidas > 0 && (
            <button type="button" className="secundario" onClick={() => setVerExcluidos(!verExcluidos)}>
              {verExcluidos ? 'Ocultar' : 'Mostrar'} {totales.excluidas} abonos que no van al RC
            </button>
          )}
          <label className="consecutivo">
            <span>Primer recibo {empresa.prefijo_rc}</span>
            <input value={consecutivo} inputMode="numeric" onChange={(e) => setConsecutivo(e.target.value.replace(/\D/g, ''))} />
          </label>
          <button type="button" onClick={descargar} disabled={estado.cargando || !totales.recibos || !consecutivo}>
            {conHoja.length > 1 ? `Descargar Excel con ${conHoja.length} hojas` : `Descargar ${conHoja[0]?.hoja || 'Excel'}.xlsx`}
          </button>
        </div>
      )}
    </>
  );
}
