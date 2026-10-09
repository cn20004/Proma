import { describe, expect, test } from 'bun:test'
const { GitHubProvider } = require('electron-updater/out/providers/GitHubProvider')
const { HttpError } = require('builder-util-runtime')
const { parse, gt } = require('semver')

interface RequestOptions { path: string; hostname: string }

describe('给定已安装的 20004 魔改版本', () => {
  for (const baseline of ['0.19.58-20004.4', '0.19.58-20004.5']) {
    test(`当 GitHub 正式发布 .6 时，${baseline} 能识别并读取 latest.yml`, async () => {
      const version = '0.19.58-20004.6'
      const name = `Proma-20004-Setup-${version}.exe`
      const requests: string[] = []
      const executor = { request: async (options: RequestOptions) => {
        requests.push(`${options.hostname}${options.path}`)
        if (options.path.endsWith('.atom')) {
          return `<feed xmlns="http://www.w3.org/2005/Atom"><entry><title>新版</title><link href="https://github.com/cn20004/Proma/releases/tag/v${version}"/><content>保留魔改功能</content></entry></feed>`
        }
        if (options.path.endsWith('/20004.yml')) throw new HttpError(404)
        if (options.path.endsWith('/latest.yml')) {
          return `version: ${version}\nfiles:\n  - url: ${name}\n    sha512: dGVzdA==\n    size: 100\npath: ${name}\nsha512: dGVzdA==\n`
        }
        throw new Error(`意外更新请求：${options.path}`)
      } }
      const provider = new GitHubProvider(
        { provider: 'github', owner: 'cn20004', repo: 'Proma' },
        { allowPrerelease: true, currentVersion: parse(baseline), channel: null, fullChangelog: false },
        { platform: 'win32', executor },
      )
      const update = await provider.getLatestVersion()
      expect(update.version).toBe(version)
      expect(gt(update.version, baseline)).toBe(true)
      expect(provider.resolveFiles(update)[0].url.href).toBe(`https://github.com/cn20004/Proma/releases/download/v${version}/${name}`)
      expect(requests.some(url => url.endsWith('/latest.yml'))).toBe(true)
      expect(requests.every(url => url.startsWith('github.com/cn20004/Proma/'))).toBe(true)
    })
  }
})
