'use client'

import React, { useState, useEffect } from 'react'
import { MyanOSDesktop } from '@/components/myanos'
import { AuthPage } from '@/components/myanos/AuthPage'
import { AdminPanel } from '@/components/myanos/AdminPanel'
import { useAuthStore } from '@/stores/auth-store'
import { Loader2 } from 'lucide-react'

export default function Home() {
  const { user, token } = useAuthStore()
  const [showAdmin, setShowAdmin] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)

  // Check session on mount
  useEffect(() => {
    const verify = async () => {
      const storedToken = useAuthStore.getState().token
      if (!storedToken) {
        setCheckingAuth(false)
        return
      }

      try {
        const res = await fetch('/api/auth/session', {
          headers: { 'Authorization': `Bearer ${storedToken}` }
        })
        const data = await res.json()
        
        if (data.user) {
          useAuthStore.getState().setUser(data.user)
        } else {
          useAuthStore.getState().logout()
        }
      } catch {
        useAuthStore.getState().logout()
      }
      
      setCheckingAuth(false)
    }
    
    verify()
  }, [])

  // Check if user is admin
  const isAdmin = user?.role === 'admin'

  if (checkingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  // Not authenticated - show login
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <AuthPage onSuccess={() => {}} />
      </div>
    )
  }

  // Authenticated - show desktop
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <MyanOSDesktop 
        onOpenAdmin={() => setShowAdmin(true)}
        isAdmin={isAdmin}
      />
      
      {/* Admin Panel Overlay */}
      {showAdmin && isAdmin && (
        <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
          <div className="w-full max-w-4xl h-[90vh] bg-slate-900 rounded-lg overflow-hidden shadow-2xl">
            <AdminPanel onClose={() => setShowAdmin(false)} />
          </div>
        </div>
      )}
    </div>
  )
}
