'use client'

import React, { useState, useEffect } from 'react'
import { useMyanOSStore, APPS, WindowState } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { 
  Menu, X, Cpu, Wifi, Battery, Volume2, LogOut, User, Sparkles
} from 'lucide-react'
import type { MyanosUser } from './LoginPanel'

interface TaskbarProps {
  user: MyanosUser
  onLogout: () => void
}

export function Taskbar({ user, onLogout }: TaskbarProps) {
  const { windows, activeWindowId, startMenuOpen, toggleStartMenu, focusWindow, minimizeWindow, language, openWindow } = useMyanOSStore()
  const [time, setTime] = useState(new Date())
  const [showUserMenu, setShowUserMenu] = useState(false)

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

  // Apps that regular users can access (no database)
  const isAppAllowed = (appId: string) => {
    const restrictedApps = ['database']
    return !restrictedApps.includes(appId)
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 h-11 bg-slate-900/95 backdrop-blur-md border-t border-slate-700 flex items-center px-2 z-[9999]">
      {/* Start Button */}
      <Button
        variant="ghost"
        size="sm"
        className={`h-8 px-2 ${startMenuOpen ? 'bg-slate-700' : 'hover:bg-slate-800'}`}
        onClick={toggleStartMenu}
      >
        {startMenuOpen ? (
          <X className="w-4 h-4 text-slate-300" />
        ) : (
          <Menu className="w-4 h-4 text-slate-300" />
        )}
        <span className="ml-1.5 text-sm font-medium text-slate-200">MyanOS</span>
      </Button>

      {/* Open Windows */}
      <div className="flex-1 flex items-center gap-1 px-2 overflow-x-auto">
        {windows.map((win: WindowState) => {
          const app = APPS.find(a => a.id === win.appId)
          return (
            <button
              key={win.id}
              className={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors ${
                activeWindowId === win.id
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-700'
              }`}
              onClick={() => focusWindow(win.id)}
            >
              <span>{app?.icon}</span>
              <span className="truncate max-w-20">
                {language === 'mm' ? win.titleMM : win.title}
              </span>
            </button>
          )
        })}
      </div>

      {/* AI Credits */}
      <div className="flex items-center gap-1 px-2 text-xs text-amber-400">
        <Sparkles className="w-3 h-3" />
        <span>{user.aiCredits}</span>
      </div>

      {/* System Tray */}
      <div className="flex items-center gap-2 px-2">
        <div className="flex items-center gap-1 text-slate-400">
          <Wifi className="w-3.5 h-3.5" />
          <Volume2 className="w-3.5 h-3.5" />
          <Battery className="w-3.5 h-3.5" />
        </div>
        <div className="text-right text-xs text-slate-300">
          <div suppressHydrationWarning>{formatTime(time)}</div>
        </div>
      </div>

      {/* User */}
      <div className="relative ml-1">
        <button
          onClick={() => setShowUserMenu(!showUserMenu)}
          className="flex items-center gap-1.5 px-1.5 py-1 rounded hover:bg-slate-700 transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-cyan-600 flex items-center justify-center">
            <User className="w-3.5 h-3.5 text-white" />
          </div>
        </button>

        {showUserMenu && (
          <div className="absolute bottom-9 right-0 w-40 bg-slate-800 border border-slate-700 rounded-lg shadow-xl overflow-hidden">
            <div className="p-2 border-b border-slate-700">
              <p className="text-xs text-white">{user.name}</p>
              <p className="text-[10px] text-slate-400">{user.email}</p>
            </div>
            <button
              onClick={() => { setShowUserMenu(false); onLogout() }}
              className="w-full px-2 py-1.5 text-left text-xs text-red-400 hover:bg-slate-700 flex items-center gap-1.5"
            >
              <LogOut className="w-3 h-3" />
              Logout
            </button>
          </div>
        )}
      </div>

      {/* Start Menu */}
      {startMenuOpen && (
        <div className="absolute bottom-11 left-2 w-64 bg-slate-900/95 backdrop-blur-md border border-slate-700 rounded-lg shadow-2xl overflow-hidden">
          <div className="p-3 bg-gradient-to-r from-emerald-600/20 to-cyan-600/20 border-b border-slate-700">
            <h2 className="text-base font-bold text-white">MyanOS</h2>
            <p className="text-[10px] text-slate-400">
              {language === 'mm' ? 'မြန်မာ့ ဝဘ် ကွန်ပျူတာစနစ်' : 'Web Operating System'}
            </p>
          </div>

          <div className="p-2">
            <div className="grid grid-cols-4 gap-0.5">
              {APPS.filter(app => isAppAllowed(app.id)).map((app) => (
                <button
                  key={app.id}
                  className="flex flex-col items-center gap-0.5 p-1.5 rounded hover:bg-slate-700 transition-colors"
                  onClick={() => { openWindow(app.id); toggleStartMenu() }}
                >
                  <span className="text-xl">{app.icon}</span>
                  <span className="text-[10px] text-slate-300 text-center">
                    {language === 'mm' ? app.titleMM : app.title}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="px-2 py-1.5 bg-amber-600/10 border-t border-slate-700">
            <p className="text-[10px] text-amber-400">⚠️ AI usage limited. Admin has full access.</p>
          </div>

          <div className="p-2 border-t border-slate-700 flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] text-slate-400">
              <Cpu className="w-3 h-3" />
              <span>z-ai-web-dev-sdk</span>
            </div>
            <span className="text-[10px] text-slate-500">v1.0</span>
          </div>
        </div>
      )}
    </div>
  )
}
