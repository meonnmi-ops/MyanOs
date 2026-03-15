'use client'

import React, { useState } from 'react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Smartphone, 
  RefreshCw, 
  Wifi, 
  Usb, 
  Terminal, 
  RotateCcw,
  Download,
  Upload,
  Settings,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react'

interface PhoneRepairAppProps {
  windowId: string
}

export function PhoneRepairApp({ windowId }: PhoneRepairAppProps) {
  const { adbDevices, setAdbDevices, selectedDevice, setSelectedDevice, language } = useMyanOSStore()
  const [loading, setLoading] = useState(false)
  const [output, setOutput] = useState<string[]>([])
  const [command, setCommand] = useState('')
  const [activeTab, setActiveTab] = useState<'devices' | 'shell' | 'quick'>('devices')
  const [networkIp, setNetworkIp] = useState('')

  const addOutput = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const prefix = type === 'success' ? '✅ ' : type === 'error' ? '❌ ' : 'ℹ️ '
    setOutput(prev => [...prev, `${prefix}${text}`])
  }

  const executeAdb = async (cmd: string) => {
    setLoading(true)
    addOutput(`Executing: adb ${cmd}`, 'info')
    
    try {
      const response = await fetch('/api/terminal?XTransformPort=3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `adb ${cmd}` }),
      })
      
      const data = await response.json()
      
      if (data.output) {
        addOutput(data.output, data.output.includes('error') ? 'error' : 'success')
      }
      if (data.error) {
        addOutput(data.error, 'error')
      }
    } catch (error) {
      addOutput('Connection error - Terminal service not available', 'error')
    }
    
    setLoading(false)
  }

  const refreshDevices = async () => {
    setLoading(true)
    addOutput('Scanning for devices...', 'info')
    
    try {
      const response = await fetch('/api/terminal?XTransformPort=3001', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: 'adb devices -l' }),
      })
      
      const data = await response.json()
      
      if (data.output) {
        // Parse devices
        const lines = data.output.split('\n').slice(1) // Skip header
        const devices = lines
          .filter((line: string) => line.trim())
          .map((line: string) => {
            const parts = line.split(/\s+/)
            return {
              id: parts[0],
              name: parts[3]?.replace('model:', '') || 'Unknown',
              type: parts[0].includes(':') ? 'network' : 'usb'
            }
          })
        setAdbDevices(devices)
        addOutput(`Found ${devices.length} device(s)`, 'success')
      }
    } catch (error) {
      addOutput('Failed to scan devices', 'error')
    }
    
    setLoading(false)
  }

  const connectNetwork = async () => {
    if (!networkIp.trim()) {
      addOutput('Please enter IP address', 'error')
      return
    }
    await executeAdb(`connect ${networkIp}:5555`)
    refreshDevices()
  }

  const quickActions = [
    { 
      icon: RotateCcw, 
      label: language === 'mm' ? 'ပြန်စမည်' : 'Reboot', 
      action: () => executeAdb('reboot'),
      color: 'text-orange-400'
    },
    { 
      icon: Settings, 
      label: language === 'mm' ? 'Recovery ဖွင့်မည်' : 'Recovery', 
      action: () => executeAdb('reboot recovery'),
      color: 'text-yellow-400'
    },
    { 
      icon: Download, 
      label: language === 'mm' ? 'Bootloader ဖွင့်မည်' : 'Bootloader', 
      action: () => executeAdb('reboot bootloader'),
      color: 'text-red-400'
    },
    { 
      icon: RefreshCw, 
      label: language === 'mm' ? 'ADB ပြန်စမည်' : 'Restart ADB', 
      action: () => executeAdb('kill-server && adb start-server'),
      color: 'text-blue-400'
    },
  ]

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Smartphone className="w-5 h-5 text-cyan-400" />
          <span className="text-slate-200 font-medium">
            {language === 'mm' ? 'ဖုန်းပြုပြင်ရေး' : 'Phone Repair'}
          </span>
          <span className="text-xs text-slate-500">ADB Tools</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-slate-400 hover:text-white"
          onClick={refreshDevices}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <RefreshCw className="w-3 h-3 mr-1" />
          )}
          {language === 'mm' ? 'ပြန်လည်စစ်ဆေး' : 'Refresh'}
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-3 py-2 bg-slate-900/50 border-b border-slate-700">
        {[
          { id: 'devices', label: language === 'mm' ? 'စက်ပစ္စည်းများ' : 'Devices' },
          { id: 'quick', label: language === 'mm' ? 'အမြန်ဆက်တင်' : 'Quick Actions' },
          { id: 'shell', label: 'Shell' },
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            className={activeTab === tab.id 
              ? 'bg-cyan-600 hover:bg-cyan-700 text-white' 
              : 'text-slate-400 hover:text-white'
            }
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'devices' && (
          <div className="p-3 space-y-3">
            {/* Network Connect */}
            <div className="flex gap-2">
              <Input
                value={networkIp}
                onChange={(e) => setNetworkIp(e.target.value)}
                placeholder={language === 'mm' ? 'IP Address (ဥပမာ: 192.168.1.100)' : 'IP Address (e.g., 192.168.1.100)'}
                className="flex-1 bg-slate-800 border-slate-600 text-white"
              />
              <Button 
                onClick={connectNetwork}
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                <Wifi className="w-4 h-4 mr-1" />
                {language === 'mm' ? 'ဆက်သွယ်မည်' : 'Connect'}
              </Button>
            </div>

            {/* Device List */}
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-slate-300">
                {language === 'mm' ? 'ဆက်သွယ်ထားသော စက်ပစ္စည်းများ' : 'Connected Devices'}
              </h4>
              {adbDevices.length === 0 ? (
                <div className="text-center py-6 text-slate-500">
                  <Usb className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>{language === 'mm' ? 'စက်ပစ္စည်း မတွေ့ပါ' : 'No devices found'}</p>
                  <p className="text-xs mt-1">
                    {language === 'mm' 
                      ? 'USB ဆက်သွယ်ပါ သို့မဟုတ် Network ADB အသုံးပြုပါ' 
                      : 'Connect via USB or use Network ADB'}
                  </p>
                </div>
              ) : (
                adbDevices.map((device) => (
                  <div
                    key={device.id}
                    className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedDevice === device.id
                        ? 'bg-cyan-600/20 border border-cyan-500/50'
                        : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
                    }`}
                    onClick={() => setSelectedDevice(device.id)}
                  >
                    <div className="flex items-center gap-2">
                      {device.type === 'network' ? (
                        <Wifi className="w-4 h-4 text-green-400" />
                      ) : (
                        <Usb className="w-4 h-4 text-blue-400" />
                      )}
                      <div>
                        <p className="text-sm text-white">{device.name}</p>
                        <p className="text-xs text-slate-400">{device.id}</p>
                      </div>
                    </div>
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {activeTab === 'quick' && (
          <div className="p-3">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action, i) => (
                <Button
                  key={i}
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1 bg-slate-800/50 border-slate-600 hover:bg-slate-700"
                  onClick={action.action}
                  disabled={loading}
                >
                  <action.icon className={`w-5 h-5 ${action.color}`} />
                  <span className="text-xs text-slate-300">{action.label}</span>
                </Button>
              ))}
            </div>

            <div className="mt-4 p-3 bg-slate-800/30 rounded-lg border border-slate-700">
              <h4 className="text-sm font-medium text-slate-300 mb-2">
                {language === 'mm' ? 'နောက်ထပ်ဆက်တင်များ' : 'More Options'}
              </h4>
              <div className="space-y-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-slate-400 hover:text-white"
                  onClick={() => executeAdb('shell screencap -p /sdcard/screenshot.png && adb pull /sdcard/screenshot.png')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  {language === 'mm' ? 'Screenshot ရယူမည်' : 'Take Screenshot'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-slate-400 hover:text-white"
                  onClick={() => executeAdb('logcat -d')}
                >
                  <Terminal className="w-4 h-4 mr-2" />
                  {language === 'mm' ? 'Logcat ကြည့်မည်' : 'View Logcat'}
                </Button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shell' && (
          <div className="flex flex-col h-full">
            {/* Output */}
            <ScrollArea className="flex-1 p-3 bg-slate-900">
              <div className="space-y-1 font-mono text-sm">
                {output.map((line, i) => (
                  <div 
                    key={i} 
                    className={`whitespace-pre-wrap ${
                      line.startsWith('✅') ? 'text-green-400' :
                      line.startsWith('❌') ? 'text-red-400' :
                      line.startsWith('ℹ️') ? 'text-blue-400' :
                      'text-slate-300'
                    }`}
                  >
                    {line}
                  </div>
                ))}
                {loading && (
                  <div className="text-yellow-400 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    {language === 'mm' ? 'လုပ်ဆောင်နေသည်...' : 'Processing...'}
                  </div>
                )}
              </div>
            </ScrollArea>

            {/* Command Input */}
            <div className="p-2 border-t border-slate-700 bg-slate-900/50">
              <div className="flex gap-2">
                <span className="text-cyan-400 font-mono text-sm self-center">adb</span>
                <Input
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && command.trim()) {
                      executeAdb(command)
                      setCommand('')
                    }
                  }}
                  placeholder={language === 'mm' ? 'ကမ်မန်ရိုက်ထည့်ပါ...' : 'Enter command...'}
                  className="flex-1 bg-slate-800 border-slate-600 text-white font-mono"
                  disabled={loading}
                />
                <Button 
                  onClick={() => {
                    if (command.trim()) {
                      executeAdb(command)
                      setCommand('')
                    }
                  }}
                  disabled={loading || !command.trim()}
                  className="bg-cyan-600 hover:bg-cyan-700"
                >
                  <Terminal className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
