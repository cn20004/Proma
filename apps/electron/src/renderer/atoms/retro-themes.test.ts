import { describe, expect, test } from 'bun:test'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { THEME_STYLES } from '../../types/settings'

const root = resolve(import.meta.dir, '..')
const added = ['win31-light', 'xp-blue-light', 'xp-olive-light', 'xp-silver-light', 'dos-dark', 'green-terminal-dark', 'amber-terminal-dark', 'norton-dark', 'turbo-pascal-dark', 'mac-classic-light', 'amiga-light', 'os2-light']

describe('给定复古主题选择器', () => {
  test('当新增主题注册后，每种都有可选入口、完整配色和预览图', () => {
    const css = readFileSync(resolve(root, 'styles/globals.css'), 'utf8')
    const ui = readFileSync(resolve(root, 'components/settings/AppearanceSettings.tsx'), 'utf8')
    expect(new Set(THEME_STYLES).size).toBe(THEME_STYLES.length)
    for (const id of added) {
      expect(THEME_STYLES as readonly string[]).toContain(id)
      expect(ui).toContain(`id: '${id}'`)
      expect(existsSync(resolve(root, `assets/theme-previews/theme-${id}.svg`))).toBe(true)
      const block = css.split(`.theme-${id} {`)[1]?.split('}')[0] ?? ''
      for (const token of ['background', 'foreground', 'primary', 'primary-foreground', 'popover', 'dialog', 'input-surface', 'ring']) {
        expect(block).toContain(`--${token}:`)
      }
      expect(id).toMatch(/-(light|dark)$/)
    }
  })
  test('当旧设置加载时，原 Windows 95 与 Linux 安装器仍然有效', () => {
    expect(THEME_STYLES).toContain('win95-light')
    expect(THEME_STYLES).toContain('linux-installer-dark')
  })
})
