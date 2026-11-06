/* global process */
// Reuse the already installed Playwright core. Never invoke npm or download packages.
import path from 'node:path'
import { existsSync, readFileSync } from 'node:fs'
import { pathToFileURL } from 'node:url'

const cachedCore = process.argv[2]
if (!cachedCore || !existsSync(path.join(cachedCore, 'lib/coreBundle.js'))) {
  throw new Error('Existing Playwright core is unavailable; stop without installing dependencies.')
}
const { version } = JSON.parse(readFileSync(path.join(cachedCore, 'package.json'), 'utf8'))
const utils = await import(pathToFileURL(path.join(cachedCore, 'lib/utilsBundle.js')).href)
const core = await import(pathToFileURL(path.join(cachedCore, 'lib/coreBundle.js')).href)
const { program } = utils.default ?? utils
const { tools } = core.default ?? core
if (typeof tools?.decorateMCPCommand !== 'function') {
  throw new Error('Cached Playwright version does not expose its MCP command; stop without fallback installation.')
}
program.name('ysf-project-browser').version(version)
tools.decorateMCPCommand(program, version)
await program.parseAsync(process.argv.slice(3), { from: 'user' })
