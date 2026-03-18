import { NextRequest, NextResponse } from 'next/server'
import { verify } from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'myanos-secret-key-2024'

// System settings (in-memory - use database in production)
let systemSettings = {
  aiEnabled: true,
  aiUserLimit: 50,
  terminalEnabled: true,
  registerEnabled: true,
  maintenanceMode: false,
}

// Export for use in other routes
export function getSystemSettings() {
  return systemSettings
}

async function checkAdmin(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '')
  
  if (!token) return null
  
  try {
    const decoded: any = verify(token, JWT_SECRET)
    // Use dynamic import to avoid circular dependency
    const { db } = await import('@/lib/db')
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

// Get settings
export async function GET(request: NextRequest) {
  const admin = await checkAdmin(request)
  
  const publicSettings = {
    aiEnabled: systemSettings.aiEnabled,
    terminalEnabled: systemSettings.terminalEnabled,
    registerEnabled: systemSettings.registerEnabled,
    maintenanceMode: systemSettings.maintenanceMode,
  }

  if (admin) {
    return NextResponse.json({ settings: systemSettings })
  }
  
  return NextResponse.json({ settings: publicSettings })
}

// Update settings
export async function POST(request: NextRequest) {
  const admin = await checkAdmin(request)
  if (!admin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const updates = await request.json()
  systemSettings = { ...systemSettings, ...updates }

  return NextResponse.json({ success: true, settings: systemSettings })
}
