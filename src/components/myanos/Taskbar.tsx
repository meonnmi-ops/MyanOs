'use client'

import React, { useState, useEffect } from 'react'
import { useMyanOSStore, APPS } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { 
  Menu, 
  X, 
  Clock, 
  Cpu,
  Wifi,
  Battery,
  Volume2
} from 'lucide-react'

export function Taskbar() {
  const { windows, activeWindowId, startMenuOpen, toggleStartMenu, focusWindow, minimizeWindow, language } = useMyanOSStore()
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString(language === 'mm' ? 'my-MM' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(language === 'mm' ? 'my-MM' : 'en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-12 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 flex items-center px-2 z-[9999]">
      {/* Start Menu Button */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-9 px-3 ${startMenuOpen ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
        onClick={toggleStartMenu}
      >
        {startMenuOpen ? (
          <X className="w-4 h-4 text-slate-300" />
        ) : (
          <Menu className="w-4 h-4 text-slate-300" />
        )}
        <span className="ml-2 text-sm font-medium text-slate-200">
          MyanOS
        </span>
      </Button>

      {/* Open Windows */}
      <div className="flex-1 flex items-center gap-1 px-2 overflow-x-auto">
        {windows.map((win) => {
          const app = APPS.find(a => a.id === win.appId)
          return (
            <button
              key={win.id}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors min-w-0 ${
                activeWindowId === win.id
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
              }`}
              onClick={() => {
                if (win.isMinimized) {
                  focusWindow(win.id)
                } else if (activeWindowId === win.id) {
                  minimizeWindow(win.id)
                } else {
                  focusWindow(win.id)
                }
              }}
            >
              <span className="text-base">{app?.icon}</span>
              <span className="truncate max-w-24">
                {language === 'mm' ? win.titleMM : win.title}
              </span>
            </button>
          )
        })}
      </div>

      {/* System Tray */}
      <div className="flex items-center gap-2 px-2">
        <div className="flex items-center gap-1 text-slate-400">
          <Wifi className="w-4 h-4" />
          <Volume2 className="w-4 h-4" />
          <Battery className="w-4 h-4" />
        </div>
        <div className="text-right text-xs text-slate-300">
          <div>{formatTime(time)}</div>
          <div className="text-slate-500">{formatDate(time)}</div>
        </div>
      </div>

      {/* Start Menu Dropdown */}
      {startMenuOpen && (
        <div className="absolute bottom-12 left-2 w-72 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-4 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-b border-slate-700">
            <h2 className="text-lg font-bold text-white">MyanOS</h2>
            <p className="text-xs text-slate-400">
              {language === 'mm' ? 'မြန်မာ့ ဝဘ် ကွန်ပျူတာစနစ်' : 'Web Operating System for Myanmar'}
            </p>
          </div>

          {/* Apps Grid */}
          <div className="p-2">
            <div className="grid grid-cols-4 gap-1">
              {APPS.map((app) => (
                <button
                  key={app.id}
                  className="flex flex-col items-center gap-1 p-2 rounded-lg hover:bg-slate-700 transition-colors"
                  onClick={() => {
                    useMyanOSStore.getState().openWindow(app.id)
                    toggleStartMenu()
                  }}
                >
                  <span className="text-2xl">{app.icon}</span>
                  <span className="text-xs text-slate-300 text-center">
                    {language === 'mm' ? app.titleMM : app.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="p-2 border-t border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Cpu className="w-3 h-3" />
              <span>z-ai-web-dev-sdk</span>
            </div>
            <div className="text-xs text-slate-500">
              v1.0
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
