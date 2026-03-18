'use client'

import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, LogIn, UserPlus, Shield, AlertCircle } from 'lucide-react'

export interface MyanosUser {
  id: string
  email: string
  name: string
  role: 'admin' | 'user'
  aiCredits: number
  createdAt: string
}

interface LoginPanelProps {
  onLogin: (user: MyanosUser) => void
}

// Admin credentials
const ADMIN_EMAIL = 'admin@myanos.local'
const ADMIN_PASSWORD = 'myanos-admin-2024'

export function LoginPanel({ onLogin }: LoginPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('login')

  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regName, setRegName] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    // Admin login check
    if (loginEmail === ADMIN_EMAIL && loginPassword === ADMIN_PASSWORD) {
      const adminUser: MyanosUser = {
        id: 'admin-001',
        email: ADMIN_EMAIL,
        name: 'Administrator',
        role: 'admin',
        aiCredits: 999999,
        createdAt: new Date().toISOString(),
      }
      onLogin(adminUser)
      setLoading(false)
      return
    }

    // Regular user login
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        onLogin(data.user)
      } else {
        setError(data.error || 'Login failed')
      }
    } catch (err: any) {
      setError(err.message || 'Connection error')
    }

    setLoading(false)
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: regEmail, 
          password: regPassword, 
          name: regName 
        }),
      })

      const data = await response.json()

      if (data.success && data.user) {
        onLogin(data.user)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (err: any) {
      setError(err.message || 'Connection error')
    }

    setLoading(false)
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiMyMDI0MmEiIGZpbGwtb3BhY2l0eT0iMC40Ij48cGF0aCBkPSJNMzYgMzBoLTJ2LTJoMnYyem0tMiAwSDJ2MmgzMnYtMnptMCAydjI4aDJ2LTI4aC0yeiIvPjwvZz48L2c+PC9zdmc+')] opacity-20"></div>
      
      <Card className="w-full max-w-md bg-slate-900/80 border-slate-700 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center">
          <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 via-cyan-500 to-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/25">
            <Shield className="w-10 h-10 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            MyanOS
          </CardTitle>
          <CardDescription className="text-slate-400 text-base">
            မြန်မာ့ ဝဘ် ကွန်ပျူတာစနစ်
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 bg-slate-800/50">
              <TabsTrigger value="login" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-emerald-600 data-[state=active]:to-cyan-600">
                <LogIn className="w-4 h-4 mr-2" />
                Login
              </TabsTrigger>
              <TabsTrigger value="register" className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-cyan-600 data-[state=active]:to-blue-600">
                <UserPlus className="w-4 h-4 mr-2" />
                Register
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Password</label>
                  <Input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-emerald-500 focus:ring-emerald-500/20"
                    required
                  />
                </div>
                
                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 h-11 font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <LogIn className="w-4 h-4 mr-2" />
                      Login
                    </>
                  )}
                </Button>
              </form>


            </TabsContent>

            <TabsContent value="register" className="mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Name</label>
                  <Input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Your name"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Email</label>
                  <Input
                    type="email"
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                    required
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Password</label>
                  <Input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Create password (min 6 characters)"
                    className="bg-slate-800/50 border-slate-600 text-white placeholder:text-slate-500 focus:border-cyan-500 focus:ring-cyan-500/20"
                    required
                    minLength={6}
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg border border-red-500/20">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button 
                  type="submit" 
                  className="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 h-11 font-medium"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="w-4 h-4 mr-2" />
                      Create Account
                    </>
                  )}
                </Button>
              </form>

              <div className="mt-4 p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                <p className="text-sm text-emerald-400 text-center">
                  🎁 Register to get <span className="font-bold">100 free AI credits</span>
                </p>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
