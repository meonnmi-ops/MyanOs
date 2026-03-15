'use client'

import React from 'react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { DesktopIcons } from './Desktop'
import { Window } from './Window'
import { Taskbar } from './Taskbar'

interface MyanOSDesktopProps {
  onOpenAdmin?: () => void
  isAdmin?: boolean
}

const wallpaperStyles: Record<string, React.CSSProperties> = {
  gradient: { background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e1e3f 100%)' },
  sunset: { background: 'linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7c3aed 100%)' },
  ocean: { background: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #1e3a5f 100%)' },
  forest: { background: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%)' },
  dark: { background: 'linear-gradient(135deg, #18181b 0%, #09090b 50%, #18181b 100%)' },
  purple: { background: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 50%, #2e1065 100%)' },
}

export function MyanOSDesktop({ onOpenAdmin, isAdmin }: MyanOSDesktopProps) {
  const { windows, wallpaper } = useMyanOSStore()

  // Store admin callbacks in window for apps to access
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__myanos_admin = { onOpenAdmin, isAdmin }
    }
  }, [onOpenAdmin, isAdmin])

  return (
    <div 
      className="relative w-full h-screen overflow-hidden"
      style={wallpaperStyles[wallpaper] || wallpaperStyles.gradient}
    >
      {/* Desktop Icons */}
      <DesktopIcons />

      {/* Windows */}
      {windows.map((win) => (
        <Window key={win.id} window={win} />
      ))}

      {/* Taskbar */}
      <Taskbar />
    </div>
  )
}
