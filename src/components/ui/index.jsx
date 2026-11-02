import { cn } from '@/lib/utils'

// ─── GlassChip ───────────────────────────────────────────────────────────────
export function GlassChip({ children, className }) {
  return (
    <span className={cn('chip inline-flex items-center gap-2', className)}>
      {children}
    </span>
  )
}

// ─── SectionLabel ────────────────────────────────────────────────────────────
export function SectionLabel({ children, className }) {
  return (
    <p className={cn('section-label', className)}>
      {children}
    </p>
  )
}

// ─── GoldDivider ─────────────────────────────────────────────────────────────
export function GoldDivider({ className }) {
  return (
    <div
      className={cn('h-px w-16 bg-champagne-gold', className)}
      role="separator"
      aria-hidden="true"
    />
  )
}

// ─── PrimaryButton ───────────────────────────────────────────────────────────
export function PrimaryButton({ children, href, onClick, className, type = 'button' }) {
  const cls = cn('btn-primary inline-block', className)

  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  )
}

// ─── GhostButton ─────────────────────────────────────────────────────────────
export function GhostButton({ children, href, onClick, className, type = 'button' }) {
  const cls = cn('btn-ghost inline-block', className)

  if (href) {
    return (
      <a href={href} className={cls}>
        {children}
      </a>
    )
  }

  return (
    <button type={type} onClick={onClick} className={cls}>
      {children}
    </button>
  )
}

export { DevelopmentBadge } from './DevelopmentBadge'
export { default as VerticalDotNav, DEFAULT_HOME_SECTIONS } from './VerticalDotNav'
