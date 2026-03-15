'use client'

import React from 'react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { Delete, Divide, Equals, Minus, Percent, Plus, X, ArrowLeft, Calculator } from 'lucide-react'

interface CalculatorAppProps {
  windowId: string
}

export function CalculatorApp({ windowId }: CalculatorAppProps) {
  const { calcDisplay, calcHistory, setCalcDisplay, setCalcHistory, language } = useMyanOSStore()
  const [memory, setMemory] = React.useState(0)
  const [isNewCalculation, setIsNewCalculation] = React.useState(false)

  const handleNumber = (num: string) => {
    if (isNewCalculation) {
      setCalcDisplay(num)
      setIsNewCalculation(false)
    } else {
      setCalcDisplay(calcDisplay === '0' ? num : calcDisplay + num)
    }
  }

  const handleOperator = (op: string) => {
    setCalcHistory(calcDisplay + ' ' + op + ' ')
    setCalcDisplay('0')
    setIsNewCalculation(false)
  }

  const handleEquals = () => {
    try {
      const expression = calcHistory + calcDisplay
      // Safe evaluation
      const result = Function('"use strict"; return (' + expression.replace(/×/g, '*').replace(/÷/g, '/') + ')')()
      setCalcHistory(expression + ' =')
      setCalcDisplay(String(result))
      setIsNewCalculation(true)
    } catch {
      setCalcDisplay('Error')
      setIsNewCalculation(true)
    }
  }

  const handleClear = () => {
    setCalcDisplay('0')
    setCalcHistory('')
  }

  const handleBackspace = () => {
    if (calcDisplay.length > 1) {
      setCalcDisplay(calcDisplay.slice(0, -1))
    } else {
      setCalcDisplay('0')
    }
  }

  const handlePercent = () => {
    const value = parseFloat(calcDisplay) / 100
    setCalcDisplay(String(value))
  }

  const handlePlusMinus = () => {
    const value = parseFloat(calcDisplay) * -1
    setCalcDisplay(String(value))
  }

  const handleDecimal = () => {
    if (!calcDisplay.includes('.')) {
      setCalcDisplay(calcDisplay + '.')
    }
  }

  const buttons = [
    { label: 'C', action: handleClear, className: 'bg-red-600/20 hover:bg-red-600/30 text-red-400' },
    { label: '±', action: handlePlusMinus, className: 'bg-slate-700 hover:bg-slate-600 text-slate-300' },
    { label: '%', action: handlePercent, className: 'bg-slate-700 hover:bg-slate-600 text-slate-300' },
    { label: '÷', action: () => handleOperator('÷'), className: 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-400' },
    { label: '7', action: () => handleNumber('7'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '8', action: () => handleNumber('8'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '9', action: () => handleNumber('9'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '×', action: () => handleOperator('×'), className: 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-400' },
    { label: '4', action: () => handleNumber('4'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '5', action: () => handleNumber('5'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '6', action: () => handleNumber('6'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '-', action: () => handleOperator('-'), className: 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-400' },
    { label: '1', action: () => handleNumber('1'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '2', action: () => handleNumber('2'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '3', action: () => handleNumber('3'), className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '+', action: () => handleOperator('+'), className: 'bg-orange-600/20 hover:bg-orange-600/30 text-orange-400' },
    { label: '0', action: () => handleNumber('0'), className: 'bg-slate-800 hover:bg-slate-700 text-white col-span-2' },
    { label: '.', action: handleDecimal, className: 'bg-slate-800 hover:bg-slate-700 text-white' },
    { label: '=', action: handleEquals, className: 'bg-green-600/20 hover:bg-green-600/30 text-green-400' },
  ]

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Calculator className="w-5 h-5 text-emerald-400" />
          <span className="text-slate-200 font-medium">
            {language === 'mm' ? 'ဂဏန်းတွက်စက်' : 'Calculator'}
          </span>
        </div>
      </div>

      {/* Display */}
      <div className="p-4 bg-slate-900">
        <div className="text-right text-sm text-slate-500 h-5 truncate">
          {calcHistory}
        </div>
        <div className="text-right text-4xl font-light text-white truncate mt-1">
          {calcDisplay}
        </div>
      </div>

      {/* Buttons */}
      <div className="flex-1 p-2 grid grid-cols-4 gap-1.5">
        {buttons.map((btn, i) => (
          <Button
            key={i}
            variant="ghost"
            className={`h-12 text-lg font-medium rounded-lg ${btn.className}`}
            onClick={btn.action}
          >
            {btn.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
