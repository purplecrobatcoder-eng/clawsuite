import { memo } from 'react'
import { cn } from '@/lib/utils'

type AvatarProps = {
  size?: number
  className?: string
}

/**
 * Assistant avatar — Crobat with sunglasses
 */
function AssistantAvatarComponent({ size = 28, className }: AvatarProps) {
  return (
    <img
      src="/ai-avatar.png"
      alt="Assistant"
      className={cn('shrink-0 rounded-full object-cover', className)}
      style={{ width: size, height: size }}
    />
  )
}

export const AssistantAvatar = memo(AssistantAvatarComponent)
