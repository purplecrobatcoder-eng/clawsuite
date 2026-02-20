import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'
import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { isAuthenticated } from '../../server/auth-middleware'

// Types
type SessionGroup = {
  id: string
  name: string
  color?: string
  workingDirectory?: string
  contextFile?: string
  customInstructions?: string
  collapsed?: boolean
  createdAt: number
  updatedAt: number
}

type SessionGroupsData = {
  version: number
  groups: Record<string, SessionGroup>
  sessionToGroup: Record<string, string>
  groupOrder: string[]
}

// Storage
const DATA_DIR = join(homedir(), '.openclaw', 'clawsuite')
const GROUPS_FILE = join(DATA_DIR, 'session-groups.json')

const DEFAULT_DATA: SessionGroupsData = {
  version: 1,
  groups: {},
  sessionToGroup: {},
  groupOrder: [],
}

async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

async function loadSessionGroups(): Promise<SessionGroupsData> {
  try {
    await ensureDataDir()
    if (!existsSync(GROUPS_FILE)) {
      return { ...DEFAULT_DATA }
    }
    const raw = await readFile(GROUPS_FILE, 'utf-8')
    const data = JSON.parse(raw) as SessionGroupsData
    return {
      version: data.version ?? 1,
      groups: data.groups ?? {},
      sessionToGroup: data.sessionToGroup ?? {},
      groupOrder: data.groupOrder ?? [],
    }
  } catch (error) {
    console.error('[session-groups] Failed to load:', error)
    return { ...DEFAULT_DATA }
  }
}

async function saveSessionGroups(data: SessionGroupsData): Promise<void> {
  await ensureDataDir()
  await writeFile(GROUPS_FILE, JSON.stringify(data, null, 2), 'utf-8')
}

export const Route = createFileRoute('/api/session-groups')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!(await isAuthenticated(request))) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }
        try {
          const data = await loadSessionGroups()
          return json(data)
        } catch (error) {
          return json(
            { error: error instanceof Error ? error.message : 'Failed to load groups' },
            { status: 500 },
          )
        }
      },

      POST: async ({ request }) => {
        if (!(await isAuthenticated(request))) {
          return json({ error: 'Unauthorized' }, { status: 401 })
        }

        try {
          const body = (await request.json()) as {
            action?: string
            name?: string
            id?: string
            groupId?: string | null
            sessionKey?: string
            groupIds?: string[]
            patch?: Partial<SessionGroup>
            data?: SessionGroupsData
          }

          const action = body.action ?? 'create'
          const data = await loadSessionGroups()

          switch (action) {
            case 'create': {
              if (!body.name) {
                return json({ error: 'Name is required' }, { status: 400 })
              }
              const id = crypto.randomUUID()
              const now = Date.now()
              const group: SessionGroup = {
                id,
                name: body.name.trim() || 'New Group',
                color: body.patch?.color ?? '#3b82f6',
                workingDirectory: body.patch?.workingDirectory,
                contextFile: body.patch?.contextFile,
                customInstructions: body.patch?.customInstructions,
                collapsed: false,
                createdAt: now,
                updatedAt: now,
              }
              data.groups[id] = group
              data.groupOrder.push(id)
              await saveSessionGroups(data)
              return json({ ok: true, group })
            }

            case 'update': {
              if (!body.id || !body.patch) {
                return json({ error: 'id and patch are required' }, { status: 400 })
              }
              const existing = data.groups[body.id]
              if (!existing) {
                return json({ error: 'Group not found' }, { status: 404 })
              }
              data.groups[body.id] = {
                ...existing,
                ...body.patch,
                id: body.id,
                createdAt: existing.createdAt,
                updatedAt: Date.now(),
              }
              await saveSessionGroups(data)
              return json({ ok: true, group: data.groups[body.id] })
            }

            case 'delete': {
              if (!body.id) {
                return json({ error: 'id is required' }, { status: 400 })
              }
              if (!data.groups[body.id]) {
                return json({ error: 'Group not found' }, { status: 404 })
              }
              delete data.groups[body.id]
              data.groupOrder = data.groupOrder.filter((gid) => gid !== body.id)
              for (const [sessionKey, groupId] of Object.entries(data.sessionToGroup)) {
                if (groupId === body.id) {
                  delete data.sessionToGroup[sessionKey]
                }
              }
              await saveSessionGroups(data)
              return json({ ok: true })
            }

            case 'assign': {
              if (!body.sessionKey) {
                return json({ error: 'sessionKey is required' }, { status: 400 })
              }
              if (body.groupId === null || body.groupId === undefined) {
                delete data.sessionToGroup[body.sessionKey]
              } else {
                if (!data.groups[body.groupId]) {
                  return json({ error: 'Group not found' }, { status: 404 })
                }
                data.sessionToGroup[body.sessionKey] = body.groupId
              }
              await saveSessionGroups(data)
              return json({ ok: true })
            }

            case 'reorder': {
              if (!Array.isArray(body.groupIds)) {
                return json({ error: 'groupIds array is required' }, { status: 400 })
              }
              for (const id of body.groupIds) {
                if (!data.groups[id]) {
                  return json({ error: 'Invalid group id' }, { status: 400 })
                }
              }
              data.groupOrder = body.groupIds
              await saveSessionGroups(data)
              return json({ ok: true })
            }

            case 'sync': {
              if (!body.data) {
                return json({ error: 'data is required' }, { status: 400 })
              }
              await saveSessionGroups({
                version: body.data.version ?? 1,
                groups: body.data.groups ?? {},
                sessionToGroup: body.data.sessionToGroup ?? {},
                groupOrder: body.data.groupOrder ?? [],
              })
              return json({ ok: true })
            }

            default:
              return json({ error: `Unknown action: ${action}` }, { status: 400 })
          }
        } catch (error) {
          return json(
            { error: error instanceof Error ? error.message : 'Request failed' },
            { status: 500 },
          )
        }
      },
    },
  },
})
