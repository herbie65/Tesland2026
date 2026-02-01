'use client'

import React from 'react'

interface PageHeaderProps {
  title: string
  children?: React.ReactNode
}

export default function PageHeader({ title, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
      <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  )
}
