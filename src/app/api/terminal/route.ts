import { NextRequest, NextResponse } from 'next/server'

// Terminal API - forwards to mini-service on port 3001
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { command } = body

    if (!command) {
      return NextResponse.json({ error: 'Command required' }, { status: 400 })
    }

    // Try to connect to terminal mini-service
    try {
      const response = await fetch('http://localhost:3001/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
      })

      const data = await response.json()
      return NextResponse.json(data)
    } catch (fetchError) {
      // If mini-service is not available, run command directly (limited)
      const { exec } = await import('child_process')
      const util = await import('util')
      const execAsync = util.promisify(exec)

      try {
        // Only allow safe commands
        const safeCommands = ['ls', 'pwd', 'whoami', 'date', 'echo', 'uname', 'df', 'free', 'uptime', 'hostname']
        const cmdBase = command.split(' ')[0]
        
        if (!safeCommands.includes(cmdBase) && !command.startsWith('adb ')) {
          // For non-safe commands, simulate response
          if (command === 'help') {
            return NextResponse.json({
              output: `
MyanOS Terminal - Available Commands:
=====================================
Navigation: ls, pwd, cd
System: whoami, date, uname, hostname, uptime
Files: cat, echo, touch, mkdir
ADB: adb devices, adb connect, adb shell, etc.

For full terminal access, start the terminal backend service on port 3001.
Run: cd mini-services/terminal && bun run dev
`
            })
          }
          
          if (command.startsWith('adb ')) {
            // Simulate ADB response for demo
            return NextResponse.json({
              output: `ADB command: ${command}\n\nNote: Connect your Android device and start the terminal backend for real ADB functionality.`
            })
          }

          return NextResponse.json({
            output: `Command '${cmdBase}' requires terminal backend service.\nStart it with: cd mini-services/terminal && bun run dev`
          })
        }

        const { stdout, stderr } = await execAsync(command, {
          timeout: 30000,
          cwd: '/home/z/my-project'
        })

        return NextResponse.json({
          output: stdout || stderr,
          exitCode: 0
        })
      } catch (execError: any) {
        return NextResponse.json({
          output: execError.stdout || execError.stderr || execError.message,
          exitCode: execError.code || 1
        })
      }
    }
  } catch (error: any) {
    console.error('Terminal Error:', error)
    return NextResponse.json(
      { error: error.message || 'Command execution failed' },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json({
    status: 'online',
    mode: 'fallback',
    message: 'Terminal backend not running. Limited commands available.'
  })
}
