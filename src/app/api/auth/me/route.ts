import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    // In a real app, you'd check session/token
    // For now, return not authenticated
    return NextResponse.json({ user: null })
  } catch {
    return NextResponse.json({ user: null })
  }
}
