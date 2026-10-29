# Docker Hub y Render

El workflow [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml) valida, construye y publica la imagen en Docker Hub, y después dispara el deploy en Render. Se ejecuta en `pull_request`, en pushes a la rama por defecto, en pushes a `develop` y manualmente con `workflow_dispatch`.

## Requisitos en Render

El servicio debe ser un **Web Service image-backed** (no un static site ni un servicio desde Git):

- **Image URL:** `docker.io/<DOCKERHUB_USERNAME>/inkapay` (el nombre debe coincidir exactamente con lo que publica el pipeline; solo cambia la etiqueta).
- **Puerto:** `8080`.
- **Health check:** `/healthz`.
- Si el repositorio de Docker Hub es privado, configura las credenciales de registro en Render.

El pipeline despliega la etiqueta `sha-<commit completo>`, no `latest`.

## Configuración en GitHub

`Settings → Secrets and variables → Actions`.

| Nombre | Tipo | Obligatorio | Uso |
| --- | --- | --- | --- |
| `DOCKERHUB_USERNAME` | variable o secret | sí | Usuario de Docker Hub |
| `DOCKERHUB_TOKEN` | secret | sí | Token con permiso de escritura |
| `DOCKERHUB_REPOSITORY` | variable | no | Por defecto `inkapay` |
| `RENDER_API_KEY` | secret | sí | API key del workspace dueño del servicio |
| `RENDER_SERVICE_ID` | **variable** | no | ID `srv-...` del web service. Si falta, no existe para la key, o hay un único web service que sirve la misma imagen, se resuelve automáticamente |
| `VITE_ETHERSCAN_API_KEY` | secret | no | Se embebe en el build |
| `VITE_TESTNET_HISTORY_PROVIDER` | variable | no | Por defecto `blockscout` |

`RENDER_SERVICE_ID` no es sensible: guárdalo como **variable** para que aparezca sin enmascarar en los logs y sea fácil compararlo con el dashboard.

## Primer despliegue

Si todavía no existe el servicio en Render, ejecuta el workflow manualmente con **`publish_only`** activado. Eso publica la imagen sin intentar desplegarla. Después crea el web service image-backed apuntando a esa imagen y ejecuta el workflow normal.

## Diagnóstico

### `Render API returned HTTP 404`

Significa que la API key no ve ese servicio: el ID es de otro workspace, el servicio fue eliminado o la key pertenece a otra cuenta. El script hace un preflight y, ante un 404, lista los servicios visibles para la key. Si **exactamente un** web service sirve la misma imagen que publica el pipeline, lo usa y deja un aviso `::warning::` en el log. Si hay varios, el deploy se detiene para no elegir el equivocado.

Para verlos localmente:

```powershell
$env:RENDER_API_KEY = "rnd_..."
node .github/scripts/deploy-render.mjs --list
```

Copia el `srv-...` del servicio correcto (aparece en la URL del dashboard: `https://dashboard.render.com/web/srv-xxxx`) y actualiza `RENDER_SERVICE_ID`.

### `RENDER_IMAGE_URL must identify the Docker Hub image...`

La URL se reconstruye en el job de Render porque GitHub descarta los job outputs que contienen secretos. Revisa que `DOCKERHUB_USERNAME` y `DOCKERHUB_REPOSITORY` formen el mismo repositorio que publica el job de Docker.

### La imagen no coincide con la configurada en Render

El pipeline lo detecta antes de desplegar. Host, repositorio y nombre deben ser idénticos; solo puede cambiar la etiqueta. Corrige la imagen del servicio en Render o las variables del repositorio.

## Comandos locales

```bash
docker build -t inkapay:local .
docker run --rm -p 8080:8080 inkapay:local
```

La aplicación queda en `http://localhost:8080`.
