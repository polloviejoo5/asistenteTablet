# Panel de pared — clima, calendario y consulta a Gemini (con Vercel)

Arquitectura: la tablet solo habla con tu propio proyecto de Vercel. Las claves de
Gemini y Google Calendar viven como "Environment Variables" en Vercel — nunca están
en el código que descarga el navegador, ni en el repositorio de git.

```
tu-repo/
├── index.html          ← la página que ve la tablet (sin ninguna clave adentro)
└── api/
    ├── gemini.js        ← función serverless: recibe el audio, habla con Gemini
    └── calendar.js       ← función serverless: trae los eventos del calendario
```

## 1. Subir el proyecto a GitHub

Ahora sí podés subir todo el repo tal cual está, sin preocuparte por el secret
scanning — ningún archivo del repo contiene una clave real, así que no va a saltar
ninguna alerta. Subí `index.html` y la carpeta `api/` completa.

## 2. Crear el proyecto en Vercel

1. Andá a https://vercel.com y creá una cuenta (podés entrar directo con tu cuenta
   de GitHub, es gratis).
2. Tocá **"Add New" → "Project"**.
3. Elegí el repositorio que acabás de subir. Vercel detecta automáticamente que hay
   una carpeta `api/` y arma las funciones serverless solo — no hace falta ningún
   build ni configuración especial.
4. Todavía no toques "Deploy" — antes vamos a cargar las claves (paso 3).

## 3. Cargar las claves como variables de entorno

Antes de desplegar (o después, editando el proyecto ya creado):

1. En la pantalla de configuración del proyecto, buscá la sección
   **"Environment Variables"**.
2. Agregá una por una:

   | Nombre | Valor |
   |---|---|
   | `GEMINI_API_KEY` | tu clave real de Gemini |
   | `CALENDAR_API_KEY` | tu clave real de Google Calendar |
   | `CALENDAR_ID` | el ID de tu calendario (tu email, o algo `@group.calendar.google.com`) |
   | `GEMINI_MODEL` | opcional — si no la agregás, usa `gemini-2.5-flash-lite` por defecto |

3. Guardá y tocá **"Deploy"**.

## 4. Restringir las claves (igual que antes, pero más simple)

Una vez desplegado, Vercel te da una URL fija tipo `https://tu-proyecto.vercel.app`.
Con esta arquitectura, en realidad **ya no es estrictamente necesario** restringir
las claves por dominio — como viven solo en el servidor y nunca llegan al navegador,
no hay forma de que alguien las vea "espiando" la página. Aun así, restringirlas por
las dudas (defensa en profundidad) sigue siendo una buena práctica:

1. En Google Cloud Console, editá cada key.
2. En "Restricciones de la aplicación" → "Direcciones IP" no aplica acá (Vercel usa
   IPs dinámicas). Dejalas sin restricción de sitio esta vez, ya que de todos modos
   nunca se exponen — la protección real ahora es que están en el servidor, no en
   el código público.

## 5. Configurar la tablet

En Fully Kiosk Browser (o el navegador que estés usando), la "Start URL" pasa a ser
directamente tu URL de Vercel: `https://tu-proyecto.vercel.app`

## Actualizaciones futuras

Cada vez que hagas un cambio y lo subas a GitHub (a la rama principal), Vercel
vuelve a desplegar solo, automáticamente, en un par de minutos — no hay que repetir
ningún paso manual.
