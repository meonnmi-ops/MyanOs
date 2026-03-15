import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hash } from 'bcryptjs'

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, adminKey } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password required' }, { status: 400 })
    }

    // Check if user exists
    const existing = await db.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await hash(password, 10)

    // Check if this is admin registration
    const ADMIN_KEY = process.env.MYANOS_ADMIN_KEY || 'myanos-admin-2024'
    const isAdmin = adminKey === ADMIN_KEY

    // Create user
    const user = await db.user.create({
      data: {
        email,
        name: name || email.split('@')[0],
        password: hashedPassword,
        role: isAdmin ? 'admin' : 'user',
      }
    })

    // Log
    await db.systemLog.create({
      data: { userId: user.id, action: 'register', details: `User registered as ${user.role}` }
    })

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      }
    })
  } catch (error: any) {
    console.error('Register error:', error)
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 })
  }
}
