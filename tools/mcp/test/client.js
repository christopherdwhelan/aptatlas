// Talks to the real server over stdio, as any MCP client would.
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
export async function connect() {
  const client = new Client({ name: 'aptatlas-mcp-test', version: '1' })
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(here, '../server.js')] }))
  return {
    client,
    call: async (name, args) => (await client.callTool({ name, arguments: args })).structuredContent,
    close: () => client.close(),
  }
}
