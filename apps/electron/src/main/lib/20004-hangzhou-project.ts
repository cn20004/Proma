import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigDir } from './config-paths'
import type { HangzhouProjectDashboard, HangzhouStudentInput, HangzhouStudentRecord, HangzhouChannelInput, HangzhouChannelRecord, HangzhouContentInput, HangzhouContentRecord, HangzhouIntelligenceInput, HangzhouIntelligenceRecord } from '../../types'
import { randomUUID } from 'node:crypto'

interface HangzhouProjectData {
  version: 1
  students: HangzhouStudentRecord[]
  channels: HangzhouChannelRecord[]
  contentItems: HangzhouContentRecord[]
  intelligenceItems: HangzhouIntelligenceRecord[]
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


export function listHangzhouChannels(): HangzhouChannelRecord[] {
  return readData().channels.slice().sort((a, b) => b.updatedAt - a.updatedAt)
}
export function createHangzhouChannel(input: HangzhouChannelInput): HangzhouChannelRecord {
  const data = readData()
  const now = Date.now()
  const record: HangzhouChannelRecord = { ...input, id: randomUUID(), createdAt: now, updatedAt: now }
  data.channels.unshift(record); data.updatedAt = now
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return record
}
export function updateHangzhouChannel(id: string, updates: Partial<HangzhouChannelInput>): HangzhouChannelRecord {
  const data = readData()
  const index = data.channels.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('渠道档案不存在')
  const current = data.channels[index]!
  const updated: HangzhouChannelRecord = { ...current, ...updates, id: current.id, createdAt: current.createdAt, updatedAt: Date.now() }
  data.channels[index] = updated; data.updatedAt = updated.updatedAt
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return updated
}
export function deleteHangzhouChannel(id: string): void {
  const data = readData()
  data.channels = data.channels.filter((item) => item.id !== id)
  data.updatedAt = Date.now()
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function listHangzhouContent(): HangzhouContentRecord[] {
  return readData().contentItems.slice().sort((a, b) => b.updatedAt - a.updatedAt)
}
export function createHangzhouContent(input: HangzhouContentInput): HangzhouContentRecord {
  const data = readData(); const now = Date.now()
  const record: HangzhouContentRecord = { ...input, id: randomUUID(), createdAt: now, updatedAt: now }
  data.contentItems.unshift(record); data.updatedAt = now
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return record
}
export function updateHangzhouContent(id: string, updates: Partial<HangzhouContentInput>): HangzhouContentRecord {
  const data = readData(); const index = data.contentItems.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('内容资产不存在')
  const current = data.contentItems[index]!
  const updated: HangzhouContentRecord = { ...current, ...updates, id: current.id, createdAt: current.createdAt, updatedAt: Date.now() }
  data.contentItems[index] = updated; data.updatedAt = updated.updatedAt
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return updated
}
export function deleteHangzhouContent(id: string): void {
  const data = readData(); data.contentItems = data.contentItems.filter((item) => item.id !== id); data.updatedAt = Date.now()
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function listHangzhouIntelligence(): HangzhouIntelligenceRecord[] {
  return readData().intelligenceItems.slice().sort((a, b) => b.updatedAt - a.updatedAt)
}
export function createHangzhouIntelligence(input: HangzhouIntelligenceInput): HangzhouIntelligenceRecord {
  const data = readData(); const now = Date.now()
  const record: HangzhouIntelligenceRecord = { ...input, id: randomUUID(), createdAt: now, updatedAt: now }
  data.intelligenceItems.unshift(record); data.updatedAt = now
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return record
}
export function updateHangzhouIntelligence(id: string, updates: Partial<HangzhouIntelligenceInput>): HangzhouIntelligenceRecord {
  const data = readData(); const index = data.intelligenceItems.findIndex((item) => item.id === id)
  if (index < 0) throw new Error('情报记录不存在')
  const current = data.intelligenceItems[index]!
  const updated: HangzhouIntelligenceRecord = { ...current, ...updates, id: current.id, createdAt: current.createdAt, updatedAt: Date.now() }
  data.intelligenceItems[index] = updated; data.updatedAt = updated.updatedAt
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return updated
}
export function deleteHangzhouIntelligence(id: string): void {
  const data = readData(); data.intelligenceItems = data.intelligenceItems.filter((item) => item.id !== id); data.updatedAt = Date.now()
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}
