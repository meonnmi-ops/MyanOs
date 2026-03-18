import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'myanos-secret-key-2024'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ user: null })
    }

    // Verify token
    let decoded: any
    try {
      decoded = verify(token, JWT_SECRET)
    } catch {
      return NextResponse.json({ user: null })
    }

    // Check for admin token
    if (decoded.userId === 'admin-001' && decoded.role === 'admin') {
      return NextResponse.json({
        user: {
          id: 'admin-001',
          email: 'admin@myanos.local',
          name: 'Administrator',
          role: 'admin',
          aiCredits: 999999,
        }
      })
    }

    // Check session
    const session = await db.session.findUnique({ 
      where: { token },
      include: { user: true }
    })

    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ user: null })
    }

    // Check if user is active
    if (!session.user.isActive) {
      return NextResponse.json({ user: null })
    }

    return NextResponse.json({
      user: {
        id: session.user.id,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
        aiCredits: session.user.aiCredits,
      }
    })
  } catch (error) {
    return NextResponse.json({ user: null })
  }
}
