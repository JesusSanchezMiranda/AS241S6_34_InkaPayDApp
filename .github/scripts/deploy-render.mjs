import { appendFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

const API_BASE = 'https://api.render.com/v1'
const failedStatuses = new Set(['build_failed', 'pre_deploy_failed', 'update_failed', 'canceled', 'deactivated'])

class RenderApiError extends Error {
  constructor(status, detail) {
    super(detail ? `Render API returned HTTP ${status}: ${detail}` : `Render API returned HTTP ${status}`)
    this.name = 'RenderApiError'
    this.status = status
    this.detail = detail
  }
}

function createClient({ apiKey, request }) {
  return async function call(url, options = {}) {
    const response = await request(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    })
    // Nunca se registran cabeceras ni cuerpos de error completos: solo el mensaje de Render.
    if (!response.ok) throw new RenderApiError(response.status, await readErrorMessage(response))
    return response.json()
  }
}

async function readErrorMessage(response) {
  try {
    const payload = await response.json()
    const message = payload?.message ?? payload?.error
    return typeof message === 'string' ? message.trim() : ''
  } catch {
    return ''
  }
}

/**
 * Render exige que host, repositorio y nombre de la imagen coincidan con los
 * configurados en el servicio; la etiqueta (tag) puede cambiar en cada deploy.
 */
function imageRepository(reference) {
  const value = String(reference ?? '').trim().split('@')[0]
  const lastSlash = value.lastIndexOf('/')
  const lastColon = value.lastIndexOf(':')
  return (lastColon > lastSlash ? value.slice(0, lastColon) : value).toLowerCase()
}

function serviceImage(service) {
  return service?.imagePath ?? service?.serviceDetails?.imagePath ?? service?.image?.imagePath ?? ''
}

function describeService(service) {
  const type = service?.type ? ` [${service.type}]` : ''
  const image = serviceImage(service)
  return `  - ${service?.id ?? 'sin id'} ${service?.name ?? '(sin nombre)'}${type}${image ? ` — imagen: ${image}` : ''}`
}

async function listAccessibleServices({ apiKey, request }) {
  const call = createClient({ apiKey, request })
  try {
    const page = await call(`${API_BASE}/services?limit=100`)
    const entries = Array.isArray(page) ? page : []
    return entries.map((entry) => entry?.service ?? entry).filter(Boolean)
  } catch {
    return null
  }
}

async function serviceNotFoundError({ apiKey, request, serviceId }) {
  const services = await listAccessibleServices({ apiKey, request })
  const lines = [
    `Render no encontró el servicio ${serviceId} con la RENDER_API_KEY configurada.`,
    'Causas habituales: el ID pertenece a otro workspace, el servicio fue eliminado, o la key es de una cuenta distinta.',
  ]
  if (services === null) {
    lines.push('Tampoco se pudieron listar los servicios: revisa que RENDER_API_KEY sea válida y del workspace correcto.')
  } else if (services.length === 0) {
    lines.push('Esta key no ve ningún servicio. Crea la API key dentro del workspace que contiene el servicio de Render.')
  } else {
    lines.push(`Servicios visibles para esta key (${services.length}):`)
    lines.push(...services.map(describeService))
    lines.push('Copia el id srv-... del servicio web image-backed correcto y guárdalo en la variable RENDER_SERVICE_ID del repositorio.')
  }
  return new Error(lines.join('\n'))
}

export async function listRenderServices({ apiKey, request = fetch }) {
  if (!apiKey) throw new Error('Missing RENDER_API_KEY')
  const services = await listAccessibleServices({ apiKey, request })
  if (services === null) {
    throw new Error('No se pudo listar los servicios de Render. Verifica que RENDER_API_KEY sea válida y del workspace correcto.')
  }
  return services
}

export async function deployRender({
  apiKey,
  serviceId,
  imageUrl,
  request = fetch,
  wait = sleep,
  now = Date.now,
  timeoutMs = 18 * 60 * 1000,
  onStatus = () => {},
}) {
  if (!apiKey) throw new Error('Missing RENDER_API_KEY')
  if (!/^srv-[a-z0-9]+$/.test(serviceId ?? '')) throw new Error('Invalid RENDER_SERVICE_ID (expected srv-...)')
  if (!/^docker\.io\/[a-z0-9_-]+\/[a-z0-9._/-]+:sha-[a-f0-9]{40}$/.test(imageUrl ?? '')) {
    throw new Error('RENDER_IMAGE_URL must identify the Docker Hub image tagged with the full commit SHA')
  }

  const call = createClient({ apiKey, request })
  const endpoint = `${API_BASE}/services/${serviceId}/deploys`
  const deadline = now() + timeoutMs

  // Preflight: confirma que el servicio existe para esta key y que la imagen coincide.
  let service
  try {
    service = await call(`${API_BASE}/services/${serviceId}`)
  } catch (error) {
    if (error instanceof RenderApiError && error.status === 404) {
      throw await serviceNotFoundError({ apiKey, request, serviceId })
    }
    if (error instanceof RenderApiError && error.status === 401) {
      throw new Error('RENDER_API_KEY no es válida o fue revocada (HTTP 401). Genera una nueva en Render → Account Settings → API Keys.')
    }
    if (error instanceof RenderApiError && error.status === 403) {
      throw new Error('RENDER_API_KEY no tiene permisos sobre ese servicio (HTTP 403). Usa una key del workspace dueño del servicio.')
    }
    throw error
  }

  if (service?.type === 'static_site') {
    throw new Error(`El servicio ${serviceId} es un static site; Render solo acepta deploy de imagen en servicios web image-backed.`)
  }

  const configuredRepository = imageRepository(serviceImage(service))
  if (configuredRepository && configuredRepository !== imageRepository(imageUrl)) {
    throw new Error(
      `La imagen configurada en Render (${serviceImage(service)}) no coincide con la que publica el pipeline (${imageUrl}). ` +
        'Host, repositorio y nombre deben ser idénticos; solo puede cambiar la etiqueta.',
    )
  }

  // Trigger once; retrying a POST could create duplicate deployments.
  let deploy
  try {
    deploy = await call(endpoint, { method: 'POST', body: JSON.stringify({ imageUrl }) })
  } catch (error) {
    if (error instanceof RenderApiError && error.status === 404) {
      throw await serviceNotFoundError({ apiKey, request, serviceId })
    }
    throw error
  }
  const deployId = deploy.id
  if (!/^dep-[a-z0-9]+$/.test(deployId ?? '')) throw new Error('Render did not return a valid deploy ID')

  let lastStatus
  while (true) {
    if (typeof deploy.status !== 'string') throw new Error('Render did not return a deployment status')
    if (deploy.status !== lastStatus) {
      onStatus(deploy.status)
      lastStatus = deploy.status
    }
    if (deploy.status === 'live') return { id: deployId, status: deploy.status, serviceName: service?.name }
    if (failedStatuses.has(deploy.status)) throw new Error(`Render deployment ${deployId} ended with ${deploy.status}`)
    const remaining = deadline - now()
    if (remaining <= 0) throw new Error(`Timed out waiting for Render deployment ${deployId}. Check the Render dashboard.`)
    await wait(Math.min(10_000, remaining))
    if (now() >= deadline) throw new Error(`Timed out waiting for Render deployment ${deployId}. Check the Render dashboard.`)
    deploy = await call(`${endpoint}/${deployId}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    if (process.argv.includes('--list')) {
      const services = await listRenderServices({ apiKey: process.env.RENDER_API_KEY })
      console.log(`Servicios visibles para esta API key (${services.length}):`)
      for (const service of services) console.log(describeService(service))
      if (services.length === 0) console.log('No hay servicios en este workspace.')
    } else {
      const serviceId = process.env.RENDER_SERVICE_ID
      const result = await deployRender({
        apiKey: process.env.RENDER_API_KEY,
        serviceId,
        imageUrl: process.env.RENDER_IMAGE_URL,
        onStatus: (status) => console.log(`Render: ${status}`),
      })
      const dashboardUrl = `https://dashboard.render.com/web/${serviceId}/deploys/${result.id}`
      console.log(`Render deployment is live${result.serviceName ? ` for ${result.serviceName}` : ''}: ${dashboardUrl}`)
      if (process.env.GITHUB_STEP_SUMMARY) {
        await appendFile(process.env.GITHUB_STEP_SUMMARY, `Render deployment: [${result.id}](${dashboardUrl}) — live\n`)
      }
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
