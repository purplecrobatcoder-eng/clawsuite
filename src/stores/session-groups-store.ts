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

export type SessionGroupsState = {
  groups: Record<string, SessionGroup>
  sessionToGroup: Record<string, string>
  groupOrder: string[]

  createGroup: (name: string, options?: Partial<SessionGroup>) => string
  updateGroup: (id: string, patch: Partial<SessionGroup>) => void
  deleteGroup: (id: string) => void
  reorderGroups: (groupIds: string[]) => void
  toggleGroupCollapsed: (id: string) => void
  assignSession: (sessionKey: string, groupId: string | null) => void
  getGroupForSession: (sessionKey: string) => SessionGroup | null
  getSessionKeysInGroup: (groupId: string) => string[]
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

export const useSessionGroupsStore = create<SessionGroupsState>()(
  persist(
    (set, get) => ({
      groups: {},
      sessionToGroup: {},
      groupOrder: [],

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
      },

      reorderGroups: (groupIds) => {
        set({ groupOrder: groupIds })
      },

      toggleGroupCollapsed: (id) => {
        set((state) => {
          const existing = state.groups[id]
          if (!existing) return state
          return {
            groups: {
              ...state.groups,
              [id]: { ...existing, collapsed: !existing.collapsed },
            },
          }
        })
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
    }),
    {
      name: 'openclaw-session-groups-v1',
      partialize: (state) => ({
        groups: state.groups,
        sessionToGroup: state.sessionToGroup,
        groupOrder: state.groupOrder,
      }),
    },
  ),
)

export function selectAllGroups(state: SessionGroupsState): SessionGroup[] {
  return state.groupOrder
    .map((id) => state.groups[id])
    .filter((g): g is SessionGroup => g !== undefined)
}
