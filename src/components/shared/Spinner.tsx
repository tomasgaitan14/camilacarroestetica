interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZE_CLASSES = {
  sm: 'h-4 w-4 border-2',
  md: 'h-8 w-8 border-2',
  lg: 'h-12 w-12 border-4',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <div
      className={`rounded-full border-brand-200 border-t-brand-500 animate-spin ${SIZE_CLASSES[size]} ${className}`}
      role="status"
      aria-label="Cargando"
    />
  )
}

export function FullPageSpinner() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-neutral-50">
      <Spinner size="lg" />
    </div>
  )
}
