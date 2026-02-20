import { useCallback, useEffect, useMemo, useState } from 'react'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowDown01Icon,
  Chat01Icon,
  FolderOpenIcon,
  Settings01Icon,
} from '@hugeicons/core-free-icons'
import { AnimatePresence, motion } from 'motion/react'
import type { SessionMeta } from '@/screens/chat/types'
import { cn } from '@/lib/utils'
import {
  useSessionGroupsStore,
  selectAllGroups,
  type SessionGroup,
} from '@/stores/session-groups-store'
import { GroupSettingsDialog } from '@/screens/chat/components/sidebar/group-settings-dialog'

type Props = {
  open: boolean
  onClose: () => void
  sessions: Array<SessionMeta>
  activeFriendlyId: string
  onSelectSession: (key: string) => void
  onNewChat: (groupId?: string) => void
}

function normalizeLabel(value: string | undefined): string {
  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : ''
}

function getSessionTitle(session: SessionMeta): string {
  const label = normalizeLabel(session.label)
  if (label) return label
  const derivedTitle = normalizeLabel(session.derivedTitle)
  if (derivedTitle) return derivedTitle
  const title = normalizeLabel(session.title)
  if (title) return title
  return `Session ${session.friendlyId.slice(0, 8)}`
}

const dayFormatter = new Intl.DateTimeFormat(undefined, {
  month: 'short',
  day: 'numeric',
})

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: 'numeric',
  minute: '2-digit',
})

function formatUpdatedAt(updatedAt?: number): string {
  if (typeof updatedAt !== 'number') return ''
  const value = new Date(updatedAt)
  const now = new Date()
  if (value.toDateString() === now.toDateString()) {
    return timeFormatter.format(value)
  }
  return dayFormatter.format(value)
}

function SessionButton({
  session,
  active,
  onSelect,
}: {
  session: SessionMeta
  active: boolean
  onSelect: () => void
}) {
  const timestamp = formatUpdatedAt(session.updatedAt)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full rounded-lg border px-3 py-2.5 text-left transition-colors touch-manipulation',
        active
          ? 'border-accent-300 bg-accent-50'
          : 'border-transparent bg-primary-50 hover:border-primary-200 active:bg-primary-100',
      )}
    >
      <div className="truncate text-sm font-medium text-ink">
        {getSessionTitle(session)}
      </div>
      <div className="mt-0.5 flex items-center justify-between gap-2 text-[11px] text-primary-500">
        <span className="truncate">{session.friendlyId}</span>
        {timestamp ? <span>{timestamp}</span> : null}
      </div>
    </button>
  )
}

function GroupSection({
  group,
  sessions,
  activeFriendlyId,
  onSelectSession,
  onNewChat,
  onEditGroup,
}: {
  group: SessionGroup
  sessions: Array<SessionMeta>
  activeFriendlyId: string
  onSelectSession: (key: string) => void
  onNewChat: (groupId: string) => void
  onEditGroup: (groupId: string) => void
}) {
  const toggleGroupCollapsed = useSessionGroupsStore((s) => s.toggleGroupCollapsed)
  const isCollapsed = group.collapsed ?? false

  const handleToggle = useCallback(() => {
    toggleGroupCollapsed(group.id)
  }, [group.id, toggleGroupCollapsed])

  return (
    <div className="mb-2">
      <div
        className="flex items-center gap-2 px-2 py-2.5 rounded-lg hover:bg-primary-100 active:bg-primary-150 transition-colors cursor-pointer touch-manipulation"
        role="button"
        tabIndex={0}
        onClick={handleToggle}
      >
        <span
          className="size-3 rounded-full shrink-0"
          style={{ backgroundColor: group.color }}
        />
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          strokeWidth={2}
          className={cn(
            'text-primary-400 transition-transform duration-150 shrink-0',
            isCollapsed ? '-rotate-90' : 'rotate-0',
          )}
        />
        <span className="flex-1 text-sm font-medium text-primary-800 truncate">
          {group.name}
        </span>
        <span className="text-[11px] text-primary-400 tabular-nums mr-1">
          {sessions.length}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onNewChat(group.id)
          }}
          className="p-2 rounded hover:bg-primary-200 active:bg-primary-300 text-primary-500 transition-colors touch-manipulation"
          aria-label={`New session in ${group.name}`}
        >
          <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={1.5} />
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onEditGroup(group.id)
          }}
          className="p-2 rounded hover:bg-primary-200 active:bg-primary-300 text-primary-500 transition-colors touch-manipulation"
          aria-label={`Settings for ${group.name}`}
        >
          <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.5} />
        </button>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="pl-4 pr-1 py-1 space-y-1">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <SessionButton
                    key={session.key}
                    session={session}
                    active={session.friendlyId === activeFriendlyId}
                    onSelect={() => onSelectSession(session.friendlyId)}
                  />
                ))
              ) : (
                <div className="px-3 py-3 text-xs text-primary-400 text-center">
                  No sessions yet
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function MobileSessionsPanel({
  open,
  onClose,
  sessions,
  activeFriendlyId,
  onSelectSession,
  onNewChat,
}: Props) {
  const groups = useSessionGroupsStore(selectAllGroups)
  const sessionToGroup = useSessionGroupsStore((s) => s.sessionToGroup)

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null)

  const sessionsByGroup = useMemo(() => {
    const map = new Map<string, Array<SessionMeta>>()
    for (const group of groups) {
      map.set(group.id, [])
    }
    for (const session of sessions) {
      const groupId = sessionToGroup[session.key]
      if (groupId && map.has(groupId)) {
        map.get(groupId)!.push(session)
      }
    }
    return map
  }, [sessions, groups, sessionToGroup])

  const ungroupedSessions = useMemo(() => {
    return sessions.filter((session) => !sessionToGroup[session.key])
  }, [sessions, sessionToGroup])

  const handleSelectSession = useCallback(
    (key: string) => {
      onSelectSession(key)
      onClose()
    },
    [onSelectSession, onClose],
  )

  const handleNewChat = useCallback(
    (groupId?: string) => {
      onNewChat(groupId)
      onClose()
    },
    [onNewChat, onClose],
  )

  const handleCreateGroup = useCallback(() => {
    setEditingGroupId(null)
    setSettingsOpen(true)
  }, [])

  const handleEditGroup = useCallback((groupId: string) => {
    setEditingGroupId(groupId)
    setSettingsOpen(true)
  }, [])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <>
      <div className="fixed inset-0 z-[85] no-swipe md:hidden">
        <button
          type="button"
          className="absolute inset-0 bg-black/40 animate-in fade-in duration-200"
          aria-label="Close sessions panel"
          onClick={onClose}
        />

        <aside className="no-swipe absolute inset-y-0 left-0 w-[85vw] max-w-sm border-r border-primary-200 bg-white shadow-2xl animate-in slide-in-from-left-8 duration-200 dark:border-gray-700 dark:bg-gray-900">
          <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b border-primary-200 px-4 py-3 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-ink">Sessions</h2>
              <button
                type="button"
                onClick={() => handleNewChat()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-primary-200 bg-primary-50 px-3 py-2 text-xs font-medium text-primary-700 transition-colors hover:border-accent-200 hover:text-accent-600 active:bg-primary-100 touch-manipulation"
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.8} />
                New Chat
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {/* Groups Section */}
              {groups.length > 0 && (
                <div className="mb-3">
                  <div className="flex items-center gap-1.5 px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-primary-500">
                    <HugeiconsIcon icon={FolderOpenIcon} size={12} strokeWidth={2} />
                    <span>Groups</span>
                    <button
                      type="button"
                      onClick={handleCreateGroup}
                      className="ml-auto p-1 rounded hover:bg-primary-200 transition-colors"
                      aria-label="Create group"
                    >
                      <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} className="text-primary-500" />
                    </button>
                  </div>
                  {groups.map((group) => (
                    <GroupSection
                      key={group.id}
                      group={group}
                      sessions={sessionsByGroup.get(group.id) ?? []}
                      activeFriendlyId={activeFriendlyId}
                      onSelectSession={handleSelectSession}
                      onNewChat={handleNewChat}
                      onEditGroup={handleEditGroup}
                    />
                  ))}
                </div>
              )}

              {/* Create group prompt if no groups */}
              {groups.length === 0 && (
                <div className="mb-3 px-2 py-3 text-center border border-dashed border-primary-200 rounded-lg">
                  <p className="text-xs text-primary-500 mb-2">Organize sessions by project</p>
                  <button
                    type="button"
                    onClick={handleCreateGroup}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-600 bg-accent-50 hover:bg-accent-100 active:bg-accent-150 rounded-lg transition-colors touch-manipulation"
                  >
                    <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.5} />
                    Create Group
                  </button>
                </div>
              )}

              {/* Ungrouped Sessions */}
              <div>
                <div className="px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-primary-500">
                  <span>{groups.length > 0 ? 'Ungrouped' : 'All Sessions'}</span>
                </div>
                {ungroupedSessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 px-3 py-6 text-center text-primary-500">
                    <HugeiconsIcon icon={Chat01Icon} size={24} strokeWidth={1.6} />
                    <p className="text-sm">No sessions yet.</p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    {ungroupedSessions.map((session) => (
                      <SessionButton
                        key={session.key}
                        session={session}
                        active={session.friendlyId === activeFriendlyId}
                        onSelect={() => handleSelectSession(session.friendlyId)}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      <GroupSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        groupId={editingGroupId}
      />
    </>
  )
}
