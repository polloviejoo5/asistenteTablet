import { getAccessToken, sheetsGet, sheetsAppend, sheetsUpdate, sheetsDeleteRow, getSheetIdPorNombre } from '../lib/sheets.js';

const HOJA = 'Inventario';
const RANGO = `${HOJA}!A2:C`; // A: Canasto, B: Artículo, C: Cantidad (fila 1 = encabezados)

export default async function handler(req, res) {
  try {
    const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
    if (!SPREADSHEET_ID) return res.status(500).json({ error: 'Falta SPREADSHEET_ID en las variables de entorno' });

    const accessToken = await getAccessToken();

    // --- VER inventario ---
    if (req.method === 'GET') {
      const d = await sheetsGet(SPREADSHEET_ID, RANGO, accessToken);
      const items = (d.values || [])
        .map((fila, i) => ({
          fila: i + 2, // la fila real en la planilla (la 1 es el encabezado)
          canasto: fila[0] || '',
          articulo: fila[1] || '',
          cantidad: Number(fila[2]) || 0
        }))
        .filter(item => item.articulo);
      return res.status(200).json({ items });
    }

    // --- AGREGAR artículo ---
    if (req.method === 'POST') {
      const { canasto, articulo, cantidad } = req.body || {};
      if (!canasto || !articulo) return res.status(400).json({ error: 'Falta canasto o artículo' });
      await sheetsAppend(SPREADSHEET_ID, RANGO, [canasto, articulo, cantidad ?? 1], accessToken);
      return res.status(200).json({ ok: true });
    }

    // --- ACTUALIZAR (cantidad, o corregir canasto/nombre) ---
    if (req.method === 'PUT') {
      const { fila, canasto, articulo, cantidad } = req.body || {};
      if (!fila) return res.status(400).json({ error: 'Falta el número de fila' });
      await sheetsUpdate(SPREADSHEET_ID, `${HOJA}!A${fila}:C${fila}`, [canasto, articulo, cantidad], accessToken);
      return res.status(200).json({ ok: true });
    }

    // --- QUITAR artículo ---
    if (req.method === 'DELETE') {
      const { fila } = req.body || {};
      if (!fila) return res.status(400).json({ error: 'Falta el número de fila' });
      const sheetId = await getSheetIdPorNombre(SPREADSHEET_ID, HOJA, accessToken);
      await sheetsDeleteRow(SPREADSHEET_ID, sheetId, fila - 1, accessToken);
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: 'Método no permitido' });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno', detalle: String(e.message || e) });
  }
}
