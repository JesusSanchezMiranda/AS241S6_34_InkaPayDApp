import { appendFile } from 'node:fs/promises'
import { setTimeout as sleep } from 'node:timers/promises'
import { pathToFileURL } from 'node:url'

const failedStatuses = new Set(['build_failed', 'pre_deploy_failed', 'update_failed', 'canceled', 'deactivated'])

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

  const endpoint = `https://api.render.com/v1/services/${serviceId}/deploys`
  const deadline = now() + timeoutMs
  async function api(url, options = {}) {
    const response = await request(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(30_000),
    })
    // Do not log response bodies or authorization headers.
    if (!response.ok) throw new Error(`Render API returned HTTP ${response.status}`)
    return response.json()
  }

  // Trigger once; retrying a POST could create duplicate deployments.
  let deploy = await api(endpoint, { method: 'POST', body: JSON.stringify({ imageUrl }) })
  const deployId = deploy.id
  if (!/^dep-[a-z0-9]+$/.test(deployId ?? '')) throw new Error('Render did not return a valid deploy ID')

  let lastStatus
  while (true) {
    if (typeof deploy.status !== 'string') throw new Error('Render did not return a deployment status')
    if (deploy.status !== lastStatus) {
      onStatus(deploy.status)
      lastStatus = deploy.status
    }
    if (deploy.status === 'live') return { id: deployId, status: deploy.status }
    if (failedStatuses.has(deploy.status)) throw new Error(`Render deployment ${deployId} ended with ${deploy.status}`)
    const remaining = deadline - now()
    if (remaining <= 0) throw new Error(`Timed out waiting for Render deployment ${deployId}. Check the Render dashboard.`)
    await wait(Math.min(10_000, remaining))
    if (now() >= deadline) throw new Error(`Timed out waiting for Render deployment ${deployId}. Check the Render dashboard.`)
    deploy = await api(`${endpoint}/${deployId}`)
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const serviceId = process.env.RENDER_SERVICE_ID
    const result = await deployRender({
      apiKey: process.env.RENDER_API_KEY,
      serviceId,
      imageUrl: process.env.RENDER_IMAGE_URL,
      onStatus: (status) => console.log(`Render: ${status}`),
    })
    const dashboardUrl = `https://dashboard.render.com/web/${serviceId}/deploys/${result.id}`
    console.log(`Render deployment is live: ${dashboardUrl}`)
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, `Render deployment: [${result.id}](${dashboardUrl}) — live\n`)
    }
  } catch (error) {
    console.error(error.message)
    process.exitCode = 1
  }
}
