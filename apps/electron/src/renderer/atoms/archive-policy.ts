import { atom } from 'jotai'
import type { ArchivePolicy } from '@proma/shared'
export const archivePolicyAtom = atom<ArchivePolicy>({ projects: {}, sessions: {}, batches: [] })
export const archiveCenterAtom = atom<{ open: boolean; projectId?: string; showLogs?: boolean }>({ open: false })
