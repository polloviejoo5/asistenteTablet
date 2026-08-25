import { getAccessToken, sheetsGet, sheetsAppend, sheetsUpdate, sheetsDeleteRow, sheetsClear, getSheetIdPorNombre } from '../lib/sheets.js';

const HOJA = 'ListaCompras';
const RANGO = `${HOJA}!A2:B`; // A: Artículo, B: Nota (opcional)

export default async function handler(req, res) {
  try {
    const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
    if (!SPREADSHEET_ID) return res.status(500).json({ error: 'Falta SPREADSHEET_ID en las variables de entorno' });

    const accessToken = await getAccessToken();

    // --- VER lista de compras ---
    if (req.method === 'GET') {
      const d = await sheetsGet(SPREADSHEET_ID, RANGO, accessToken);
      const items = (d.values || [])
        .map((fila, i) => ({ fila: i + 2, articulo: fila[0] || '', nota: fila[1] || '' }))
        .filter(item => item.articulo);
      return res.status(200).json({ items });
    }

    // --- AGREGAR a la lista ---
    if (req.method === 'POST') {
      const { articulo, nota } = req.body || {};
      if (!articulo) return res.status(400).json({ error: 'Falta el artículo' });
      await sheetsAppend(SPREADSHEET_ID, RANGO, [articulo, nota || ''], accessToken);
      return res.status(200).json({ ok: true });
    }

    // --- ACTUALIZAR (ej: corregir un typo) ---
    if (req.method === 'PUT') {
      const { fila, articulo, nota } = req.body || {};
      if (!fila) return res.status(400).json({ error: 'Falta el número de fila' });
      await sheetsUpdate(SPREADSHEET_ID, `${HOJA}!A${fila}:B${fila}`, [articulo, nota || ''], accessToken);
      return res.status(200).json({ ok: true });
    }

    // --- QUITAR (individual o bulk con { todos: true }) ---
    if (req.method === 'DELETE') {
      const { fila, todos } = req.body || {};

      if (todos) {
        await sheetsClear(SPREADSHEET_ID, RANGO, accessToken);
        return res.status(200).json({ ok: true });
      }

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
