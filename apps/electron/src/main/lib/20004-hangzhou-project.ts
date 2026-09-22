import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigDir } from './config-paths'
import type { HangzhouProjectDashboard } from '../../types'

interface HangzhouStudent {
  id: string
  name: string
  stage?: 'lead' | 'appointment' | 'arrived' | 'trial' | 'signed'
  intent?: 'low' | 'medium' | 'high'
  nextFollowUpAt?: number
}

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
  students: HangzhouStudent[]
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
