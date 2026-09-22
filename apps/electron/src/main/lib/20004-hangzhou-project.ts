import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigDir } from './config-paths'
import type { HangzhouProjectDashboard, HangzhouStudentInput, HangzhouStudentRecord } from '../../types'
import { randomUUID } from 'node:crypto'

interface HangzhouChannel {
  id: string
  name: string
}

interface HangzhouContentItem {
  id: string
  title: string
  status?: 'idea' | 'script' | 'shot' | 'published'
}

interface HangzhouIntelligenceItem {
  id: string
  title: string
  confidence?: 'A' | 'B' | 'C' | 'D'
}

interface HangzhouProjectData {
  version: 1
  students: HangzhouStudentRecord[]
  channels: HangzhouChannel[]
  contentItems: HangzhouContentItem[]
  intelligenceItems: HangzhouIntelligenceItem[]
  updatedAt: number
}

function getDataPath(): string {
  return join(getConfigDir(), '20004-hangzhou.json')
}

function emptyData(): HangzhouProjectData {
  return {
    version: 1,
    students: [],
    channels: [],
    contentItems: [],
    intelligenceItems: [],
    updatedAt: Date.now(),
  }
}

function readData(): HangzhouProjectData {
  const path = getDataPath()
  if (!existsSync(path)) {
    const data = emptyData()
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8')
    return data
  }

  try {
    const parsed = JSON.parse(readFileSync(path, 'utf-8')) as Partial<HangzhouProjectData>
    return {
      version: 1,
      students: Array.isArray(parsed.students) ? parsed.students : [],
      channels: Array.isArray(parsed.channels) ? parsed.channels : [],
      contentItems: Array.isArray(parsed.contentItems) ? parsed.contentItems : [],
      intelligenceItems: Array.isArray(parsed.intelligenceItems) ? parsed.intelligenceItems : [],
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    }
  } catch (error) {
    console.warn('[20004 杭州项目] 数据文件读取失败，使用空数据:', error)
    return emptyData()
  }
}

export function getHangzhouProjectDashboard(): HangzhouProjectDashboard {
  const data = readData()
  const now = Date.now()
  return {
    dataPath: getDataPath(),
    students: data.students.length,
    channels: data.channels.length,
    contentItems: data.contentItems.length,
    intelligenceItems: data.intelligenceItems.length,
    highIntentStudents: data.students.filter((student) => student.intent === 'high').length,
    pendingFollowUps: data.students.filter((student) => (
      typeof student.nextFollowUpAt === 'number' && student.nextFollowUpAt <= now
    )).length,
    updatedAt: data.updatedAt,
  }
}


export function listHangzhouStudents(): HangzhouStudentRecord[] {
  return readData().students.slice().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function createHangzhouStudent(input: HangzhouStudentInput): HangzhouStudentRecord {
  const data = readData()
  const now = Date.now()
  const record: HangzhouStudentRecord = {
    ...input,
    id: randomUUID(),
    createdAt: now,
    updatedAt: now,
  }
  data.students.unshift(record)
  data.updatedAt = now
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return record
}

export function updateHangzhouStudent(
  id: string,
  updates: Partial<HangzhouStudentInput>,
): HangzhouStudentRecord {
  const data = readData()
  const index = data.students.findIndex((student) => student.id === id)
  if (index < 0) throw new Error('学生档案不存在')
  const current = data.students[index]!
  const updated: HangzhouStudentRecord = {
    ...current,
    ...updates,
    id: current.id,
    createdAt: current.createdAt,
    updatedAt: Date.now(),
  }
  data.students[index] = updated
  data.updatedAt = updated.updatedAt
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return updated
}

export function deleteHangzhouStudent(id: string): void {
  const data = readData()
  const next = data.students.filter((student) => student.id !== id)
  if (next.length === data.students.length) return
  data.students = next
  data.updatedAt = Date.now()
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}
