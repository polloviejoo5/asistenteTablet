// Helper compartido para leer y escribir en Google Sheets usando un
// "service account" (no requiere que ningún humano inicie sesión — es
// autenticación de servidor a servidor, pensada para automatizaciones).
import crypto from 'crypto';

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

let tokenCache = { token: null, expira: 0 };

export async function getAccessToken() {
  // Reutilizamos el token mientras no haya vencido, para no pedir uno nuevo
  // en cada request (ahorra una llamada de red).
  if (tokenCache.token && Date.now() < tokenCache.expira) {
    return tokenCache.token;
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (!email || !privateKey) {
    throw new Error('Faltan GOOGLE_SERVICE_ACCOUNT_EMAIL o GOOGLE_PRIVATE_KEY en las variables de entorno');
  }

  const header = { alg: 'RS256', typ: 'JWT' };
  const ahora = Math.floor(Date.now() / 1000);
  const claim = {
    iss: email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: 'https://oauth2.googleapis.com/token',
    exp: ahora + 3600,
    iat: ahora
  };

  const sinFirmar = base64url(JSON.stringify(header)) + '.' + base64url(JSON.stringify(claim));
  const firmador = crypto.createSign('RSA-SHA256');
  firmador.update(sinFirmar);
  firmador.end();
  const firma = firmador
    .sign(privateKey)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = sinFirmar + '.' + firma;

  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body:
      'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') +
      '&assertion=' + jwt
  });
  const d = await r.json();
  if (!d.access_token) {
    throw new Error('No se pudo autenticar con Google: ' + JSON.stringify(d));
  }

  tokenCache = { token: d.access_token, expira: Date.now() + (d.expires_in - 60) * 1000 };
  return d.access_token;
}

export async function sheetsGet(spreadsheetId, rango, accessToken) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rango)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!r.ok) throw new Error('Error leyendo Sheets: ' + (await r.text()));
  return r.json();
}

export async function sheetsAppend(spreadsheetId, rango, valores, accessToken) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rango)}:append?valueInputOption=USER_ENTERED`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [valores] })
    }
  );
  if (!r.ok) throw new Error('Error agregando fila: ' + (await r.text()));
  return r.json();
}

export async function sheetsUpdate(spreadsheetId, rango, valores, accessToken) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rango)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ values: [valores] })
    }
  );
  if (!r.ok) throw new Error('Error actualizando fila: ' + (await r.text()));
  return r.json();
}

export async function sheetsClear(spreadsheetId, rango, accessToken) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(rango)}:clear`,
    { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!r.ok) throw new Error('Error vaciando rango: ' + (await r.text()));
  return r.json();
}

export async function getSheetIdPorNombre(spreadsheetId, nombreHoja, accessToken) {
  const r = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!r.ok) throw new Error('Error leyendo metadata: ' + (await r.text()));
  const d = await r.json();
  const hoja = (d.sheets || []).find(s => s.properties.title === nombreHoja);
  if (!hoja) throw new Error(`No se encontró una hoja llamada "${nombreHoja}" en la planilla`);
  return hoja.properties.sheetId;
}

export async function sheetsDeleteRow(spreadsheetId, sheetId, indiceFila0Based, accessToken) {
  const r = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: indiceFila0Based, endIndex: indiceFila0Based + 1 }
        }
      }]
    })
  });
  if (!r.ok) throw new Error('Error borrando fila: ' + (await r.text()));
  return r.json();
}
