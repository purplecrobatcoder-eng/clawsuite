import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SessionGroup = {
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

export type SessionGroupsData = {
  groups: Record<string, SessionGroup>
  sessionToGroup: Record<string, string>
  groupOrder: string[]
}

export type SessionGroupsState = SessionGroupsData & {
  /** Whether data has been synced from server */
  synced: boolean
  /** Whether sync is in progress */
  syncing: boolean
  /** Last sync error */
  syncError: string | null

  // Actions
  createGroup: (name: string, options?: Partial<SessionGroup>) => string
  updateGroup: (id: string, patch: Partial<SessionGroup>) => void
  deleteGroup: (id: string) => void
  reorderGroups: (groupIds: string[]) => void
  toggleGroupCollapsed: (id: string) => void
  assignSession: (sessionKey: string, groupId: string | null) => void
  getGroupForSession: (sessionKey: string) => SessionGroup | null
  getSessionKeysInGroup: (groupId: string) => string[]

  // Sync
  loadFromServer: () => Promise<void>
  syncToServer: () => Promise<void>
}

export const GROUP_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
] as const

function generateId(): string {
  return crypto.randomUUID()
}

function pickRandomColor(): string {
  return GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)]
}

async function fetchGroups(): Promise<SessionGroupsData | null> {
  try {
    const res = await fetch('/api/session-groups')
    if (!res.ok) return null
    const data = await res.json()
    return {
      groups: data.groups ?? {},
      sessionToGroup: data.sessionToGroup ?? {},
      groupOrder: data.groupOrder ?? [],
    }
  } catch {
    return null
  }
}

async function postGroupAction(
  action: string,
  payload: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await fetch('/api/session-groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, ...payload }),
    })
    return res.ok
  } catch {
    return false
  }
}

export const useSessionGroupsStore = create<SessionGroupsState>()(
  persist(
    (set, get) => ({
      groups: {},
      sessionToGroup: {},
      groupOrder: [],
      synced: false,
      syncing: false,
      syncError: null,

      createGroup: (name, options = {}) => {
        const id = generateId()
        const now = Date.now()
        const group: SessionGroup = {
          id,
          name: name.trim() || 'New Group',
          color: options.color ?? pickRandomColor(),
          workingDirectory: options.workingDirectory,
          contextFile: options.contextFile,
          customInstructions: options.customInstructions,
          collapsed: false,
          createdAt: now,
          updatedAt: now,
        }

        set((state) => ({
          groups: { ...state.groups, [id]: group },
          groupOrder: [...state.groupOrder, id],
        }))

        // Sync to server in background
        postGroupAction('create', { name, patch: options }).catch(() => {
          // Already created locally, server sync failed - will retry on next full sync
        })

        return id
      },

      updateGroup: (id, patch) => {
        set((state) => {
          const existing = state.groups[id]
          if (!existing) return state

          return {
            groups: {
              ...state.groups,
              [id]: {
                ...existing,
                ...patch,
                id,
                createdAt: existing.createdAt,
                updatedAt: Date.now(),
              },
            },
          }
        })

        postGroupAction('update', { id, patch })
      },

      deleteGroup: (id) => {
        set((state) => {
          const { [id]: _, ...remainingGroups } = state.groups
          const updatedSessionToGroup: Record<string, string> = {}
          for (const [sessionKey, groupId] of Object.entries(state.sessionToGroup)) {
            if (groupId !== id) {
              updatedSessionToGroup[sessionKey] = groupId
            }
          }
          return {
            groups: remainingGroups,
            sessionToGroup: updatedSessionToGroup,
            groupOrder: state.groupOrder.filter((gid) => gid !== id),
          }
        })

        postGroupAction('delete', { id })
      },

      reorderGroups: (groupIds) => {
        set({ groupOrder: groupIds })
        postGroupAction('reorder', { groupIds })
      },

      toggleGroupCollapsed: (id) => {
        const state = get()
        const existing = state.groups[id]
        if (!existing) return

        const collapsed = !existing.collapsed
        set({
          groups: {
            ...state.groups,
            [id]: { ...existing, collapsed },
          },
        })

        postGroupAction('update', { id, patch: { collapsed } })
      },

      assignSession: (sessionKey, groupId) => {
        set((state) => {
          if (groupId === null) {
            const { [sessionKey]: _, ...rest } = state.sessionToGroup
            return { sessionToGroup: rest }
          }
          if (!state.groups[groupId]) return state
          return {
            sessionToGroup: { ...state.sessionToGroup, [sessionKey]: groupId },
          }
        })

        postGroupAction('assign', { sessionKey, groupId })
      },

      getGroupForSession: (sessionKey) => {
        const state = get()
        const groupId = state.sessionToGroup[sessionKey]
        if (!groupId) return null
        return state.groups[groupId] ?? null
      },

      getSessionKeysInGroup: (groupId) => {
        const state = get()
        return Object.entries(state.sessionToGroup)
          .filter(([, gid]) => gid === groupId)
          .map(([sessionKey]) => sessionKey)
      },

      loadFromServer: async () => {
        set({ syncing: true, syncError: null })
        try {
          const data = await fetchGroups()
          if (data) {
            set({
              groups: data.groups,
              sessionToGroup: data.sessionToGroup,
              groupOrder: data.groupOrder,
              synced: true,
              syncing: false,
            })
          } else {
            // Server unavailable, use local data
            set({ syncing: false })
          }
        } catch (error) {
          set({
            syncing: false,
            syncError: error instanceof Error ? error.message : 'Sync failed',
          })
        }
      },

      syncToServer: async () => {
        const state = get()
        set({ syncing: true, syncError: null })
        try {
          const success = await postGroupAction('sync', {
            data: {
              version: 1,
              groups: state.groups,
              sessionToGroup: state.sessionToGroup,
              groupOrder: state.groupOrder,
            },
          })
          set({ syncing: false, synced: success })
          if (!success) {
            set({ syncError: 'Failed to sync to server' })
          }
        } catch (error) {
          set({
            syncing: false,
            syncError: error instanceof Error ? error.message : 'Sync failed',
          })
        }
      },
    }),
    {
      name: 'openclaw-session-groups-v1',
      partialize: (state) => ({
        groups: state.groups,
        sessionToGroup: state.sessionToGroup,
        groupOrder: state.groupOrder,
      }),
      onRehydrateStorage: () => (state) => {
        // After loading from localStorage, try to sync with server
        if (state) {
          // Delay to let the app initialize
          setTimeout(() => {
            state.loadFromServer()
          }, 1000)
        }
      },
    },
  ),
)

// Initialize: load from server when store is first accessed
if (typeof window !== 'undefined') {
  // Check if we have local data to migrate
  const localData = localStorage.getItem('openclaw-session-groups-v1')
  if (localData) {
    try {
      const parsed = JSON.parse(localData)
      if (parsed.state?.groups && Object.keys(parsed.state.groups).length > 0) {
        // Has local data, will sync to server on rehydrate
      }
    } catch {
      // ignore
    }
  }
}
