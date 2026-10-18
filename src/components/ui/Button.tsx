import React from 'react'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost' | 'default'
  size?: 'sm' | 'md' | 'lg'
  isLoading?: boolean
  loading?: boolean
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loading = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isBusy = isLoading || loading
    const actualVariant = variant === 'default' ? 'primary' : variant

    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none min-h-[44px]'

    const sizeStyles = {
      sm: 'px-3 py-2 text-xs min-w-[44px]',
      md: 'px-4 py-2.5 text-sm min-w-[44px]',
      lg: 'px-6 py-3 text-base min-w-[44px]',
    }[size]

    const variantStyles = {
      primary:
        'bg-neutral-900 text-white hover:bg-neutral-800 focus:ring-neutral-900 active:bg-black',
      secondary:
        'bg-neutral-100 text-neutral-900 hover:bg-neutral-200 focus:ring-neutral-400 active:bg-neutral-300',
      danger:
        'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 active:bg-rose-800',
      outline:
        'border border-neutral-300 text-neutral-800 bg-white hover:bg-neutral-50 focus:ring-neutral-500 active:bg-neutral-100',
      ghost:
        'text-neutral-700 hover:bg-neutral-100 focus:ring-neutral-400 active:bg-neutral-200',
    }[actualVariant]

    return (
      <button
        ref={ref}
        disabled={disabled || isBusy}
        className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
        {...props}
      >
        {isBusy ? (
          <span className="flex items-center gap-2">
            <svg
              className="animate-spin h-4 w-4 text-current"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              ></circle>
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              ></path>
            </svg>
            <span>Memuat...</span>
          </span>
        ) : (
          children
        )}
      </button>
    )
  }
)
Button.displayName = 'Button'
