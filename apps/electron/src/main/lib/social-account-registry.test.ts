import { describe, expect, test } from 'bun:test'
import {
  assertUniqueProfiles, partitionForNewProfile, resolveAccount, suggestLegacyAccounts,
  type BrowserAccount,
} from './account-registry'

const account: BrowserAccount = {
  id: 'wechat-1', platform: 'wechat-channels', displayName: '微信1',
  profileId: 'wechat-1', status: 'active', legacyProjectIds: ['old-project-1'],
  createdAt: '2026-10-26T00:00:00.000Z', updatedAt: '2026-10-26T00:00:00.000Z',
}

describe('multi-account migration safety', () => {
  test('suggests mapping without touching sessions', () => {
    const result = suggestLegacyAccounts([
      { projectId: 'old-project-1', projectName: '微信1' },
      { projectId: 'old-project-2', projectName: '知乎2' },
      { projectId: 'old-project-3', projectName: '小红书3' },
    ])
    expect(result.map((x) => x.suggestedPlatform)).toEqual([
      'wechat-channels', 'zhihu', 'xiaohongshu',
    ])
    expect(result.every((x) => x.requiresIdentityVerification)).toBe(true)
  })
  test('rejects shared browser profile identities', () => {
    expect(() => assertUniqueProfiles([account, { ...account, id: 'wechat-2' }])).toThrow()
  })
  test('never silently switches to a different identity', () => {
    expect(() => resolveAccount([account], 'wechat-2')).toThrow()
    expect(() => resolveAccount([{ ...account, status: 'disabled' }], 'wechat-1')).toThrow()
  })
  test('creates stable isolated partition identifiers', () => {
    expect(partitionForNewProfile('wechat-1')).toBe('social-account:wechat-1')
    expect(() => partitionForNewProfile('../outside')).toThrow()
  })
})
