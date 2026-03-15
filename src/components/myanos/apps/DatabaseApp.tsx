'use client'
import React from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Database, Play, Table, Server, Loader2 } from 'lucide-react'

interface DatabaseAppProps { windowId: string }

export function DatabaseApp({ windowId: _windowId }: DatabaseAppProps) {
  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="flex items-center gap-2 px-2 py-1.5 bg-slate-800/50 border-b border-slate-700">
        <Database className="w-4 h-4 text-orange-400" />
        <span className="text-slate-200 text-xs font-medium">Database</span>
        <span className="text-[10px] text-slate-500">Admin Only</span>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Database className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Database access restricted to Admin only</p>
          <p className="text-slate-500 text-xs mt-1">Login as admin to access this feature</p>
        </div>
      </div>
    </div>
  )
}
