'use client'

import { HugeiconsIcon } from '@hugeicons/react'
import {
  Cancel01Icon,
  Folder01Icon,
  File01Icon,
  Delete01Icon,
} from '@hugeicons/core-free-icons'
import { useCallback, useEffect, useState } from 'react'
import {
  DialogRoot,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  type SessionGroup,
  GROUP_COLORS,
  useSessionGroupsStore,
} from '@/stores/session-groups-store'
import { cn } from '@/lib/utils'

type GroupSettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  groupId?: string | null
  onSaved?: (groupId: string) => void
  onDeleted?: () => void
}

export function GroupSettingsDialog({
  open,
  onOpenChange,
  groupId,
  onSaved,
  onDeleted,
}: GroupSettingsDialogProps) {
  const groups = useSessionGroupsStore((s) => s.groups)
  const createGroup = useSessionGroupsStore((s) => s.createGroup)
  const updateGroup = useSessionGroupsStore((s) => s.updateGroup)
  const deleteGroup = useSessionGroupsStore((s) => s.deleteGroup)

  const existingGroup = groupId ? groups[groupId] : null
  const isEditing = Boolean(existingGroup)

  const [name, setName] = useState('')
  const [color, setColor] = useState<string>(GROUP_COLORS[0])
  const [workingDirectory, setWorkingDirectory] = useState('')
  const [contextFile, setContextFile] = useState('')
  const [customInstructions, setCustomInstructions] = useState('')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    if (open) {
      if (existingGroup) {
        setName(existingGroup.name)
        setColor(existingGroup.color ?? GROUP_COLORS[0])
        setWorkingDirectory(existingGroup.workingDirectory ?? '')
        setContextFile(existingGroup.contextFile ?? '')
        setCustomInstructions(existingGroup.customInstructions ?? '')
      } else {
        setName('')
        setColor(GROUP_COLORS[Math.floor(Math.random() * GROUP_COLORS.length)])
        setWorkingDirectory('')
        setContextFile('')
        setCustomInstructions('')
      }
      setShowDeleteConfirm(false)
    }
  }, [open, existingGroup])

  const handleSave = useCallback(() => {
    const trimmedName = name.trim()
    if (!trimmedName) return

    const groupData: Partial<SessionGroup> = {
      name: trimmedName,
      color,
      workingDirectory: workingDirectory.trim() || undefined,
      contextFile: contextFile.trim() || undefined,
      customInstructions: customInstructions.trim() || undefined,
    }

    if (isEditing && groupId) {
      updateGroup(groupId, groupData)
      onSaved?.(groupId)
    } else {
      const newId = createGroup(trimmedName, groupData)
      onSaved?.(newId)
    }

    onOpenChange(false)
  }, [
    name,
    color,
    workingDirectory,
    contextFile,
    customInstructions,
    isEditing,
    groupId,
    createGroup,
    updateGroup,
    onSaved,
    onOpenChange,
  ])

  const handleDelete = useCallback(() => {
    if (!groupId) return
    deleteGroup(groupId)
    onDeleted?.()
    onOpenChange(false)
  }, [groupId, deleteGroup, onDeleted, onOpenChange])

  const handleSelectFolder = useCallback(async () => {
    // For now, use a simple prompt. Tauri file dialog can be added when running in Tauri.
    const path = window.prompt('Enter folder path:', workingDirectory)
    if (path !== null) setWorkingDirectory(path)
  }, [workingDirectory])

  const canSave = name.trim().length > 0

  return (
    <DialogRoot open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <div className="flex items-start justify-between mb-4">
          <div>
            <DialogTitle className="text-lg font-semibold">
              {isEditing ? 'Edit Group' : 'Create Group'}
            </DialogTitle>
            <DialogDescription className="text-sm text-primary-500 mt-0.5">
              {isEditing
                ? 'Update group settings'
                : 'Create a group to organize sessions by project'}
            </DialogDescription>
          </div>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-primary-500 hover:text-primary-700"
          >
            <HugeiconsIcon icon={Cancel01Icon} size={20} strokeWidth={1.5} />
          </Button>
        </div>

        <div className="space-y-4">
          <div>
            <label htmlFor="group-name" className="block text-sm font-medium text-primary-700 mb-1.5">
              Name
            </label>
            <input
              id="group-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="My Project"
              className="w-full rounded-lg border border-primary-200 bg-surface px-3 py-2 text-sm placeholder:text-primary-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-primary-700 mb-1.5">Color</label>
            <div className="flex gap-2 flex-wrap">
              {GROUP_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    'size-7 rounded-full transition-all',
                    color === c ? 'ring-2 ring-offset-2 ring-primary-400 scale-110' : 'hover:scale-105',
                  )}
                  style={{ backgroundColor: c }}
                  aria-label={`Select color ${c}`}
                />
              ))}
            </div>
          </div>

          <div>
            <label htmlFor="working-directory" className="block text-sm font-medium text-primary-700 mb-1.5">
              <HugeiconsIcon icon={Folder01Icon} size={14} strokeWidth={1.5} className="inline mr-1.5 -mt-0.5" />
              Working Directory
            </label>
            <div className="flex gap-2">
              <input
                id="working-directory"
                type="text"
                value={workingDirectory}
                onChange={(e) => setWorkingDirectory(e.target.value)}
                placeholder="/path/to/project"
                className="flex-1 rounded-lg border border-primary-200 bg-surface px-3 py-2 text-sm placeholder:text-primary-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 font-mono text-xs"
              />
              <Button size="sm" variant="outline" onClick={handleSelectFolder} className="shrink-0">
                Browse
              </Button>
            </div>
            <p className="text-xs text-primary-400 mt-1">
              New sessions in this group will use this as the working directory
            </p>
          </div>

          <div>
            <label htmlFor="context-file" className="block text-sm font-medium text-primary-700 mb-1.5">
              <HugeiconsIcon icon={File01Icon} size={14} strokeWidth={1.5} className="inline mr-1.5 -mt-0.5" />
              Context File <span className="text-primary-400 font-normal">(optional)</span>
            </label>
            <input
              id="context-file"
              type="text"
              value={contextFile}
              onChange={(e) => setContextFile(e.target.value)}
              placeholder="PROJECT_CONTEXT.md"
              className="w-full rounded-lg border border-primary-200 bg-surface px-3 py-2 text-sm placeholder:text-primary-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 font-mono text-xs"
            />
            <p className="text-xs text-primary-400 mt-1">
              Relative to working directory. Contents will be read and injected into new sessions.
            </p>
          </div>

          <div>
            <label htmlFor="custom-instructions" className="block text-sm font-medium text-primary-700 mb-1.5">
              Custom Instructions <span className="text-primary-400 font-normal">(optional)</span>
            </label>
            <textarea
              id="custom-instructions"
              value={customInstructions}
              onChange={(e) => setCustomInstructions(e.target.value)}
              placeholder="Focus on React components. Use TypeScript..."
              rows={3}
              className="w-full rounded-lg border border-primary-200 bg-surface px-3 py-2 text-sm placeholder:text-primary-400 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-6 pt-4 border-t border-primary-100">
          <div>
            {isEditing && !showDeleteConfirm && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <HugeiconsIcon icon={Delete01Icon} size={16} strokeWidth={1.5} className="mr-1.5" />
                Delete Group
              </Button>
            )}
            {isEditing && showDeleteConfirm && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-red-600">Delete this group?</span>
                <Button size="sm" variant="ghost" onClick={() => setShowDeleteConfirm(false)} className="text-primary-600">
                  Cancel
                </Button>
                <Button size="sm" variant="ghost" onClick={handleDelete} className="text-red-600 hover:bg-red-50">
                  Delete
                </Button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={!canSave}>
              {isEditing ? 'Save Changes' : 'Create Group'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </DialogRoot>
  )
}
