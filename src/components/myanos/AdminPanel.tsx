'use client'

import React, { useState, useRef } from 'react'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Switch } from '@/components/ui/switch'
import { 
  Shield, Users, Settings, Activity, LogOut, RefreshCw, 
  Ban, CheckCircle, Trash2, Search, X, AlertTriangle,
  Bot, Terminal
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface AdminPanelProps {
  onClose: () => void
}

interface User {
  id: string
  email: string
  name: string
  role: string
  isActive: boolean
  lastLogin: string | null
  createdAt: string
  _count?: { aiUsageLogs: number }
}

export function AdminPanel({ onClose }: AdminPanelProps) {
  const { user, token, logout } = useAuthStore()
  const { toast } = useToast()
  const loadedRef = useRef(false)
  
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState<User[]>([])
  const [logs, setLogs] = useState<any[]>([])
  const [settings, setSettings] = useState<any>({})
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const loadData = async () => {
    if (loadedRef.current && !loading) return
    loadedRef.current = true
    
    setLoading(true)
    try {
      const [usersRes, logsRes, settingsRes] = await Promise.all([
        fetch('/api/admin/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/logs', {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch('/api/admin/settings', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ])
      
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data.users || [])
      }
      
      if (logsRes.ok) {
        const data = await logsRes.json()
        setLogs(data.logs || [])
      }
      
      if (settingsRes.ok) {
        const data = await settingsRes.json()
        setSettings(data.settings || {})
      }
    } catch (error) {
      console.error('Failed to load admin data:', error)
    }
    setLoading(false)
  }
  
  // Load data on mount
  React.useEffect(() => {
    loadData()
  }, [])
  
  const handleRefresh = () => {
    loadedRef.current = false
    loadData()
  }
  
  const handleUpdateUser = async (userId: string, updates: Partial<User>) => {
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ userId, ...updates })
      })
      
      if (res.ok) {
        toast({ title: 'User updated', description: 'Changes saved successfully' })
        handleRefresh()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to update user', variant: 'destructive' })
    }
  }
  
  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return
    
    try {
      const res = await fetch(`/api/admin/users?userId=${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      if (res.ok) {
        toast({ title: 'User deleted' })
        handleRefresh()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to delete user', variant: 'destructive' })
    }
  }
  
  const handleUpdateSettings = async (updates: any) => {
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      })
      
      if (res.ok) {
        toast({ title: 'Settings saved' })
        handleRefresh()
      }
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to save settings', variant: 'destructive' })
    }
  }
  
  const handleLogout = async () => {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    })
    logout()
    onClose()
  }
  
  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.name.toLowerCase().includes(searchQuery.toLowerCase())
  )
  
  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-red-400" />
          <div>
            <h2 className="text-lg font-bold text-white">Admin Panel</h2>
            <p className="text-xs text-slate-400">System Administration</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handleRefresh}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-red-300">
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-1 px-4 py-2 bg-slate-900/50 border-b border-slate-700">
        {[
          { id: 'users', icon: Users, label: 'Users' },
          { id: 'logs', icon: Activity, label: 'Logs' },
          { id: 'settings', icon: Settings, label: 'Settings' },
        ].map(tab => (
          <Button
            key={tab.id}
            variant={activeTab === tab.id ? 'default' : 'ghost'}
            size="sm"
            className={activeTab === tab.id 
              ? 'bg-red-600 hover:bg-red-700 text-white' 
              : 'text-slate-400 hover:text-white'
            }
            onClick={() => setActiveTab(tab.id)}
          >
            <tab.icon className="w-4 h-4 mr-1" />
            {tab.label}
          </Button>
        ))}
      </div>
      
      {/* Content */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : (
          <>
            {/* Users Tab */}
            {activeTab === 'users' && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search users..."
                      className="pl-9 bg-slate-800 border-slate-600"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  {filteredUsers.map(u => (
                    <div
                      key={u.id}
                      className="p-3 bg-slate-800/50 rounded-lg border border-slate-700"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-white">{u.name}</span>
                            {u.role === 'admin' && (
                              <span className="px-1.5 py-0.5 text-xs bg-red-600/20 text-red-400 rounded">
                                Admin
                              </span>
                            )}
                            {u.isActive ? (
                              <CheckCircle className="w-4 h-4 text-green-400" />
                            ) : (
                              <Ban className="w-4 h-4 text-red-400" />
                            )}
                          </div>
                          <p className="text-sm text-slate-400">{u.email}</p>
                          <p className="text-xs text-slate-500">
                            AI uses: {u._count?.aiUsageLogs || 0} • 
                            Joined: {new Date(u.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUpdateUser(u.id, { isActive: !u.isActive })}
                            className={u.isActive ? 'text-yellow-400' : 'text-green-400'}
                          >
                            {u.isActive ? <Ban className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
                          </Button>
                          {u.role !== 'admin' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteUser(u.id)}
                              className="text-red-400 hover:text-red-300"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Logs Tab */}
            {activeTab === 'logs' && (
              <div className="space-y-2">
                {logs.map((log, i) => (
                  <div key={i} className="p-2 bg-slate-800/50 rounded border border-slate-700">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-mono text-slate-300">{log.action}</span>
                      <span className="text-xs text-slate-500">
                        {new Date(log.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {log.details && (
                      <p className="text-xs text-slate-400 mt-1">{log.details}</p>
                    )}
                    {log.user && (
                      <p className="text-xs text-slate-500 mt-1">By: {log.user.email}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* System Controls */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h3 className="text-sm font-medium text-white mb-4">System Controls</h3>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Bot className="w-5 h-5 text-purple-400" />
                        <div>
                          <p className="text-sm text-white">AI Features</p>
                          <p className="text-xs text-slate-400">Enable/disable AI for all users</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.aiEnabled ?? true}
                        onCheckedChange={(checked) => handleUpdateSettings({ aiEnabled: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Terminal className="w-5 h-5 text-green-400" />
                        <div>
                          <p className="text-sm text-white">Terminal Access</p>
                          <p className="text-xs text-slate-400">Enable/disable terminal for users</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.terminalEnabled ?? true}
                        onCheckedChange={(checked) => handleUpdateSettings({ terminalEnabled: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="w-5 h-5 text-blue-400" />
                        <div>
                          <p className="text-sm text-white">New Registrations</p>
                          <p className="text-xs text-slate-400">Allow new user sign-ups</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.registerEnabled ?? true}
                        onCheckedChange={(checked) => handleUpdateSettings({ registerEnabled: checked })}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="w-5 h-5 text-yellow-400" />
                        <div>
                          <p className="text-sm text-white">Maintenance Mode</p>
                          <p className="text-xs text-slate-400">Block all non-admin access</p>
                        </div>
                      </div>
                      <Switch
                        checked={settings.maintenanceMode ?? false}
                        onCheckedChange={(checked) => handleUpdateSettings({ maintenanceMode: checked })}
                      />
                    </div>
                  </div>
                </div>
                
                {/* AI Limits */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h3 className="text-sm font-medium text-white mb-4">AI Usage Limits</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-white">Daily AI Limit per User</p>
                      <p className="text-xs text-slate-400">Maximum AI requests per day</p>
                    </div>
                    <Input
                      type="number"
                      value={settings.aiUserLimit || 50}
                      onChange={(e) => handleUpdateSettings({ aiUserLimit: parseInt(e.target.value) })}
                      className="w-20 bg-slate-700 border-slate-600 text-center"
                    />
                  </div>
                </div>
                
                {/* Admin Info */}
                <div className="p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                  <h3 className="text-sm font-medium text-white mb-4">Admin Info</h3>
                  <div className="space-y-2 text-sm text-slate-300">
                    <p><span className="text-slate-500">Logged in as:</span> {user?.email}</p>
                    <p><span className="text-slate-500">Role:</span> {user?.role}</p>
                    <p><span className="text-slate-500">Total Users:</span> {users.length}</p>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </ScrollArea>
    </div>
  )
}
