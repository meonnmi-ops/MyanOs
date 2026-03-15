import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash, compare } from 'bcryptjs'
import { sign, verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'myanos-secret-key-2024'

// Hardcoded admin credentials (for system admin)
const ADMIN_EMAIL = 'admin@myanos.local'
const ADMIN_PASSWORD = 'myanos-admin-2024'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Check for hardcoded admin login
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const token = sign({ userId: 'admin-001', role: 'admin' }, JWT_SECRET, { expiresIn: '7d' })
      
      return NextResponse.json({
        user: {
          id: 'admin-001',
          email: ADMIN_EMAIL,
          name: 'Administrator',
          role: 'admin',
          aiCredits: 999999,
        },
        token,
      })
    }

    // Find user
    const user = await db.user.findUnique({ where: { email } })
    
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Check if active
    if (!user.isActive) {
      return NextResponse.json({ error: 'Account is disabled' }, { status: 403 })
    }

    // Verify password
    const valid = await compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    // Create session token
    const token = sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    // Save session
    await db.session.create({
      data: {
        userId: user.id,
        token,
        expiresAt,
      }
    })

    // Update last login
    await db.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    })

    // Log
    await db.systemLog.create({
      data: { userId: user.id, action: 'login', details: 'User logged in' }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        aiCredits: user.aiCredits,
      },
      token,
    })
  } catch (error: any) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Login failed' }, { status: 500 })
  }
}
