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

// Get system logs
export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const logs = await db.systemLog.findMany({
    include: { 
      user: { select: { email: true, name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 100
  })

  return NextResponse.json({ logs })
}
