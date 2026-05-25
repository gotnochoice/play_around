import fs from 'fs'
import path from 'path'

const SESSIONS_DIR = path.join(process.cwd(), 'data', 'sessions')

function ensureDir() {
  if (!fs.existsSync(SESSIONS_DIR)) {
    fs.mkdirSync(SESSIONS_DIR, { recursive: true })
  }
}

export interface SessionLog {
  sessionId: string
  startedAt: string
  completedAt: string
  businessType: string | null
  businessName: string | null
  founderName: string | null
  currency: string | null
  stageReached: number
  completed: boolean
  assumptions: Record<string, unknown>
  messages: {
    role: 'user' | 'assistant'
    content: string
    timestamp: string
    feedback?: 'up' | 'down'
  }[]
}

export function writeSession(session: SessionLog): void {
  try {
    ensureDir()
    const file = path.join(SESSIONS_DIR, `${session.sessionId}.json`)
    fs.writeFileSync(file, JSON.stringify(session, null, 2))
  } catch {
    // Non-fatal
  }
}

export function writeFeedback(sessionId: string, messageIndex: number, feedback: 'up' | 'down'): void {
  try {
    ensureDir()
    const file = path.join(SESSIONS_DIR, `${sessionId}.json`)
    if (!fs.existsSync(file)) return
    const session: SessionLog = JSON.parse(fs.readFileSync(file, 'utf-8'))
    if (session.messages[messageIndex]) {
      session.messages[messageIndex].feedback = feedback
    }
    fs.writeFileSync(file, JSON.stringify(session, null, 2))
  } catch {
    // Non-fatal
  }
}

export function listSessions(): SessionLog[] {
  try {
    ensureDir()
    return fs
      .readdirSync(SESSIONS_DIR)
      .filter((f) => f.endsWith('.json'))
      .map((f) => JSON.parse(fs.readFileSync(path.join(SESSIONS_DIR, f), 'utf-8')) as SessionLog)
      .sort((a, b) => b.completedAt.localeCompare(a.completedAt))
  } catch {
    return []
  }
}

export function buildFewShotExamples(businessType?: string, limit = 3): string {
  const sessions = listSessions()
    .filter((s) => s.completed && s.stageReached >= 4)
    .filter((s) => !businessType || s.businessType === businessType)
    .slice(0, limit)

  if (sessions.length === 0) return ''

  const examples = sessions.map((s) => {
    const exchanges = s.messages
      .filter((m) => !m.content.includes('<meta>'))
      .slice(0, 12)
      .map((m) => `${m.role === 'user' ? 'Founder' : 'Deck'}: ${m.content.slice(0, 300)}`)
      .join('\n')
    return `--- Example (${s.businessType ?? 'unknown'}, ${s.currency ?? ''}) ---\n${exchanges}`
  })

  return `\n\n---\nREAL CONVERSATION EXAMPLES (use these to calibrate tone and question depth):\n${examples.join('\n\n')}`
}
