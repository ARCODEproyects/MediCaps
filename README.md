# MediCaps: tienda + panel de administración en Cloudflare

- **`/`** es la tienda pública: catálogo, bolsa y pedido por WhatsApp.
- **`/admin`** es el panel privado, protegido con contraseña. Ahí puedes:
  - agregar, editar, ordenar o borrar gorros;
  - llevar las **existencias** de cada uno (con 0 aparece como *Agotado*, pero sigue en el catálogo);
  - crear, renombrar, ordenar y borrar **categorías**;
  - subir el **diseño o estampado**, que se acomoda solo a la forma del gorro, y/o una **foto real del gorro**;
  - definir la zona de envíos y el monto para envío gratis (por defecto: Guadalajara, más de $500);
  - cambiar los textos y el número de WhatsApp. Le das **Publicar cambios** y la tienda se actualiza sola, sin volver a subir nada. Puede tardar hasta un minuto en verse en todos lados.

Todo corre en Cloudflare: **Pages** sirve las páginas, **Pages Functions** (carpeta `functions/`) hace de API y **KV** guarda productos y fotos. No necesitas otra base de datos ni otro servidor. El plan gratis alcanza de sobra.

```
index.html, store.js     tienda
styles.css, cap.js       estilos y dibujo del gorro (los usan las dos páginas)
admin/                   panel privado
functions/api/store.js   leer / guardar productos
functions/api/login.js   revisar contraseña
functions/api/images/    subir / mostrar fotos
functions/api/_lib.js    validaciones y productos de ejemplo
```

> Importante: subir la carpeta arrastrándola en el dashboard **no ejecuta la carpeta `functions/`**. Usa GitHub (opción A) o Wrangler (opción B).

## 1. Subir el proyecto

### Opción A: GitHub (recomendada)

1. Crea un repo y sube esta carpeta:
   ```bash
   git init
   git add .
   git commit -m "Tienda MediCaps"
   git branch -M main
   git remote add origin https://github.com/TU_USUARIO/medicaps.git
   git push -u origin main
   ```
2. En dash.cloudflare.com ve a **Workers & Pages → Create → Pages → Connect to Git** y elige el repo.
3. Configuración de build:
   - Framework preset: **None**
   - Build command: *(vacío)*
   - Build output directory: `/`
4. **Save and Deploy**.

### Opción B: Wrangler (terminal)

```bash
npm install -g wrangler
wrangler login
wrangler pages deploy . --project-name medicaps
```

## 2. Crear la base de datos (KV)

1. En el dashboard: **Storage & Databases → KV → Create** y ponle `medicaps-store`.
2. Entra a tu proyecto de Pages → **Settings → Bindings → Add → KV namespace**.
   - Variable name: **`STORE`** (exactamente así, en mayúsculas)
   - KV namespace: `medicaps-store`

## 3. Poner la contraseña del panel

En el proyecto de Pages → **Settings → Variables and Secrets → Add**:
- Type: **Secret**
- Variable name: **`ADMIN_PASSWORD`**
- Value: una contraseña larga que solo sepas tú (mínimo 12 caracteres).

## 4. Volver a desplegar

Las variables y el KV solo se aplican en despliegues nuevos. Ve a **Deployments**, abre el último y dale **Retry deployment**, o haz un `git push`.

Listo:
- Tienda: `https://medicaps.pages.dev`
- Panel: `https://medicaps.pages.dev/admin`

La primera vez la tienda muestra 6 productos de ejemplo. Entra al panel, cámbialos por los tuyos y publica.

## Probar en tu compu antes de subir

```bash
npx wrangler pages dev . --kv STORE --binding ADMIN_PASSWORD=prueba123
```
Abre `http://localhost:8788` y `http://localhost:8788/admin` (contraseña `prueba123`).

## Notas

- **Existencias**: no se descuentan solas con cada pedido de WhatsApp, porque el pedido se confirma por chat. Cuando vendas, réstalas en el panel con el botón −.
- **Fotos**: el panel las reduce a 1200 px en JPG antes de subirlas, así cargan rápido. Las que ya no usa ningún producto se borran solas al publicar.
- **Seguridad**: la contraseña nunca está en el código, vive como secreto en Cloudflare. Cada intento fallido tarda casi un segundo en responder, lo que frena a quien intente adivinarla. La sesión se cierra al cerrar el navegador.
- **Cambiar la contraseña**: edita el secreto `ADMIN_PASSWORD` y vuelve a desplegar.
- **Límites gratis de KV**: 1,000 escrituras al día. Cada publicación o foto cuenta como una, así que no lo vas a alcanzar.
- **Dominio propio**: proyecto de Pages → **Custom domains**.
