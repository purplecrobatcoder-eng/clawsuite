'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  Add01Icon,
  ArrowDown01Icon,
  FolderOpenIcon,
  Settings01Icon,
} from '@hugeicons/core-free-icons'
import { memo, useCallback, useMemo, useState } from 'react'
import { Link } from '@tanstack/react-router'
import { AnimatePresence, motion } from 'motion/react'
import { SessionItem } from './session-item'
import { GroupSettingsDialog } from './group-settings-dialog'
import type { SessionMeta } from '../../types'
import {
  useSessionGroupsStore,
  selectAllGroups,
  type SessionGroup,
} from '@/stores/session-groups-store'
import {
  Collapsible,
  CollapsiblePanel,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  TooltipContent,
  TooltipProvider,
  TooltipRoot,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

type SidebarGroupsProps = {
  sessions: Array<SessionMeta>
  activeFriendlyId: string
  onSelect?: () => void
  onRename: (session: SessionMeta) => void
  onDelete: (session: SessionMeta) => void
  onTogglePin: (session: SessionMeta) => void
  pinnedSessionKeys: Set<string>
}

type GroupItemProps = {
  group: SessionGroup
  sessions: Array<SessionMeta>
  activeFriendlyId: string
  onSelect?: () => void
  onRename: (session: SessionMeta) => void
  onDelete: (session: SessionMeta) => void
  onTogglePin: (session: SessionMeta) => void
  pinnedSessionKeys: Set<string>
  onEditGroup: (groupId: string) => void
}

function GroupItemComponent({
  group,
  sessions,
  activeFriendlyId,
  onSelect,
  onRename,
  onDelete,
  onTogglePin,
  pinnedSessionKeys,
  onEditGroup,
}: GroupItemProps) {
  const toggleGroupCollapsed = useSessionGroupsStore((s) => s.toggleGroupCollapsed)
  const isCollapsed = group.collapsed ?? false

  const handleToggle = useCallback(() => {
    toggleGroupCollapsed(group.id)
  }, [group.id, toggleGroupCollapsed])

  return (
    <div className="mb-1">
      <div
        className="group flex items-center gap-1.5 px-2 py-2.5 md:py-1.5 rounded-lg hover:bg-primary-100 active:bg-primary-150 transition-colors cursor-pointer touch-manipulation"
        role="button"
        tabIndex={0}
        onClick={handleToggle}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            handleToggle()
          }
        }}
      >
        <span className="size-3 md:size-2.5 rounded-full shrink-0" style={{ backgroundColor: group.color }} />
        <HugeiconsIcon
          icon={ArrowDown01Icon}
          size={14}
          strokeWidth={2}
          className={cn(
            'text-primary-400 transition-transform duration-150 shrink-0 md:size-3',
            isCollapsed ? '-rotate-90' : 'rotate-0',
          )}
        />
        <span className="flex-1 text-sm font-medium text-primary-800 truncate select-none">
          {group.name}
        </span>
        <span className="text-[11px] md:text-[10px] text-primary-400 tabular-nums">{sessions.length}</span>

        {/* Actions - always visible on mobile, hover on desktop */}
        <div
          className="flex items-center gap-1 md:gap-0.5 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
          onClick={(e) => e.stopPropagation()}
        >
          <TooltipProvider>
            <TooltipRoot>
              <TooltipTrigger
                render={
                  <Link
                    to="/chat/$sessionKey"
                    params={{ sessionKey: 'new' }}
                    search={{ group: group.id }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelect?.()
                    }}
                    className="p-2 md:p-1 rounded hover:bg-primary-200 active:bg-primary-300 text-primary-500 hover:text-primary-700 transition-colors touch-manipulation"
                    aria-label={`New session in ${group.name}`}
                  >
                    <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.5} />
                  </Link>
                }
              />
              <TooltipContent side="top">New session</TooltipContent>
            </TooltipRoot>
          </TooltipProvider>

          <TooltipProvider>
            <TooltipRoot>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEditGroup(group.id)
                    }}
                    className="p-2 md:p-1 rounded hover:bg-primary-200 active:bg-primary-300 text-primary-500 hover:text-primary-700 transition-colors touch-manipulation"
                    aria-label={`Settings for ${group.name}`}
                  >
                    <HugeiconsIcon icon={Settings01Icon} size={16} strokeWidth={1.5} className="md:size-3.5" />
                  </button>
                }
              />
              <TooltipContent side="top">Group settings</TooltipContent>
            </TooltipRoot>
          </TooltipProvider>
        </div>
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
            <div className="pl-4 pr-1 py-0.5 space-y-px">
              {sessions.length > 0 ? (
                sessions.map((session) => (
                  <SessionItem
                    key={session.key}
                    session={session}
                    active={session.friendlyId === activeFriendlyId}
                    isPinned={pinnedSessionKeys.has(session.key)}
                    onSelect={onSelect}
                    onTogglePin={onTogglePin}
                    onRename={onRename}
                    onDelete={onDelete}
                    groupId={group.id}
                  />
                ))
              ) : (
                <div className="px-2 py-3 text-xs text-primary-400 text-center">
                  No sessions yet.{' '}
                  <Link
                    to="/chat/$sessionKey"
                    params={{ sessionKey: 'new' }}
                    search={{ group: group.id }}
                    onClick={onSelect}
                    className="text-accent-500 hover:underline"
                  >
                    Create one
                  </Link>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

const GroupItem = memo(GroupItemComponent)

export function SidebarGroups({
  sessions,
  activeFriendlyId,
  onSelect,
  onRename,
  onDelete,
  onTogglePin,
  pinnedSessionKeys,
}: SidebarGroupsProps) {
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

  const handleCreateGroup = useCallback(() => {
    setEditingGroupId(null)
    setSettingsOpen(true)
  }, [])

  const handleEditGroup = useCallback((groupId: string) => {
    setEditingGroupId(groupId)
    setSettingsOpen(true)
  }, [])

  if (groups.length === 0) {
    return (
      <>
        <Collapsible className="w-full" defaultOpen>
          <CollapsibleTrigger className="w-full flex items-center gap-1.5 rounded-none px-5 pt-3 pb-1 shrink-0 text-[10px] font-semibold uppercase tracking-wider hover:bg-transparent data-panel-open:text-primary-500">
            <HugeiconsIcon icon={FolderOpenIcon} size={12} strokeWidth={2} className="text-primary-400" />
            <span className="select-none">Groups</span>
            <span className="ml-auto p-0.5 rounded hover:bg-primary-200 transition-colors">
              <HugeiconsIcon
                icon={ArrowDown01Icon}
                size={12}
                strokeWidth={2}
                className="text-primary-500 transition-transform duration-150 -rotate-90 group-data-panel-open:rotate-0"
              />
            </span>
          </CollapsibleTrigger>
          <CollapsiblePanel>
            <div className="px-3 py-4 text-center">
              <p className="text-xs text-primary-500 mb-2">Organize sessions by project</p>
              <button
                type="button"
                onClick={handleCreateGroup}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-accent-600 bg-accent-50 hover:bg-accent-100 rounded-lg transition-colors"
              >
                <HugeiconsIcon icon={Add01Icon} size={14} strokeWidth={1.5} />
                Create Group
              </button>
            </div>
          </CollapsiblePanel>
        </Collapsible>

        <GroupSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} groupId={editingGroupId} />
      </>
    )
  }

  return (
    <>
      <Collapsible className="w-full" defaultOpen>
        <CollapsibleTrigger className="w-full flex items-center gap-1.5 rounded-none px-5 pt-3 pb-1 shrink-0 text-[10px] font-semibold uppercase tracking-wider hover:bg-transparent data-panel-open:text-primary-500">
          <HugeiconsIcon icon={FolderOpenIcon} size={12} strokeWidth={2} className="text-primary-400" />
          <span className="select-none">Groups</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              handleCreateGroup()
            }}
            className="ml-auto p-0.5 rounded hover:bg-primary-200 transition-colors"
            aria-label="Create group"
          >
            <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={2} className="text-primary-500" />
          </button>
          <span className="p-0.5 rounded hover:bg-primary-200 transition-colors">
            <HugeiconsIcon
              icon={ArrowDown01Icon}
              size={12}
              strokeWidth={2}
              className="text-primary-500 transition-transform duration-150 -rotate-90 group-data-panel-open:rotate-0"
            />
          </span>
        </CollapsibleTrigger>
        <CollapsiblePanel>
          <div className="px-2 py-1">
            {groups.map((group) => (
              <GroupItem
                key={group.id}
                group={group}
                sessions={sessionsByGroup.get(group.id) ?? []}
                activeFriendlyId={activeFriendlyId}
                onSelect={onSelect}
                onRename={onRename}
                onDelete={onDelete}
                onTogglePin={onTogglePin}
                pinnedSessionKeys={pinnedSessionKeys}
                onEditGroup={handleEditGroup}
              />
            ))}
          </div>
        </CollapsiblePanel>
      </Collapsible>

      <GroupSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} groupId={editingGroupId} />
    </>
  )
}
