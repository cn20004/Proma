import { app } from 'electron'
import { mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import {
  assertUniqueProfiles, profileKeyForAccount, resolveAccount,
  type BrowserAccount,
} from './social-account-registry'

/**
 * Local account metadata storage. No cookies, tokens, passwords or page data
 * are stored in this file. Original Chromium profile partitions are untouched.
 */
export class SocialAccountStore {
  constructor(private readonly filename = join(app.getPath('userData'), 'social-browser-accounts.json')) {}

  list(): BrowserAccount[] {
    let data: string
    try { data = readFileSync(this.filename, 'utf8') }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return []
      throw error
    }
    const parsed: unknown = JSON.parse(data)
    if (!Array.isArray(parsed)) throw new Error('Invalid account registry format')
    const accounts = parsed as BrowserAccount[]
    assertUniqueProfiles(accounts)
    return accounts
  }

  save(accounts: BrowserAccount[]): void {
    assertUniqueProfiles(accounts)
    mkdirSync(dirname(this.filename), { recursive: true })
    const tmp = this.filename + '.tmp'
    writeFileSync(tmp, JSON.stringify(accounts, null, 2) + '\n', { encoding: 'utf8', mode: 0o600 })
    renameSync(tmp, this.filename)
  }

  upsert(account: BrowserAccount): BrowserAccount[] {
    const previous = this.list()
    const next = [...previous.filter((item) => item.id !== account.id), account]
    this.save(next)
    return next
  }

  remove(accountId: string): BrowserAccount[] {
    const next = this.list().filter((account) => account.id !== accountId)
    this.save(next)
    // Deliberately never delete any Electron session partition on account removal.
    return next
  }

  profileKey(accountId: string): string {
    return profileKeyForAccount(resolveAccount(this.list(), accountId))
  }
}
