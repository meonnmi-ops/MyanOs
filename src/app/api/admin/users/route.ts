import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'myanos-secret-key-2024'

async function checkAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) return null
  
  try {
    const decoded: any = verify(token, JWT_SECRET)
    const session = await db.session.findUnique({
      where: { token },
      include: { user: true }
    })
    
    if (!session || !session.user || session.user.role !== 'admin') {
      return null
    }
    
    return session.user
  } catch {
    return null
  }
}

// Get all users
export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      lastLogin: true,
      createdAt: true,
      _count: { select: { aiUsageLogs: true } }
    },
    orderBy: { createdAt: 'desc' }
  })

  return NextResponse.json({ users })
}

// Update user
export async function PUT(request: NextRequest) {
  const admin = await checkAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { userId, isActive, role } = await request.json()

  const user = await db.user.update({
    where: { id: userId },
    data: { isActive, role }
  })

  return NextResponse.json({ success: true, user })
}

// Delete user
export async function DELETE(request: NextRequest) {
  const admin = await checkAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')

  if (!userId) {
    return NextResponse.json({ error: 'User ID required' }, { status: 400 })
  }

  await db.user.delete({ where: { id: userId } })

  return NextResponse.json({ success: true })
}
