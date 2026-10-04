'use client';
import { useEffect, useMemo, useState } from 'react';

const pesos = (n) => n.toLocaleString('es-CO', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

function contrapartida(nit, empresa) {
  const generico = String(nit) === String(empresa.nit_generico);
  return {
    cuenta: generico ? empresa.cta_por_identificar : empresa.cta_clientes,
    nota: generico ? empresa.nota_por_identificar : empresa.nota_identificado,
  };
}

export default function Generador() {
  const [empresas, setEmpresas] = useState([]);
  const [empresaId, setEmpresaId] = useState('');
  const [archivo, setArchivo] = useState(null);
  const [datos, setDatos] = useState(null);
  const [filas, setFilas] = useState([]);
  const [terceros, setTerceros] = useState([]);
  const [consecutivo, setConsecutivo] = useState('');
  const [verExcluidos, setVerExcluidos] = useState(false);
  const [nuevo, setNuevo] = useState(null); // { nombre, nit, renglon }
  const [estado, setEstado] = useState({ cargando: false, error: '', aviso: '' });

  useEffect(() => {
    fetch('/api/empresas').then((r) => r.json()).then((d) => {
      if (d.error) setEstado((e) => ({ ...e, error: d.error }));
      else if (!d.length) setEstado((e) => ({ ...e, error: 'No hay empresas activas. Créalas en la pestaña Empresas.' }));
      else { setEmpresas(d); if (d.length === 1) setEmpresaId(d[0].id); }
    });
  }, []);

  async function leerExtracto(ev) {
    ev.preventDefault();
    setEstado({ cargando: true, error: '', aviso: '' });
    setDatos(null);
    const form = new FormData();
    form.append('empresaId', empresaId);
    form.append('archivo', archivo);
    const r = await fetch('/api/extracto', { method: 'POST', body: form });
    const d = await r.json();
    if (!r.ok) return setEstado({ cargando: false, error: d.error, aviso: '' });
    setDatos(d);
    setTerceros(d.terceros);
    setFilas(d.propuestas.map((p) => ({ ...p, asignadoAMano: false })));
    setConsecutivo(String(d.consecutivoSugerido));
    setEstado({ cargando: false, error: '', aviso: '' });
  }

  const cambiar = (renglon, cambios) => setFilas((fs) => fs.map((f) => (f.renglon === renglon ? { ...f, ...cambios } : f)));

  function elegirTercero(fila, nit) {
    cambiar(fila.renglon, { nit, ...contrapartida(nit, datos.empresa), asignadoAMano: true });
  }

  async function guardarTercero(ev) {
    ev.preventDefault();
    const r = await fetch(`/api/empresas/${empresaId}/terceros`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nuevo.nombre, nit: nuevo.nit }),
    });
    const t = await r.json();
    if (!r.ok) return setEstado((e) => ({ ...e, error: t.error }));
    setTerceros((ts) => [...ts.filter((x) => x.nit !== t.nit), t].sort((a, b) => a.nombre.localeCompare(b.nombre)));
    const fila = filas.find((f) => f.renglon === nuevo.renglon);
    if (fila) elegirTercero(fila, t.nit);
    setNuevo(null);
    setEstado((e) => ({ ...e, error: '' }));
  }

  const incluidas = filas.filter((f) => f.incluir);
  const resumen = useMemo(() => {
    const total = incluidas.reduce((s, f) => s + f.valor, 0);
    const sinIdentificar = incluidas.filter((f) => datos && String(f.nit) === String(datos.empresa.nit_generico)).length;
    return { total, sinIdentificar };
  }, [incluidas, datos]);

  async function descargar() {
    setEstado({ cargando: true, error: '', aviso: '' });
    const r = await fetch('/api/plantilla', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        empresaId, cuentaId: datos.cuenta.id, anio: datos.extracto.anio, mes: datos.extracto.mes,
        consecutivoInicial: Number(consecutivo),
        recibos: incluidas.map(({ fecha, nit, nota, cuenta, valor, nombreBanco, asignadoAMano }) => ({ fecha, nit, nota, cuenta, valor, nombreBanco, asignadoAMano })),
      }),
    });
    if (!r.ok) return setEstado({ cargando: false, error: (await r.json()).error, aviso: '' });
    const nombre = r.headers.get('Content-Disposition').match(/filename="(.+)"/)[1];
    const url = URL.createObjectURL(await r.blob());
    Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
    URL.revokeObjectURL(url);
    const ultimo = Number(r.headers.get('X-Ultimo-Consecutivo'));
    setEstado({ cargando: false, error: '', aviso: `Descargaste ${nombre}. Recibos ${datos.empresa.prefijo_rc} ${consecutivo} a ${ultimo}; el próximo mes arranca en ${ultimo + 1}.` });
  }

  const visibles = verExcluidos ? filas : incluidas;
  const excluidas = filas.length - incluidas.length;

  return (
    <>
      <form className="carga" onSubmit={leerExtracto}>
        <label>
          <span>Empresa</span>
          <select value={empresaId} onChange={(e) => setEmpresaId(e.target.value)} required>
            <option value="">Elige una empresa</option>
            {empresas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
          </select>
        </label>
        <label>
          <span>Extracto en PDF</span>
          <input type="file" accept="application/pdf" onChange={(e) => setArchivo(e.target.files[0] || null)} required />
        </label>
        <button type="submit" disabled={estado.cargando || !empresaId || !archivo}>
          {estado.cargando && !datos ? 'Leyendo…' : 'Leer extracto'}
        </button>
      </form>

      {estado.error && <p className="mensaje error" role="alert">{estado.error}</p>}
      {estado.aviso && <p className="mensaje ok" role="status">{estado.aviso}</p>}

      {datos && (
        <section className="revision">
          <div className="resumen">
            <div><small>Cuenta</small><strong>{datos.cuenta.banco} {datos.cuenta.tipo.toLowerCase()} {datos.cuenta.numero}</strong></div>
            <div><small>Periodo</small><strong>{datos.extracto.desde} a {datos.extracto.hasta}</strong></div>
            <div><small>Abonos del banco</small><strong>${pesos(datos.extracto.resumen.totalAbonos)}</strong></div>
            <div><small>Van al RC</small><strong>{incluidas.length} por ${pesos(resumen.total)}</strong></div>
            <div className={resumen.sinIdentificar ? 'pendiente' : ''}><small>Sin identificar</small><strong>{resumen.sinIdentificar}</strong></div>
          </div>

          {datos.extracto.errores.length > 0 && (
            <div className="mensaje error">
              El extracto no cuadra con su propio resumen; revisa antes de cargar:
              <ul>{datos.extracto.errores.map((e) => <li key={e}>{e}</li>)}</ul>
            </div>
          )}

          {nuevo && (
            <form className="nuevo-tercero" onSubmit={guardarTercero}>
              <label><span>Nombre</span><input value={nuevo.nombre} onChange={(e) => setNuevo({ ...nuevo, nombre: e.target.value })} required /></label>
              <label><span>NIT sin dígito de verificación</span><input value={nuevo.nit} inputMode="numeric" onChange={(e) => setNuevo({ ...nuevo, nit: e.target.value.replace(/\D/g, '') })} required /></label>
              <button type="submit">Crear tercero</button>
              <button type="button" className="secundario" onClick={() => setNuevo(null)}>Cancelar</button>
            </form>
          )}

          <div className="tabla-envoltura">
            <table>
              <thead>
                <tr>
                  <th>Incluir</th><th>Fecha</th><th>Movimiento del banco</th><th className="num">Valor</th>
                  <th>Tercero</th><th>Cuenta</th><th>Nota</th>
                </tr>
              </thead>
              <tbody>
                {visibles.map((f) => {
                  const sinTercero = f.incluir && String(f.nit) === String(datos.empresa.nit_generico);
                  return (
                    <tr key={f.renglon} className={!f.incluir ? 'excluida' : sinTercero ? 'sin-tercero' : ''}>
                      <td><input type="checkbox" checked={f.incluir} aria-label="Incluir en el RC"
                        onChange={(e) => cambiar(f.renglon, e.target.checked && !f.nit
                          ? { incluir: true, nit: datos.empresa.nit_generico, ...contrapartida(datos.empresa.nit_generico, datos.empresa) }
                          : { incluir: e.target.checked })} /></td>
                      <td className="fecha">{f.fecha}</td>
                      <td>
                        <div className="desc">{f.descripcion}{f.sucursal && <span className="suc"> · {f.sucursal}</span>}</div>
                        <div className="motivo">{f.asignadoAMano ? 'Asignado a mano' : f.motivo}</div>
                      </td>
                      <td className="num">${pesos(f.valor)}</td>
                      <td>
                        {f.incluir && (
                          <div className="tercero">
                            <select value={f.nit} onChange={(e) => elegirTercero(f, e.target.value)}>
                              <option value={datos.empresa.nit_generico}>{datos.empresa.nit_generico} · Por identificar</option>
                              {f.origen === 'regla' && !terceros.some((t) => t.nit === f.nit) && f.nit !== datos.empresa.nit_generico &&
                                <option value={f.nit}>{f.nit} · Regla</option>}
                              {terceros.map((t) => <option key={t.id} value={t.nit}>{t.nombre} · {t.nit}</option>)}
                            </select>
                            {sinTercero && (
                              <button type="button" className="enlace" onClick={() => setNuevo({ nombre: f.nombreBanco || '', nit: '', renglon: f.renglon })}>
                                Crear tercero
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td>{f.incluir && <input className="cuenta" value={f.cuenta} onChange={(e) => cambiar(f.renglon, { cuenta: e.target.value.replace(/\D/g, '') })} />}</td>
                      <td>{f.incluir && <input className="nota" value={f.nota} onChange={(e) => cambiar(f.renglon, { nota: e.target.value })} />}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="pie">
            {excluidas > 0 && (
              <button type="button" className="secundario" onClick={() => setVerExcluidos(!verExcluidos)}>
                {verExcluidos ? 'Ocultar' : 'Mostrar'} {excluidas} abonos que no van al RC
              </button>
            )}
            <label className="consecutivo">
              <span>Primer recibo {datos.empresa.prefijo_rc}</span>
              <input value={consecutivo} inputMode="numeric" onChange={(e) => setConsecutivo(e.target.value.replace(/\D/g, ''))} />
            </label>
            <button type="button" onClick={descargar} disabled={estado.cargando || !incluidas.length || !consecutivo}>
              Descargar {datos.hoja}.xlsx
            </button>
          </div>
        </section>
      )}
    </>
  );
}
