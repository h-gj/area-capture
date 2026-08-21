import type { ReactNode } from 'react'

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button'
}: {
  children: ReactNode
  onClick?: () => void
  variant?: 'primary' | 'outline' | 'ghost'
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  const cls =
    variant === 'primary'
      ? 'bg-primary text-primary-foreground hover:opacity-90'
      : variant === 'outline'
        ? 'border border-border bg-background hover:bg-accent'
        : 'hover:bg-accent text-foreground'
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition disabled:opacity-50 ${cls}`}
    >
      {children}
    </button>
  )
}
