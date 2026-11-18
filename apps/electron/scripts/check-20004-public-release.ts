/**
 * Public-release safeguard.
 * Fail CI if a private, project-specific name is accidentally bundled into
 * application source or text resources. Never scans the user's local data.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../', import.meta.url))
const names = [0x676d, 0x5dde, 0x9879, 0x76ee].map((value) => String.fromCharCode(value)).join('')
const scannedExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.json', '.yaml', '.yml', '.md', '.html', '.css', '.svg', '.txt'])
const entries: string[] = []

function walk(path: string): void {
  for (const name of readdirSync(path)) {
    if (['node_modules', 'dist', 'out', '.git'].includes(name)) continue
    const full = join(path, name)
    const stat = statSync(full)
    if (stat.isDirectory()) walk(full)
    else if (stat.isFile() && stat.size <= 5_000_000 && scannedExt.has(extname(name).toLowerCase())) entries.push(full)
  }
}
walk(join(root, 'src'))
walk(join(root, 'resources'))
const found = entries.filter((file) => readFileSync(file, 'utf8').includes(names))
if (found.length) {
  console.error('PUBLIC RELEASE BLOCKED: personal project name found in bundled content:')
  for (const path of found) console.error(path)
  process.exit(1)
}
console.log(`Public-release project-name check passed: ${entries.length} files`)
