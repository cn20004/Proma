import { describe, expect, test } from 'bun:test'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createHash } from 'node:crypto'
const { verifyWindowsRelease } = require('./verify-windows-release.cjs')

function fixture() {
  const version = '0.19.58-20004.6'
  const name = `Proma-20004-Setup-${version}.exe`
  const directory = mkdtempSync(join(tmpdir(), 'proma-release-'))
  const installer = Buffer.from('安装包测试工件')
  const sha512 = createHash('sha512').update(installer).digest('base64')
  const files = {
    [name]: installer,
    [`${name}.blockmap`]: Buffer.from('blockmap'),
    'latest.yml': Buffer.from(`version: ${version}\nfiles:\n  - url: ${name}\n    sha512: ${sha512}\n    size: ${installer.length}\npath: ${name}\nsha512: ${sha512}\n`),
  }
  const assets = Object.entries(files).map(([name, data]) => {
    writeFileSync(join(directory, name), data)
    return { name, state: 'uploaded', size: data.length, digest: `sha256:${createHash('sha256').update(data).digest('hex')}` }
  })
  return { version, name, directory, assets, cleanup: () => rmSync(directory, { recursive: true, force: true }) }
}

describe('给定待发布的 Windows 在线更新', () => {
  test('当工件完整且校验一致时允许正式发布', () => {
    const f = fixture()
    try { expect(verifyWindowsRelease(f.version, f.directory, f.assets)).toBe(f.name) } finally { f.cleanup() }
  })
  test('当安装包未上传或内容损坏时阻止发布', () => {
    const f = fixture()
    try {
      expect(() => verifyWindowsRelease(f.version, f.directory, f.assets.slice(1))).toThrow('未完整上传')
      f.assets[0]!.digest = 'sha256:错误校验和'
      expect(() => verifyWindowsRelease(f.version, f.directory, f.assets)).toThrow('校验和不一致')
    } finally { f.cleanup() }
  })
  test('当元数据指向其他版本时阻止发布', () => {
    const f = fixture()
    try {
      const wrong = Buffer.from(`version: 0.19.58-20004.5\npath: ${f.name}\n`)
      writeFileSync(join(f.directory, 'latest.yml'), wrong)
      const entry = f.assets.find(a => a.name === 'latest.yml')!
      entry.size = wrong.length; entry.digest = `sha256:${createHash('sha256').update(wrong).digest('hex')}`
      expect(() => verifyWindowsRelease(f.version, f.directory, f.assets)).toThrow('latest.yml')
    } finally { f.cleanup() }
  })
})
