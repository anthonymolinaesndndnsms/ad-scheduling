import Image from 'next/image'
import { cn } from '@/lib/utils'

/**
 * Kids Next Door badge logo. The source art sits on a black background, so we
 * render it inside a dark rounded tile — this reads as an intentional app icon
 * in both light and dark mode.
 */
export function Logo({
  size = 36,
  className,
  rounded = 'rounded-xl',
}: {
  size?: number
  className?: string
  rounded?: string
}) {
  return (
    <div
      className={cn('relative shrink-0 overflow-hidden bg-black', rounded, className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/logo.png"
        alt="Kids Next Door"
        fill
        sizes={`${size}px`}
        className="object-cover"
        priority
      />
    </div>
  )
}
