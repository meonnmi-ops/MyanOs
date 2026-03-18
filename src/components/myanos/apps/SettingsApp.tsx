import React from 'react'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Monitor, Languages, Shield, LogOut, User } from 'lucide-react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { useAuthStore } from '@/stores/auth-store'
import { useToast } from '@/hooks/use-toast'

interface SettingsAppProps { windowId: string }

const wallpapers = [
  { id: 'gradient', name: 'Gradient', style: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 50%, #1e1e3f 100%)' },
  { id: 'sunset', name: 'Sunset', style: 'linear-gradient(135deg, #f97316 0%, #dc2626 50%, #7c3aed 100%)' },
  { id: 'ocean', name: 'Ocean', style: 'linear-gradient(135deg, #0ea5e9 0%, #0284c7 50%, #1e3a5f 100%)' },
  { id: 'forest', name: 'Forest', style: 'linear-gradient(135deg, #059669 0%, #047857 50%, #064e3b 100%)' },
  { id: 'dark', name: 'Dark', style: 'linear-gradient(135deg, #18181b 0%, #09090b 50%, #18181b 100%)' },
  { id: 'purple', name: 'Purple', style: 'linear-gradient(135deg, #7c3aed 0%, #4c1d95 50%, #2e1065 100%)' },
]

export function SettingsApp({ windowId: _windowId }: SettingsAppProps) {
  const { wallpaper, setWallpaper, showDesktopIcons, toggleDesktopIcons, fontSize, setFontSize, language, setLanguage } = useMyanOSStore()
  const { user, logout } = useAuthStore()
  const { toast } = useToast()
  const isAdmin = user?.role === 'admin'

  const handleOpenAdmin = () => {
    const adminCallback = (window as any).__myanos_admin?.onOpenAdmin
    if (adminCallback) {
      adminCallback()
    }
  }

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${useAuthStore.getState().token}` }
      })
      logout()
      toast({
        title: language === 'mm' ? 'ထွက်ပြီးပါပြီ' : 'Logged out',
        description: language === 'mm' ? 'အကောင့်မှ ထွက်ပြီးပါပြီ' : 'You have been logged out',
      })
      // Refresh page to show login
      setTimeout(() => window.location.reload(), 500)
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Logout failed',
        variant: 'destructive',
      })
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-auto">
      <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border-b border-slate-700">
        <span className="text-slate-200 text-xs font-medium">{language === 'mm' ? 'ဆက်တင်များ' : 'Settings'}</span>
      </div>

      <div className="flex-1 p-3 space-y-4">
        {/* User Info */}
        <div className="p-3 bg-slate-800/50 rounded-lg border border-slate-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-600/20 flex items-center justify-center">
              <User className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-white">{user?.name || 'User'}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
              {user?.role === 'admin' && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 mt-1 text-[10px] bg-red-600/20 text-red-400 rounded">
                  <Shield className="w-3 h-3" />
                  Admin
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Language */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-300"><Languages className="w-3 h-3" /><span>{language === 'mm' ? 'ဘာသာစကား' : 'Language'}</span></div>
          <div className="flex gap-1">
            <Button variant={language === 'mm' ? 'default' : 'outline'} size="sm" className={`h-7 text-[10px] ${language === 'mm' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} onClick={() => setLanguage('mm')}>မြန်မာ</Button>
            <Button variant={language === 'en' ? 'default' : 'outline'} size="sm" className={`h-7 text-[10px] ${language === 'en' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}`} onClick={() => setLanguage('en')}>English</Button>
          </div>
        </div>

        {/* Wallpaper */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] text-slate-300"><Monitor className="w-3 h-3" /><span>{language === 'mm' ? 'နောက်ခံပုံ' : 'Wallpaper'}</span></div>
          <div className="grid grid-cols-3 gap-1">
            {wallpapers.map((wp) => (
              <button key={wp.id} className={`h-10 rounded text-[8px] transition-all ${wallpaper === wp.id ? 'ring-2 ring-emerald-500 ring-offset-1 ring-offset-slate-950' : ''}`} style={{ background: wp.style }} onClick={() => setWallpaper(wp.id)}>{wp.name}</button>
            ))}
          </div>
        </div>

        {/* Desktop Icons */}
        <div className="flex items-center justify-between py-1.5">
          <span className="text-[10px] text-slate-300">{language === 'mm' ? 'Desktop Icons ပြသမည်' : 'Show Desktop Icons'}</span>
          <Switch checked={showDesktopIcons} onCheckedChange={toggleDesktopIcons} />
        </div>

        {/* Font Size */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-300">{language === 'mm' ? 'စာလုံးအရွယ်' : 'Font Size'}</span>
            <span className="text-[10px] text-slate-400">{fontSize}px</span>
          </div>
          <input type="range" value={fontSize} onChange={(e) => setFontSize(parseInt(e.target.value))} min={12} max={18} className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer" />
        </div>

        {/* Admin Button (only for admins) */}
        {isAdmin && (
          <div className="pt-2 border-t border-slate-800">
            <Button
              variant="outline"
              className="w-full h-8 text-xs bg-red-600/20 border-red-600/30 text-red-400 hover:bg-red-600/30"
              onClick={handleOpenAdmin}
            >
              <Shield className="w-4 h-4 mr-2" />
              {language === 'mm' ? 'Admin Panel ဖွင့်မည်' : 'Open Admin Panel'}
            </Button>
          </div>
        )}

        {/* Logout Button */}
        <div className="pt-2 border-t border-slate-800">
          <Button
            variant="outline"
            className="w-full h-8 text-xs bg-slate-800/50 border-slate-600 text-slate-300 hover:bg-slate-700"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4 mr-2" />
            {language === 'mm' ? 'အကောင့်မှ ထွက်မည်' : 'Logout'}
          </Button>
        </div>

        {/* About */}
        <div className="pt-3 border-t border-slate-800">
          <div className="text-center text-[10px] text-slate-500">
            <p className="font-medium text-slate-300">MyanOS v1.0</p>
            <p>{language === 'mm' ? 'မြန်မာ့ ဝဘ် ကွန်ပျူတာစနစ်' : 'Web Operating System for Myanmar'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
