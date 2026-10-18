import { copy } from '../../lib/copy'

export type SelectableMode = 'online' | 'offline' | 'tidak_ada'

interface ModeSelectorProps {
  value: SelectableMode | null
  onChange: (mode: SelectableMode) => void
  disabled?: boolean
}

const OPTIONS: Array<{ value: SelectableMode; label: string }> = [
  { value: 'online', label: copy.mode.online },
  { value: 'offline', label: copy.mode.offline },
  { value: 'tidak_ada', label: copy.mode.tidak_ada },
]

export function ModeSelector({ value, onChange, disabled }: ModeSelectorProps) {
  return (
    <div className="grid grid-cols-1 gap-3">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.value)}
            className={`w-full min-h-12 px-4 border text-left font-medium text-sm flex items-center justify-between transition-colors disabled:opacity-50 ${
              selected
                ? 'border-neutral-900 bg-neutral-900 text-white'
                : 'border-neutral-900 bg-white text-neutral-900 hover:bg-neutral-100'
            }`}
          >
            <span>{opt.label}</span>
            {selected && <span className="text-xs font-mono">● Dipilih</span>}
          </button>
        )
      })}
    </div>
  )
}