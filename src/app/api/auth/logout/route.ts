import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (token) {
      // Delete session
      await db.session.deleteMany({ where: { token } })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ success: true })
  }
}
