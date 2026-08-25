# Panel de pared — clima, calendario, inventario y lista de compras (con Vercel)

Arquitectura: la tablet solo habla con tu propio proyecto de Vercel. Las claves
viven como "Environment Variables" en Vercel — nunca están en el código que
descarga el navegador, ni en el repositorio de git. Todo el sitio está protegido
con usuario y contraseña vía `middleware.js`.

```
tu-repo/
├── index.html            ← la página que ve la tablet (sin ninguna clave adentro)
├── middleware.js           ← protege todo el sitio con usuario/contraseña
├── lib/
│   └── sheets.js            ← helper compartido para leer/escribir en Google Sheets
└── api/
    ├── calendar.js           ← trae los eventos del calendario (solo lectura)
    ├── inventario.js          ← ver/agregar/actualizar/quitar del inventario
    └── lista-compras.js        ← ver/agregar/actualizar/quitar de la lista de compras
```

## 1. Preparar la planilla de Google Sheets

Podés usar tu Excel actual (pasado a Google Sheets) o crear uno nuevo. Necesita
**dos hojas** (pestañas abajo del todo), con estos nombres y encabezados exactos:

**Hoja "Inventario"** (fila 1 = encabezados, los datos arrancan en la fila 2):

| A: Canasto | B: Artículo | C: Cantidad |
|---|---|---|
| Canasto 1 | pack de bolsas asurin 45x60 | 1 |
| Canasto 1 | caja de brownie | 1 |
| Canasto 2 | yerba | 2 |
| ... | ... | ... |

**Hoja "ListaCompras"**:

| A: Artículo | B: Nota |
|---|---|
| tajín | |

Cargá tu inventario actual en este formato una sola vez (a mano, copiando desde
tu Excel actual) — de ahí en adelante, la tablet se encarga de mantenerlo.

## 2. Crear el "service account" de Google (para poder escribir, no solo leer)

El calendario solo necesitaba una API key porque solo lo *leíamos*. Para el
inventario necesitamos poder **escribir** en la planilla, y eso requiere un
mecanismo distinto: una cuenta de servicio (un "usuario robot" que solo vos
controlás).

1. Andá a https://console.cloud.google.com/iam-admin/serviceaccounts (podés usar
   el mismo proyecto de Google Cloud que ya tenías de antes).
2. Tocá **"Create Service Account"**. Ponele un nombre (ej: "panel-sheets"). No
   hace falta darle ningún rol especial en este paso, "Continuar" y "Listo" alcanza.
3. Entrá a la cuenta de servicio recién creada → pestaña **"Keys"** → **"Add Key"**
   → **"Create new key"** → tipo **JSON**. Se descarga un archivo `.json` — guardalo,
   ahí adentro están los dos datos que necesitás (`client_email` y `private_key`).
4. Andá a https://console.cloud.google.com/apis/library/sheets.googleapis.com y
   activá la **"Google Sheets API"** para ese proyecto.
5. **Compartí tu planilla** de Google Sheets con el email de la cuenta de servicio
   (el `client_email` del JSON, algo como
   `panel-sheets@tu-proyecto.iam.gserviceaccount.com`) — dale permiso de
   **Editor**, igual que compartirías la planilla con otra persona.
6. De la URL de tu planilla (`https://docs.google.com/spreadsheets/d/ESTO_ES_EL_ID/edit`),
   copiá el `ID` — lo vas a necesitar en el paso siguiente.

## 3. Cargar las variables de entorno en Vercel

Sumá estas, además de las que ya tenías (`CALENDAR_API_KEY`, `CALENDAR_ID`,
`PANEL_USER`, `PANEL_PASSWORD`):

| Nombre | Valor |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | el `client_email` del JSON descargado |
| `GOOGLE_PRIVATE_KEY` | el `private_key` del JSON, **tal cual**, con los `\n` incluidos |
| `SPREADSHEET_ID` | el ID de la planilla, del paso anterior |

Sobre `GOOGLE_PRIVATE_KEY`: el JSON tiene algo como
`"-----BEGIN PRIVATE KEY-----\nMII...\n-----END PRIVATE KEY-----\n"` — pegalo
completo, con los `\n` literales incluidos (no hace falta convertirlos a saltos
de línea reales, el código ya se encarga de eso).

Redeployá el proyecto después de cargar las variables.

## 4. Usar la pantalla de inventario en la tablet

En el panel principal, arriba a la derecha, hay un botón con un ícono de canasto
🧺 — te lleva a la pantalla de inventario. Ahí vas a ver una columna por cada
canasto que hayas cargado en la planilla, con botones **+/−** para cambiar
cantidades y una **✕** para quitar un artículo. Al lado, la lista de compras,
con un botón para **vaciarla completa** (pide confirmación antes de borrar todo).

Los cambios que hagas desde la tablet se reflejan directo en tu Google Sheet, y
viceversa: si editás la planilla desde el celu o la compu, la tablet lo va a
mostrar actualizado la próxima vez que entres a esa pantalla.

## Configurar la tablet (clima, calendario)

En Fully Kiosk Browser, la "Start URL" es tu URL de Vercel:
`https://tu-proyecto.vercel.app`. En los ajustes de la app, cargá el usuario y
contraseña en el campo de "HTTP Authentication" para que no te lo pida cada vez.

## Actualizaciones futuras

Cada vez que subas un cambio a GitHub (rama principal), Vercel redeploya solo,
automáticamente, en un par de minutos.


