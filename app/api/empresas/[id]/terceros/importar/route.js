import ExcelJS from 'exceljs';
import { importarTerceros } from '@/lib/admin.js';
import { manejar } from '@/lib/api.js';

export const runtime = 'nodejs';

const comoTexto = (v) => {
  if (v == null) return '';
  if (typeof v === 'object') {
    if ('result' in v) return comoTexto(v.result);
    if ('richText' in v) return v.richText.map((r) => r.text).join('');
    if ('text' in v) return String(v.text);
    if (v instanceof Date) return v.toISOString().slice(0, 10);
  }
  return String(v).trim();
};

// Con archivo (multipart): devuelve las hojas para que la persona elija columnas.
// Con JSON { filas: [{ nombre, nit, nit_alt, fila }] }: importa.
export const POST = manejar(async (req, { params }) => {
  const { id } = await params;
  if ((req.headers.get('content-type') || '').includes('multipart/form-data')) {
    const archivo = (await req.formData()).get('archivo');
    if (!archivo) return Response.json({ error: 'Sube un archivo de Excel (.xlsx).' }, { status: 400 });
    const libro = new ExcelJS.Workbook();
    try {
      await libro.xlsx.load(Buffer.from(await archivo.arrayBuffer()));
    } catch {
      return Response.json({ error: 'No se pudo leer el archivo. Debe ser un Excel .xlsx.' }, { status: 422 });
    }
    return {
      hojas: libro.worksheets.map((h) => {
        const filas = [];
        h.eachRow({ includeEmpty: false }, (fila, n) => {
          if (filas.length >= 1000) return;
          const valores = [];
          for (let c = 1; c <= Math.min(h.columnCount, 30); c++) valores.push(comoTexto(fila.getCell(c).value));
          if (valores.some(Boolean)) filas.push({ n, valores });
        });
        return { nombre: h.name, columnas: Math.min(h.columnCount, 30), filas };
      }).filter((h) => h.filas.length),
    };
  }
  const { filas } = await req.json();
  if (!Array.isArray(filas) || !filas.length) return Response.json({ error: 'No hay filas para importar.' }, { status: 400 });
  return importarTerceros(id, filas);
});
