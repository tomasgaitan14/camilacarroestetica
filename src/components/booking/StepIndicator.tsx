interface StepIndicatorProps {
  current: number
  total: number
}

const STEP_LABELS = ['Servicio', 'Horario', 'Confirmar']

export function StepIndicator({ current, total }: StepIndicatorProps) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => (
        <div key={i} className="flex items-center gap-2 flex-1">
          <div className={`flex-1 h-1.5 rounded-full transition-colors ${i < current ? 'bg-brand-500' : 'bg-neutral-200'}`} />
        </div>
      ))}
      <span className="text-xs text-neutral-500 whitespace-nowrap">
        {current}/{total} — {STEP_LABELS[current - 1]}
      </span>
    </div>
  )
}
