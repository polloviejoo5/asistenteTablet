leware · JS
// Corre ANTES de entregar cualquier página o función del proyecto — protege
// todo el sitio (index.html, /api/gemini, /api/calendar) con usuario y
// contraseña, sin necesidad de pagar el "Password Protection" de Vercel Pro.
 
export const config = {
  matcher: '/:path*',
};
 
export default function middleware(request) {
  const usuario = process.env.PANEL_USER || 'admin';
  const clave = process.env.PANEL_PASSWORD;
 
  // Si todavía no configuraste PANEL_PASSWORD en Vercel, no bloqueamos nada
  // (para no dejarte afuera del panel por error) — pero conviene configurarla.
  if (!clave) {
    return;
  }
 
  const authHeader = request.headers.get('authorization');
 
  if (authHeader) {
    const [esquema, credencialesCodificadas] = authHeader.split(' ');
    if (esquema === 'Basic' && credencialesCodificadas) {
      const decodificado = atob(credencialesCodificadas);
      const separador = decodificado.indexOf(':');
      const u = decodificado.slice(0, separador);
      const p = decodificado.slice(separador + 1);
      if (u === usuario && p === clave) {
        return; // credenciales correctas, dejamos pasar
      }
    }
  }
 
  return new Response('Acceso restringido', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Panel"' },
  });
}
