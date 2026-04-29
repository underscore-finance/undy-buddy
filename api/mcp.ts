/**
 * Vercel function exposing Undy Buddy as a hosted MCP server.
 *
 * Stateless mode: every request gets a fresh transport + server. No in-memory
 * sessions — required because Vercel functions don't share state across cold
 * starts or between concurrent invocations.
 *
 * Endpoints (after vercel.json rewrites):
 *   POST /mcp     — JSON-RPC requests, SSE response stream
 *   GET  /health  — JSON status (chain, plugins, contracts)
 *
 * RPC URL comes from the `DAPPQL_DEFAULT_RPC_URL` env var configured in
 * Vercel project settings. Writes are deliberately impossible here: no
 * signing key in env, and `mcp.allowWrites` is never set in this deploy.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'

import { createDappqlServer, loadProjectContext } from '@dappql/mcp'
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js'

// Side-effect import: force Vercel's Output File Tracer to include the SDK in
// the deployment bundle. `loadProjectContext` walks node_modules at runtime,
// which the static tracer can't follow — without this, the SDK directory
// doesn't ship and plugin discovery returns empty. The imported value is
// unused; only the dependency relationship matters.
import '@underscore-finance/sdk'

type Ctx = NonNullable<Awaited<ReturnType<typeof loadProjectContext>>>

// Cache the project context across warm invocations. Cold starts pay the
// plugin-discovery cost once; subsequent calls reuse the resolved context.
let ctxPromise: Promise<Ctx | null> | null = null
function getCtx(): Promise<Ctx | null> {
  if (!ctxPromise) ctxPromise = loadProjectContext(process.cwd()) as Promise<Ctx | null>
  return ctxPromise
}

export default async function handler(
  req: IncomingMessage & { body?: unknown; url?: string },
  res: ServerResponse,
): Promise<void> {
  // CORS — cheap and covers browser-based MCP clients.
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, mcp-session-id, mcp-protocol-version, last-event-id',
  )

  if (req.method === 'OPTIONS') {
    res.writeHead(204).end()
    return
  }

  const ctx = await getCtx()
  if (!ctx) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        error: 'No DappQL plugins discovered at deploy time. Ensure @underscore-finance/sdk is in dependencies.',
      }),
    )
    return
  }

  // Health endpoint — useful for uptime monitoring + deploy verification.
  if (req.method === 'GET' && (req.url === '/health' || req.url?.startsWith('/health?'))) {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(
      JSON.stringify({
        ok: true,
        chainId: ctx.chainId ?? null,
        contracts: Object.keys(ctx.config.contracts).length,
        plugins: ctx.plugins.map((p) => `${p.name}@${p.version ?? '?'}`),
      }),
    )
    return
  }

  // Stateless MCP only accepts POST. GET-for-SSE / DELETE-for-session don't
  // apply (no sessions exist in stateless mode).
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json', Allow: 'POST' })
    res.end(JSON.stringify({ error: 'Stateless MCP only supports POST /mcp' }))
    return
  }

  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined })
  const server = createDappqlServer(ctx)
  res.on('close', () => {
    transport.close().catch(() => {})
    server.close().catch(() => {})
  })
  await server.connect(transport)
  await transport.handleRequest(req, res, req.body)
}
