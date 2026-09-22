import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { getConfigDir } from './config-paths'
import type { HangzhouProjectDashboard, HangzhouStudentInput, HangzhouStudentRecord, HangzhouChannelInput, HangzhouChannelRecord, HangzhouContentInput, HangzhouContentRecord, HangzhouIntelligenceInput, HangzhouIntelligenceRecord, HangzhouStudentPriority, HangzhouSchoolInput, HangzhouSchoolRecord, HangzhouCallReviewInput, HangzhouCallReviewRecord, HangzhouContractCheckInput, HangzhouContractCheckRecord, HangzhouCompetitorInput, HangzhouCompetitorRecord, HangzhouDailyBrief } from '../../types'
import { randomUUID } from 'node:crypto'

interface HangzhouProjectData {
  version: 2
  students: HangzhouStudentRecord[]
  channels: HangzhouChannelRecord[]
  contentItems: HangzhouContentRecord[]
  intelligenceItems: HangzhouIntelligenceRecord[]
  schools: HangzhouSchoolRecord[]
  callReviews: HangzhouCallReviewRecord[]
  contractChecks: HangzhouContractCheckRecord[]
  competitors: HangzhouCompetitorRecord[]
  updatedAt: number
}

function getDataPath(): string {
  return join(getConfigDir(), '20004-hangzhou.json')
}

function emptyData(): HangzhouProjectData {
  return {
    version: 2,
    students: [],
    channels: [],
    contentItems: [],
    intelligenceItems: [],
    schools: [],
    callReviews: [],
    contractChecks: [],
    competitors: [],
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
      version: 2,
      students: Array.isArray(parsed.students) ? parsed.students : [],
      channels: Array.isArray(parsed.channels) ? parsed.channels : [],
      contentItems: Array.isArray(parsed.contentItems) ? parsed.contentItems : [],
      intelligenceItems: Array.isArray(parsed.intelligenceItems) ? parsed.intelligenceItems : [],
      schools: Array.isArray(parsed.schools) ? parsed.schools : [],
      callReviews: Array.isArray(parsed.callReviews) ? parsed.callReviews : [],
      contractChecks: Array.isArray(parsed.contractChecks) ? parsed.contractChecks : [],
      competitors: Array.isArray(parsed.competitors) ? parsed.competitors : [],
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


function priorityForStudent(student: HangzhouStudentRecord, now = Date.now()): HangzhouStudentPriority {
  let score = 0
  const reasons: string[] = []

  if (student.intent === 'high') { score += 35; reasons.push('高意向') }
  else if (student.intent === 'medium') { score += 18; reasons.push('中等意向') }
  else score += 5

  const stageScore: Record<HangzhouStudentRecord['stage'], number> = {
    lead: 5,
    appointment: 20,
    arrived: 28,
    trial: 35,
    signed: 0,
  }
  score += stageScore[student.stage]
  if (student.stage !== 'signed') reasons.push('当前阶段：' + student.stage)

  if (typeof student.nextFollowUpAt === 'number') {
    const overdueHours = (now - student.nextFollowUpAt) / 3_600_000
    if (overdueHours >= 24) { score += 25; reasons.push('跟进已逾期超过24小时') }
    else if (overdueHours >= 0) { score += 18; reasons.push('已到跟进时间') }
    else if (overdueHours >= -24) { score += 8; reasons.push('24小时内需跟进') }
  }

  if (student.concern?.trim()) {
    score += 8
    reasons.push('存在明确顾虑')
  }

  score = Math.max(0, Math.min(100, score))
  const level: HangzhouStudentPriority['level'] =
    score >= 80 ? 'urgent' : score >= 60 ? 'high' : score >= 35 ? 'normal' : 'low'

  let nextAction = '保持常规跟进'
  if (student.stage === 'trial') nextAction = '优先确认试听反馈、决策人和签约障碍'
  else if (student.stage === 'arrived') nextAction = '优先推进试听安排并记录现场异议'
  else if (student.stage === 'appointment') nextAction = '确认到校时间、交通和决策人'
  else if (student.intent === 'high') nextAction = '尽快解决核心顾虑并明确下一步行动'
  if (student.concern) nextAction += '；重点处理：' + student.concern

  return { studentId: student.id, score, level, reasons, nextAction }
}

export function getHangzhouStudentPriorities(): HangzhouStudentPriority[] {
  const data = readData()
  return data.students
    .filter((student) => student.stage !== 'signed')
    .map((student) => priorityForStudent(student))
    .sort((a, b) => b.score - a.score)
}

export function getHangzhouDailyBrief(): HangzhouDailyBrief {
  const data = readData()
  const now = Date.now()
  const priorities = data.students
    .filter((student) => student.stage !== 'signed')
    .map((student) => priorityForStudent(student, now))
    .sort((a, b) => b.score - a.score)

  const overdueFollowUps = data.students.filter((student) => (
    student.stage !== 'signed' &&
    typeof student.nextFollowUpAt === 'number' &&
    student.nextFollowUpAt <= now
  )).length
  const highIntentStudents = data.students.filter((student) => student.intent === 'high' && student.stage !== 'signed').length
  const channelsNeedingAttention = data.channels.filter((channel) => channel.registrations > 0 && channel.arrivals === 0).length
  const unpublishedContent = data.contentItems.filter((item) => item.status !== 'published').length
  const intelligenceToVerify = data.intelligenceItems.filter((item) => item.confidence === 'C' || item.confidence === 'D').length
  const schoolsInProgress = data.schools.filter((school) => school.status !== 'uncontacted' && school.status !== 'cooperating').length

  const summary: string[] = []
  if (overdueFollowUps > 0) summary.push(overdueFollowUps + ' 个学生已到或超过跟进时间')
  if (highIntentStudents > 0) summary.push(highIntentStudents + ' 个高意向学生值得优先处理')
  if (channelsNeedingAttention > 0) summary.push(channelsNeedingAttention + ' 个渠道有报名但尚无到校')
  if (unpublishedContent > 0) summary.push(unpublishedContent + ' 条内容仍处于选题/脚本/已拍阶段')
  if (intelligenceToVerify > 0) summary.push(intelligenceToVerify + ' 条情报仍需要交叉验证')
  if (schoolsInProgress > 0) summary.push(schoolsInProgress + ' 所学校渠道正在推进中')

  return {
    generatedAt: now,
    urgentStudents: priorities.filter((item) => item.level === 'urgent' || item.level === 'high').slice(0, 10),
    overdueFollowUps,
    highIntentStudents,
    channelsNeedingAttention,
    unpublishedContent,
    intelligenceToVerify,
    schoolsInProgress,
    competitorsTracked: data.competitors.length,
    summary,
  }
}

export function listHangzhouSchools(): HangzhouSchoolRecord[] {
  return readData().schools.slice().sort((a, b) => b.updatedAt - a.updatedAt)
}
export function createHangzhouSchool(input: HangzhouSchoolInput): HangzhouSchoolRecord {
  const data = readData(); const now = Date.now()
  const record: HangzhouSchoolRecord = { ...input, id: randomUUID(), createdAt: now, updatedAt: now }
  data.schools.unshift(record); data.updatedAt = now
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return record
}
export function deleteHangzhouSchool(id: string): void {
  const data = readData(); data.schools = data.schools.filter((item) => item.id !== id); data.updatedAt = Date.now()
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function listHangzhouCallReviews(): HangzhouCallReviewRecord[] {
  return readData().callReviews.slice().sort((a, b) => b.updatedAt - a.updatedAt)
}
export function createHangzhouCallReview(input: HangzhouCallReviewInput): HangzhouCallReviewRecord {
  const data = readData(); const now = Date.now()
  const record: HangzhouCallReviewRecord = { ...input, id: randomUUID(), createdAt: now, updatedAt: now }
  data.callReviews.unshift(record); data.updatedAt = now
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return record
}
export function deleteHangzhouCallReview(id: string): void {
  const data = readData(); data.callReviews = data.callReviews.filter((item) => item.id !== id); data.updatedAt = Date.now()
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function listHangzhouContractChecks(): HangzhouContractCheckRecord[] {
  return readData().contractChecks.slice().sort((a, b) => b.updatedAt - a.updatedAt)
}
export function createHangzhouContractCheck(input: HangzhouContractCheckInput): HangzhouContractCheckRecord {
  const data = readData(); const now = Date.now()
  const record: HangzhouContractCheckRecord = { ...input, id: randomUUID(), createdAt: now, updatedAt: now }
  data.contractChecks.unshift(record); data.updatedAt = now
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return record
}
export function deleteHangzhouContractCheck(id: string): void {
  const data = readData(); data.contractChecks = data.contractChecks.filter((item) => item.id !== id); data.updatedAt = Date.now()
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}

export function listHangzhouCompetitors(): HangzhouCompetitorRecord[] {
  return readData().competitors.slice().sort((a, b) => b.updatedAt - a.updatedAt)
}
export function createHangzhouCompetitor(input: HangzhouCompetitorInput): HangzhouCompetitorRecord {
  const data = readData(); const now = Date.now()
  const record: HangzhouCompetitorRecord = { ...input, id: randomUUID(), createdAt: now, updatedAt: now }
  data.competitors.unshift(record); data.updatedAt = now
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
  return record
}
export function deleteHangzhouCompetitor(id: string): void {
  const data = readData(); data.competitors = data.competitors.filter((item) => item.id !== id); data.updatedAt = Date.now()
  writeFileSync(getDataPath(), JSON.stringify(data, null, 2), 'utf-8')
}
