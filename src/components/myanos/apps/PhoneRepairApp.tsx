'use client'

import React, { useState } from 'react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Smartphone, RefreshCw, Wifi, Usb, Terminal, RotateCcw, Settings, Loader2, CheckCircle } from 'lucide-react'

interface PhoneRepairAppProps { windowId: string }

export function PhoneRepairApp({ windowId: _windowId }: PhoneRepairAppProps) {
  const { adbDevices, setAdbDevices, selectedDevice, setSelectedDevice, language } = useMyanOSStore()
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState<string[]>([])
  const [command, setCommand] = useState('')
  const [activeTab, setActiveTab] = useState<'devices' | 'shell'>('devices')
  const [networkIp, setNetworkIp] = useState('')

  const addOutput = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const prefix = type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : 'ℹ️ '
    setOutput(prev => [...prev, `${prefix}${text}`])
  }

  const executeAdb = async (cmd: string) => {
    setLoading(true)
    addOutput(`Executing: adb ${cmd}`, 'info')
    try {
      const response = await fetch('/api/terminal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: `adb ${cmd}` }) })
      const data = await response.json()
      addOutput(data.output || data.error || 'No output', data.output?.includes('error') ? 'error' : 'success')
    } catch { addOutput('Connection error', 'error') }
    setLoading(false)
  }

  const refreshDevices = async () => {
    setLoading(true)
    addOutput('Scanning for devices...', 'info')
    try {
      const response = await fetch('/api/terminal', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ command: 'adb devices -l' }) })
      const data = await response.json()
      const lines = data.output.split('\n').slice(1)
      const devices = lines.filter((l: string) => l.trim()).map((line: string) => {
        const parts = line.split(/\s+/)
        return { id: parts[0], name: parts[3]?.replace('model:', '') || 'Unknown', type: parts[0].includes(':') ? 'network' : 'usb' }
      })
      setAdbDevices(devices)
      addOutput(`Found ${devices.length} device(s)`, 'success')
    } catch { addOutput('Failed to scan devices', 'error') }
    setLoading(false)
  }

  const connectNetwork = async () => {
    if (!networkIp.trim()) { addOutput('Please enter IP address', 'error'); return }
    await executeAdb(`connect ${networkIp}:5555`)
    refreshDevices()
  }

  const quickActions = [
    { icon: RotateCcw, label: language === 'mm' ? 'ပြန်စမည်' : 'Reboot', action: () => executeAdb('reboot'), color: 'text-orange-400' },
    { icon: Settings, label: language === 'mm' ? 'Recovery' : 'Recovery', action: () => executeAdb('reboot recovery'), color: 'text-yellow-400' },
    { icon: Terminal, label: 'Bootloader', action: () => executeAdb('reboot bootloader'), color: 'text-red-400' },
  ]

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span className="text-slate-200 text-xs font-medium">{language === 'mm' ? 'ဖုန်းပြုပြင်ရေး' : 'Phone Repair'}</span>
        </div>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" onClick={refreshDevices} disabled={loading}>
          {loading ? <Loader2 className="w-3 h-3 animate-spin mr-0.5" /> : <RefreshCw className="w-3 h-3 mr-0.5" />}
          {language === 'mm' ? 'ပြန်လည်စစ်ဆေး' : 'Refresh'}
        </Button>
      </div>

      <div className="flex gap-1 px-2 py-1.5 bg-slate-900/50 border-b border-slate-700">
        {[
          { id: 'devices', label: language === 'mm' ? 'စက်ပစ္စည်းများ' : 'Devices' },
          { id: 'shell', label: 'Shell' },
        ].map(tab => (
          <Button key={tab.id} variant={activeTab === tab.id ? 'default' : 'ghost'} size="sm" className={`h-6 text-[10px] ${activeTab === tab.id ? 'bg-cyan-600 hover:bg-cyan-700' : 'text-slate-400 hover:text-white'}`} onClick={() => setActiveTab(tab.id as typeof activeTab)}>{tab.label}</Button>
        ))}
      </div>

      <div className="flex-1 overflow-hidden">
        {activeTab === 'devices' && (
          <div className="p-2 space-y-2">
            <div className="flex gap-1.5">
              <input value={networkIp} onChange={(e) => setNetworkIp(e.target.value)} placeholder="IP (e.g., 192.168.1.100)" className="flex-1 h-7 bg-slate-800 border border-slate-600 text-white text-xs rounded px-2" />
              <Button onClick={connectNetwork} disabled={loading} className="h-7 bg-cyan-600 hover:bg-cyan-700 text-xs"><Wifi className="w-3 h-3 mr-1" />{language === 'mm' ? 'ဆက်သွယ်မည်' : 'Connect'}</Button>
            </div>
            <div className="space-y-1">
              <h4 className="text-[10px] font-medium text-slate-300">{language === 'mm' ? 'ဆက်သွယ်ထားသော စက်ပစ္စည်းများ' : 'Connected Devices'}</h4>
              {adbDevices.length === 0 ? (
                <div className="text-center py-4 text-slate-500 text-xs">
                  <Usb className="w-6 h-6 mx-auto mb-1 opacity-50" />
                  <p>{language === 'mm' ? 'စက်ပစ္စည်း မတွေ့ပါ' : 'No devices found'}</p>
                </div>
              ) : (
                adbDevices.map((device) => (
                  <button key={device.id} className={`w-full flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition-colors ${selectedDevice === device.id ? 'bg-cyan-600/20 border border-cyan-500/50' : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'}`} onClick={() => setSelectedDevice(device.id)}>
                    <div className="flex items-center gap-1.5">
                      {device.type === 'network' ? <Wifi className="w-3 h-3 text-green-400" /> : <Usb className="w-3 h-3 text-blue-400" />}
                      <div>
                        <p className="text-white text-[10px]">{device.name}</p>
                        <p className="text-slate-400 text-[10px]">{device.id}</p>
                      </div>
                    </div>
                    <CheckCircle className="w-3 h-3 text-green-400" />
                  </button>
                ))
              )}
            </div>
            <div className="grid grid-cols-3 gap-1 pt-2">
              {quickActions.map((action, i) => (
                <Button key={i} variant="outline" size="sm" className="h-7 text-[10px] flex-col bg-slate-800/50 border-slate-600 hover:bg-slate-700" onClick={action.action} disabled={loading}>
                  <action.icon className={`w-3 h-3 ${action.color}`} />
                  <span className="text-slate-300">{action.label}</span>
                </Button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'shell' && (
          <div className="flex flex-col h-full">
            <ScrollArea className="flex-1 p-2 bg-slate-900">
              <div className="space-y-0.5 font-mono text-[10px]">
                {output.map((line, i) => (
                  <div key={i} className={`whitespace-pre-wrap ${line.startsWith('✅') ? 'text-green-400' : line.startsWith('❌') ? 'text-red-400' : 'text-blue-400'}`}>{line}</div>
                ))}
                {loading && <div className="text-yellow-400 flex items-center gap-1"><Loader2 className="w-2.5 h-2.5 animate-spin" />{language === 'mm' ? 'လုပ်ဆောင်နေသည်...' : 'Processing...'}</div>}
              </div>
            </ScrollArea>
            <div className="p-1.5 border-t border-slate-700 bg-slate-900/50 flex gap-1.5">
              <span className="text-cyan-400 font-mono text-[10px]">adb</span>
              <input value={command} onChange={(e) => setCommand(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && command.trim()) { executeAdb(command); setCommand('') } }} placeholder="command" className="flex-1 bg-slate-800 border border-slate-600 text-white font-mono text-[10px] rounded px-1.5" disabled={loading} />
              <Button onClick={() => { if (command.trim()) { executeAdb(command); setCommand('') } }} disabled={loading || !command.trim()} className="h-6 bg-cyan-600 hover:bg-cyan-700"><Terminal className="w-3 h-3" /></Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
