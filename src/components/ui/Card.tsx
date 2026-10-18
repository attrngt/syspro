import React from 'react'

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-xl border border-neutral-200/80 shadow-xs overflow-hidden transition-all duration-200 hover:shadow-md ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`p-4 sm:p-5 border-b border-neutral-100 flex items-start justify-between gap-4 ${className}`}>
      <div>
        <h3 className="font-semibold text-neutral-900 text-base sm:text-lg">{title}</h3>
        {subtitle && <p className="text-xs sm:text-sm text-neutral-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div>{action}</div>}
    </div>
  )
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-4 sm:p-5 ${className}`}>{children}</div>
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`p-4 sm:p-5 bg-neutral-50/70 border-t border-neutral-100 flex items-center justify-end gap-3 ${className}`}>
      {children}
    </div>
  )
}
