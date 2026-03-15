'use client'

import React, { useState, useRef, useCallback } from 'react'
import { useMyanOSStore, WindowState } from '@/stores/myanos-store'
import { TerminalApp } from './apps/TerminalApp'
import { AIAgentApp } from './apps/AIAgentApp'
import { PhoneRepairApp } from './apps/PhoneRepairApp'
import { CalculatorApp } from './apps/CalculatorApp'
import { NotepadApp } from './apps/NotepadApp'
import { FileManagerApp } from './apps/FileManagerApp'
import { SettingsApp } from './apps/SettingsApp'
import { DatabaseApp } from './apps/DatabaseApp'
import { X, Minus, Square, Maximize2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WindowProps {
  window: WindowState
}

export function Window({ window: win }: WindowProps) {
  const { 
    closeWindow, 
    minimizeWindow, 
    maximizeWindow, 
    focusWindow,
    updateWindowPosition,
    activeWindowId
  } = useMyanOSStore()

  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const windowRef = useRef<HTMLDivElement>(null)

  const isActive = activeWindowId === win.id

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as HTMLElement).closest('.title-bar')) {
      setIsDragging(true)
      setDragOffset({
        x: e.clientX - win.position.x,
        y: e.clientY - win.position.y,
      })
      focusWindow(win.id)
    }
  }, [win.position, win.id, focusWindow])

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    setIsResizing(true)
    focusWindow(win.id)
  }, [win.id, focusWindow])

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const newX = Math.max(0, e.clientX - dragOffset.x)
        const newY = Math.max(0, e.clientY - dragOffset.y)
        updateWindowPosition(win.id, { x: newX, y: newY })
      }
      if (isResizing && windowRef.current) {
        const rect = windowRef.current.getBoundingClientRect()
        const newWidth = Math.max(300, e.clientX - rect.left)
        const newHeight = Math.max(200, e.clientY - rect.top)
        useMyanOSStore.getState().updateWindowSize(win.id, { 
          width: newWidth, 
          height: newHeight 
        })
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
    }

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, isResizing, dragOffset, win.id, updateWindowPosition])

  const renderApp = () => {
    switch (win.appId) {
      case 'terminal':
        return <TerminalApp windowId={win.id} />
      case 'ai-agent':
        return <AIAgentApp windowId={win.id} />
      case 'phone-repair':
        return <PhoneRepairApp windowId={win.id} />
      case 'calculator':
        return <CalculatorApp windowId={win.id} />
      case 'notepad':
        return <NotepadApp windowId={win.id} />
      case 'file-manager':
        return <FileManagerApp windowId={win.id} />
      case 'settings':
        return <SettingsApp windowId={win.id} />
      case 'database':
        return <DatabaseApp windowId={win.id} />
      default:
        return <div className="p-4">Unknown App</div>
    }
  }

  if (win.isMinimized) return null

  const windowStyle: React.CSSProperties = win.isMaximized
    ? {
        top: 0,
        left: 0,
        width: '100%',
        height: 'calc(100vh - 48px)',
        zIndex: win.zIndex,
      }
    : {
        top: win.position.y,
        left: win.position.x,
        width: win.size.width,
        height: win.size.height,
        zIndex: win.zIndex,
      }

  return (
    <div
      ref={windowRef}
      className={cn(
        'absolute flex flex-col rounded-lg overflow-hidden shadow-2xl',
        'border transition-shadow duration-200',
        isActive 
          ? 'border-slate-600 shadow-black/50' 
          : 'border-slate-700 shadow-black/30'
      )}
      style={windowStyle}
      onClick={() => focusWindow(win.id)}
    >
      {/* Title Bar */}
      <div
        className={cn(
          'title-bar flex items-center justify-between px-3 py-2 cursor-move select-none',
          isActive
            ? 'bg-gradient-to-r from-slate-800 to-slate-700'
            : 'bg-slate-800/80'
        )}
        onMouseDown={handleMouseDown}
        onDoubleClick={() => maximizeWindow(win.id)}
      >
        <div className="flex items-center gap-2">
          <span className="text-lg">{APPS.find(a => a.id === win.appId)?.icon}</span>
          <span className="text-sm font-medium text-white">
            {useMyanOSStore.getState().language === 'mm' ? win.titleMM : win.title}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); minimizeWindow(win.id) }}
            className="p-1.5 rounded hover:bg-slate-600 transition-colors"
          >
            <Minus className="w-3.5 h-3.5 text-slate-300" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); maximizeWindow(win.id) }}
            className="p-1.5 rounded hover:bg-slate-600 transition-colors"
          >
            {win.isMaximized ? (
              <Maximize2 className="w-3.5 h-3.5 text-slate-300" />
            ) : (
              <Square className="w-3.5 h-3.5 text-slate-300" />
            )}
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); closeWindow(win.id) }}
            className="p-1.5 rounded hover:bg-red-500 transition-colors group"
          >
            <X className="w-3.5 h-3.5 text-slate-300 group-hover:text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-slate-900 overflow-hidden">
        {renderApp()}
      </div>

      {/* Resize Handle */}
      {!win.isMaximized && (
        <div
          className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
          onMouseDown={handleResizeMouseDown}
        >
          <svg
            className="w-3 h-3 text-slate-500 absolute bottom-1 right-1"
            viewBox="0 0 10 10"
          >
            <path
              d="M9 1L1 9M9 5L5 9M9 9L9 9"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}
    </div>
  )
}

import { APPS } from '@/stores/myanos-store'
