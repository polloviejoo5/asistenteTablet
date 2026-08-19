// Función serverless de Vercel. Corre en la nube, no en el navegador de la tablet.
// La GEMINI_API_KEY vive solo acá (como variable de entorno en Vercel) y nunca
// viaja hasta el navegador.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { mime_type, data } = req.body || {};
    if (!data) {
      return res.status(400).json({ error: 'Falta el audio (campo "data")' });
    }

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash-lite';

    if (!GEMINI_API_KEY) {
      return res.status(500).json({ error: 'Falta configurar GEMINI_API_KEY en Vercel' });
    }

    const promptTexto =
      'Escuchá el audio adjunto: es una pregunta hablada en español para un asistente de panel de pared en una casa. ' +
      'Primero transcribí exactamente lo que se dice, y después respondé de forma breve y clara (máximo 3 frases), ' +
      'en español rioplatense. Devolvé SOLO un JSON válido, sin backticks ni texto extra, con este formato exacto: ' +
      '{"pregunta": "transcripción de lo que se dijo", "respuesta": "tu respuesta breve"}';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const body = {
      contents: [{ parts: [
        { inline_data: { mime_type: mime_type || 'audio/wav', data } },
        { text: promptTexto }
      ]}]
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const errText = await r.text();
      console.error('Gemini error:', errText);
      return res.status(502).json({ error: 'Error consultando a Gemini' });
    }

    const d = await r.json();
    let raw = d.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
    raw = raw.replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();

    let pregunta = '', respuesta = '';
    try {
      const parsed = JSON.parse(raw);
      pregunta = parsed.pregunta || '';
      respuesta = parsed.respuesta || 'No recibí respuesta.';
    } catch {
      respuesta = raw || 'No recibí respuesta.';
    }

    return res.status(200).json({ pregunta, respuesta });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}
