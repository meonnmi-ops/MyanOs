'use client'

import React from 'react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { 
  Settings, 
  Sun, 
  Moon, 
  Languages,
  Monitor,
  Palette,
  Type,
  Eye
} from 'lucide-react'

interface SettingsAppProps {
  windowId: string
}

const wallpapers = [
  { id: 'gradient', name: 'Gradient', style: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e1e3f 100%)' },
  { id: 'sunset', name: 'Sunset', style: 'linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7c3aed 100%)' },
  { id: 'ocean', name: 'Ocean', style: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #1e3a5f 100%)' },
  { id: 'forest', name: 'Forest', style: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%)' },
  { id: 'dark', name: 'Dark', style: 'linear-gradient(135deg, #18181b 0%, #09090b 50%, #18181b 100%)' },
  { id: 'purple', name: 'Purple', style: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 50%, #2e1065 100%)' },
]

export function SettingsApp({ windowId }: SettingsAppProps) {
  const { 
    theme, 
    setTheme, 
    wallpaper, 
    setWallpaper, 
    showDesktopIcons, 
    toggleDesktopIcons,
    fontSize,
    setFontSize,
    language,
    setLanguage
  } = useMyanOSStore()

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-b border-slate-700">
        <Settings className="w-5 h-5 text-slate-400" />
        <span className="text-slate-200 font-medium">
          {language === 'mm' ? 'ဆက်တင်များ' : 'Settings'}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Language */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Languages className="w-4 h-4" />
            <span>{language === 'mm' ? 'ဘာသာစကား' : 'Language'}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={language === 'mm' ? 'default' : 'outline'}
              size="sm"
              className={language === 'mm' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setLanguage('mm')}
            >
              မြန်မာ
            </Button>
            <Button
              variant={language === 'en' ? 'default' : 'outline'}
              size="sm"
              className={language === 'en' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setLanguage('en')}
            >
              English
            </Button>
          </div>
        </div>

        {/* Theme */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Palette className="w-4 h-4" />
            <span>{language === 'mm' ? 'အပြင်အဆင်' : 'Appearance'}</span>
          </div>
          <div className="flex gap-2">
            <Button
              variant={theme === 'light' ? 'default' : 'outline'}
              size="sm"
              className={theme === 'light' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setTheme('light')}
            >
              <Sun className="w-4 h-4 mr-1" />
              {language === 'mm' ? 'အဖြူ' : 'Light'}
            </Button>
            <Button
              variant={theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              className={theme === 'dark' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
              onClick={() => setTheme('dark')}
            >
              <Moon className="w-4 h-4 mr-1" />
              {language === 'mm' ? 'အမှောင်' : 'Dark'}
            </Button>
          </div>
        </div>

        {/* Wallpaper */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Monitor className="w-4 h-4" />
            <span>{language === 'mm' ? 'နောက်ခံပုံ' : 'Wallpaper'}</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {wallpapers.map((wp) => (
              <button
                key={wp.id}
                className={`h-16 rounded-lg transition-all ${
                  wallpaper === wp.id 
                    ? 'ring-2 ring-emerald-500 ring-offset-2 ring-offset-slate-950' 
                    : ''
                }`}
                style={{ background: wp.style }}
                onClick={() => setWallpaper(wp.id)}
              >
                <span className="text-xs text-white/70">{wp.name}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Font Size */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-slate-300">
              <Type className="w-4 h-4" />
              <span>{language === 'mm' ? 'စာလုံးအရွယ်' : 'Font Size'}</span>
            </div>
            <span className="text-sm text-slate-400">{fontSize}px</span>
          </div>
          <Slider
            value={[fontSize]}
            onValueChange={([value]) => setFontSize(value)}
            min={12}
            max={20}
            step={1}
            className="w-full"
          />
        </div>

        {/* Desktop Icons */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Eye className="w-4 h-4" />
            <span>{language === 'mm' ? 'Desktop Icons ပြသမည်' : 'Show Desktop Icons'}</span>
          </div>
          <Switch
            checked={showDesktopIcons}
            onCheckedChange={toggleDesktopIcons}
          />
        </div>

        {/* About */}
        <div className="pt-4 border-t border-slate-800">
          <div className="text-center text-sm text-slate-500">
            <p className="font-medium text-slate-300">MyanOS v1.0</p>
            <p>{language === 'mm' ? 'မြန်မာ့ ဝဘ် ကွန်ပျူတာစနစ်' : 'Web Operating System for Myanmar'}</p>
            <p className="mt-2 text-xs">
              {language === 'mm' 
                ? 'Built with Next.js, TypeScript, Tailwind CSS' 
                : 'Built with Next.js, TypeScript, Tailwind CSS'}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
