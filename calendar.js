// Función serverless de Vercel. La CALENDAR_API_KEY y el CALENDAR_ID viven
// solo acá (variables de entorno en Vercel), nunca en el navegador de la tablet.

export default async function handler(req, res) {
  try {
    const CALENDAR_API_KEY = process.env.CALENDAR_API_KEY;
    const CALENDAR_ID = process.env.CALENDAR_ID;

    if (!CALENDAR_API_KEY || !CALENDAR_ID) {
      // Todavía no se configuró el calendario: no es un error, el panel
      // simplemente muestra "no hay eventos" / el aviso correspondiente.
      return res.status(200).json({ items: [], noConfigurado: true });
    }

    const timeMin = new Date().toISOString();
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events` +
      `?key=${CALENDAR_API_KEY}&timeMin=${timeMin}&maxResults=6&singleEvents=true&orderBy=startTime`;

    const r = await fetch(url);
    if (!r.ok) {
      const errText = await r.text();
      console.error('Calendar error:', errText);
      return res.status(502).json({ error: 'Error consultando Calendar' });
    }

    const d = await r.json();
    return res.status(200).json({ items: d.items || [] });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: 'Error interno' });
  }
}
