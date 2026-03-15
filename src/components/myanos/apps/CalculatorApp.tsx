'use client'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Delete, Divide, Equals, Minus, Percent, Plus, X } from 'lucide-react'
import { useMyanOSStore } from '@/stores/myanos-store'

interface CalculatorAppProps { windowId: string }

export function CalculatorApp({ windowId: _windowId }: CalculatorAppProps) {
  const { calcDisplay, setCalcDisplay, language } = useMyanOSStore()
  const [display, setDisplay] = useState('0')
  const [isNew, setIsNew] = useState(false)

  const handleNumber = (n: string) => { if (isNew) { setDisplay(n); setIsNew(false) } else setDisplay(display === '0' ? n : display + n) }
  const handleOp = (op: string) => { setDisplay(display + ' ' + op + ' '); setIsNew(false) }
  const handleEquals = () => { try { const result = Function('"use strict"; return (' + display.replace(/×/g, '*').replace(/÷/g, '/') + ')')(); setDisplay(String(result)); setIsNew(true) } catch { setDisplay('Error'); setIsNew(true) } }
  const handleClear = () => { setDisplay('0'); setIsNew(false) }
  const handleBackspace = () => { if (display.length > 1) setDisplay(display.slice(0, -1)); else setDisplay('0') }
  const handlePercent = () => setDisplay(String(parseFloat(display) / 100))
  const handleDecimal = () => { if (!display.includes('.')) setDisplay(display + '.') }

  const buttons = [
    { label: 'C', action: handleClear, className: 'bg-red-600/30 hover:bg-red-600/40 text-red-400' },
    { label: '±', action: () => setDisplay(String(parseFloat(display) * -1)), className: 'bg-slate-700 hover:bg-slate-600 text-slate-300' },
    { label: '%', action: handlePercent, className: 'bg-slate-700 hover:bg-slate-600 text-slate-300' },
    { label: '÷', action: () => handleOp('÷'), className: 'bg-orange-600/30 hover:bg-orange-600/40 text-orange-400' },
    { label: '7', action: () => handleNumber('7'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '8', action: () => handleNumber('8'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '9', action: () => handleNumber('9'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '×', action: () => handleOp('×'), className: 'bg-orange-600/30 hover:bg-orange-600/40 text-orange-400' },
    { label: '4', action: () => handleNumber('4'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '5', action: () => handleNumber('5'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '6', action: () => handleNumber('6'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '-', action: () => handleOp('-'), className: 'bg-orange-600/30 hover:bg-orange-600/40 text-orange-400' },
    { label: '1', action: () => handleNumber('1'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '2', action: () => handleNumber('2'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '3', action: () => handleNumber('3'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '+', action: () => handleOp('+'), className: 'bg-orange-600/30 hover:bg-orange-600/40 text-orange-400' },
    { label: '0', action: () => handleNumber('0'), className: 'bg-slate-800 hover:bg-slate-700 text-white col-span-2' },
    { label: '.', action: handleDecimal, className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '=', action: handleEquals, className: 'bg-green-600/30 hover:bg-green-600/40 text-green-400' },
  ]

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800/50 border-b border-slate-700">
        <span className="text-slate-200 text-xs">{language === 'mm' ? 'ဂဏန်းတွက်စက်' : 'Calculator'}</span>
      </div>
      <div className="p-2 bg-slate-900">
        <div className="text-right text-xs text-slate-500 h-3 truncate"></div>
        <div className="text-right text-2xl font-light text-white truncate mt-1">{display}</div>
      </div>
      <div className="flex-1 p-1.5 grid grid-cols-4 gap-1">{buttons.map((btn, i) => (<Button key={i} variant="ghost" className={`h-10 text-base font-medium rounded ${btn.className}`} onClick={btn.action}>{btn.label}</Button>))}</div>
    </div>
  )
}
