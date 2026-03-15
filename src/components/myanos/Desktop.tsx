'use client'

import React from 'react'
import { useMyanOSStore, APPS } from '@/stores/myanos-store'

export function DesktopIcons() {
  const { openWindow, showDesktopIcons, language } = useMyanOSStore()

  if (!showDesktopIcons) return null

  return (
    <div className="absolute top-4 left-4 grid grid-cols-1 gap-1">
      {APPS.map((app) => (
        <button
          key={app.id}
          className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-white/10 transition-colors group w-20"
          onDoubleClick={() => openWindow(app.id)}
        >
          <div className="w-12 h-12 flex items-center justify-center text-3xl bg-slate-800/60 rounded-lg group-hover:bg-slate-700/80 transition-colors backdrop-blur-sm border border-slate-600/50">
            {app.icon}
          </div>
          <span className="text-xs text-white text-center drop-shadow-lg leading-tight">
            {language === 'mm' ? app.titleMM : app.title}
          </span>
        </button>
      ))}
    </div>
  )
}
