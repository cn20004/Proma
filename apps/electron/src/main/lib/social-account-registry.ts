/**
 * Multi-account browser identity registry (phase 1).
 *
 * IMPORTANT: this file is metadata ONLY. It never moves/copies cookies, Chromium
 * storage, Electron partitions or historical project folders.
 * Browser integration must resolve a profile ID to an isolated persistent
 * Electron partition before navigating or running browser automation.
 */
export type SocialPlatform = 'wechat-channels' | 'zhihu' | 'xiaohongshu' | 'bilibili' | 'other'
export type AccountStatus = 'unverified' | 'active' | 'login-required' | 'disabled'

export interface BrowserAccount {
  id: string
  platform: SocialPlatform
  displayName: string
  /** Stable opaque identifier, never a path or session secret. */
  profileId: string
  /** Reuse the existing workspace partition without copying login secrets. */
  legacyProfileKey?: string
  status: AccountStatus
  /** Historical project IDs; informational, never delete old projects. */
  legacyProjectIds: string[]
  createdAt: string
  updatedAt: string
}

export interface LegacyProjectCandidate {
  projectId: string
  projectName: string
  platform?: SocialPlatform
}

export interface MigrationSuggestion {
  projectId: string
  projectName: string
  suggestedPlatform: SocialPlatform
  suggestedName: string
  requiresIdentityVerification: true
}

/** Candidate discovery is deliberately conservative and never reads credentials. */
export function suggestLegacyAccounts(projects: readonly LegacyProjectCandidate[]): MigrationSuggestion[] {
  return projects.map((project) => ({
    projectId: project.projectId,
    projectName: project.projectName,
    suggestedPlatform: project.platform ?? guessPlatform(project.projectName),
    suggestedName: project.projectName,
    requiresIdentityVerification: true as const,
  }))
}

function guessPlatform(name: string): SocialPlatform {
  if (/微信|视频号|channels/i.test(name)) return 'wechat-channels'
  if (/知乎|zhihu/i.test(name)) return 'zhihu'
  if (/小红书|xiaohongshu|rednote/i.test(name)) return 'xiaohongshu'
  if (/b站|bilibili|哔哩/i.test(name)) return 'bilibili'
  return 'other'
}

function validateId(id: string): void {
  if (!/^[a-zA-Z0-9_-]{1,128}$/.test(id)) throw new Error('Invalid account or profile ID')
}

export function validateAccount(account: BrowserAccount): BrowserAccount {
  validateId(account.id)
  validateId(account.profileId)
  if (account.legacyProfileKey !== undefined && !/^workspace:[^\u0000-\u001f]+$/.test(account.legacyProfileKey)) throw new Error('Invalid legacy workspace profile key')
  if (!account.displayName.trim()) throw new Error('Account name is required')
  if (new Set(account.legacyProjectIds).size !== account.legacyProjectIds.length) {
    throw new Error('Duplicate historical project ID')
  }
  return account
}

/** Prevent two accounts from silently sharing one browser login identity. */
export function assertUniqueProfiles(accounts: readonly BrowserAccount[]): void {
  const accountIds = new Set<string>()
  const profileIds = new Set<string>()
  for (const account of accounts) {
    validateAccount(account)
    if (accountIds.has(account.id) || profileIds.has(account.profileId)) {
      throw new Error('Duplicate account ID or browser profile ID')
    }
    accountIds.add(account.id)
    profileIds.add(account.profileId)
  }
}

/**
 * Explicit session choice only: never automatically fall back to a different
 * account if the requested identity is missing or requires login.
 */
export function resolveAccount(accounts: readonly BrowserAccount[], accountId: string): BrowserAccount {
  assertUniqueProfiles(accounts)
  const account = accounts.find((item) => item.id === accountId)
  if (!account) throw new Error('Browser account not found')
  if (account.status !== 'active') throw new Error('Browser account is not verified and active')
  return account
}

/** App's future browser adapter must supply this immutable partition. */
export function profileKeyForAccount(account: BrowserAccount): string {
  validateAccount(account)
  return account.legacyProfileKey ?? `social-account:${account.profileId}`
}

export function partitionForNewProfile(profileId: string): string {
  validateId(profileId)
  return `social-account:${profileId}`
}
