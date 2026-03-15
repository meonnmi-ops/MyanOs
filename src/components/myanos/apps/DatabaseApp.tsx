'use client'

import React, { useState } from 'react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Database, 
  Play, 
  Table, 
  Columns,
  Server,
  Loader2,
  CheckCircle,
  XCircle,
  RefreshCw
} from 'lucide-react'

interface DatabaseAppProps {
  windowId: string
}

export function DatabaseApp({ windowId }: DatabaseAppProps) {
  const { language } = useMyanOSStore()
  const [connection, setConnection] = useState({
    host: 'localhost',
    port: '5432',
    database: 'myanos',
    user: 'myanos',
    password: 'myanos123'
  })
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [tables, setTables] = useState<string[]>([])
  const [error, setError] = useState('')

  const testConnection = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch('/api/database?XTransformPort=3002', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'connect', ...connection }),
      })
      
      const data = await response.json()
      
      if (data.success) {
        setConnected(true)
        loadTables()
      } else {
        setError(data.error || 'Connection failed')
      }
    } catch (err) {
      setError(language === 'mm' ? 'ဆက်သွယ်မှု အမှားအယွင့်' : 'Connection error')
    }
    
    setLoading(false)
  }

  const loadTables = async () => {
    try {
      const response = await fetch('/api/database?XTransformPort=3002', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tables', ...connection }),
      })
      
      const data = await response.json()
      
      if (data.tables) {
        setTables(data.tables)
      }
    } catch (err) {
      console.error('Failed to load tables')
    }
  }

  const executeQuery = async () => {
    if (!query.trim()) return
    
    setLoading(true)
    setError('')
    setResults([])
    setColumns([])
    
    try {
      const response = await fetch('/api/database?XTransformPort=3002', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'query', query, ...connection }),
      })
      
      const data = await response.json()
      
      if (data.error) {
        setError(data.error)
      } else {
        setResults(data.results || [])
        setColumns(data.columns || [])
      }
    } catch (err) {
      setError(language === 'mm' ? 'Query အမှားအယွင့်' : 'Query error')
    }
    
    setLoading(false)
  }

  const quickQueries = [
    { label: 'SELECT *', query: 'SELECT * FROM users LIMIT 10;' },
    { label: 'CREATE TABLE', query: 'CREATE TABLE users (\n  id SERIAL PRIMARY KEY,\n  name VARCHAR(100),\n  email VARCHAR(100)\n);' },
    { label: 'INSERT', query: "INSERT INTO users (name, email) VALUES ('John', 'john@example.com');" },
  ]

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-orange-400" />
          <span className="text-slate-200 font-medium">
            {language === 'mm' ? 'ဒေတာဘေ့စ' : 'Database'}
          </span>
          <span className="text-xs text-slate-500">PostgreSQL</span>
        </div>
        <div className="flex items-center gap-2">
          {connected ? (
            <div className="flex items-center gap-1 text-green-400 text-xs">
              <CheckCircle className="w-3 h-3" />
              {language === 'mm' ? 'ဆက်သွယ်ပြီး' : 'Connected'}
            </div>
          ) : (
            <div className="flex items-center gap-1 text-red-400 text-xs">
              <XCircle className="w-3 h-3" />
              {language === 'mm' ? 'မဆက်သွယ်ရသေး' : 'Disconnected'}
            </div>
          )}
        </div>
      </div>

      {/* Connection */}
      <div className="p-3 bg-slate-900/50 border-b border-slate-700 space-y-2">
        <div className="grid grid-cols-4 gap-2">
          <Input
            value={connection.host}
            onChange={(e) => setConnection({ ...connection, host: e.target.value })}
            placeholder="Host"
            className="h-7 bg-slate-800 border-slate-600 text-white text-xs"
          />
          <Input
            value={connection.port}
            onChange={(e) => setConnection({ ...connection, port: e.target.value })}
            placeholder="Port"
            className="h-7 bg-slate-800 border-slate-600 text-white text-xs"
          />
          <Input
            value={connection.database}
            onChange={(e) => setConnection({ ...connection, database: e.target.value })}
            placeholder="Database"
            className="h-7 bg-slate-800 border-slate-600 text-white text-xs"
          />
          <Button
            size="sm"
            className="h-7 bg-orange-600 hover:bg-orange-700"
            onClick={testConnection}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Server className="w-3 h-3 mr-1" />
            )}
            {language === 'mm' ? 'ဆက်သွယ်မည်' : 'Connect'}
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Input
            value={connection.user}
            onChange={(e) => setConnection({ ...connection, user: e.target.value })}
            placeholder="User"
            className="h-7 bg-slate-800 border-slate-600 text-white text-xs"
          />
          <Input
            type="password"
            value={connection.password}
            onChange={(e) => setConnection({ ...connection, password: e.target.value })}
            placeholder="Password"
            className="h-7 bg-slate-800 border-slate-600 text-white text-xs"
          />
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={loadTables}
            disabled={!connected}
          >
            <RefreshCw className="w-3 h-3 mr-1" />
            {language === 'mm' ? 'Tables ပြန်ဖွင့်' : 'Refresh Tables'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Tables Sidebar */}
        {connected && tables.length > 0 && (
          <div className="w-48 border-r border-slate-700 bg-slate-900/30">
            <div className="px-2 py-1.5 text-xs font-medium text-slate-400 border-b border-slate-700">
              <Table className="w-3 h-3 inline mr-1" />
              {language === 'mm' ? 'Tables' : 'Tables'}
            </div>
            <ScrollArea className="p-1">
              {tables.map((table) => (
                <button
                  key={table}
                  className="w-full text-left px-2 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded"
                  onClick={() => setQuery(`SELECT * FROM ${table} LIMIT 10;`)}
                >
                  <Table className="w-3 h-3 inline mr-1 text-orange-400" />
                  {table}
                </button>
              ))}
            </ScrollArea>
          </div>
        )}

        {/* Query & Results */}
        <div className="flex-1 flex flex-col">
          {/* Query Editor */}
          <div className="p-2 border-b border-slate-700">
            <div className="flex gap-1 mb-2">
              {quickQueries.map((q, i) => (
                <Button
                  key={i}
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs text-slate-400 hover:text-white"
                  onClick={() => setQuery(q.query)}
                >
                  {q.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={language === 'mm' ? 'SQL query ရိုက်ထည့်ပါ...' : 'Enter SQL query...'}
                className="flex-1 h-20 bg-slate-800 border border-slate-600 rounded p-2 text-sm text-white font-mono resize-none focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
              <Button
                className="self-end bg-orange-600 hover:bg-orange-700"
                onClick={executeQuery}
                disabled={loading || !query.trim()}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="p-2 bg-red-900/20 border-b border-red-900/50 text-red-400 text-sm">
              ❌ {error}
            </div>
          )}

          {/* Results */}
          <ScrollArea className="flex-1">
            {results.length > 0 ? (
              <table className="w-full text-sm">
                <thead className="bg-slate-800/50 sticky top-0">
                  <tr>
                    {columns.map((col) => (
                      <th key={col} className="px-3 py-2 text-left text-slate-300 font-medium">
                        <Columns className="w-3 h-3 inline mr-1" />
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {results.map((row, i) => (
                    <tr key={i} className="border-b border-slate-800 hover:bg-slate-800/30">
                      {columns.map((col) => (
                        <td key={col} className="px-3 py-2 text-slate-300">
                          {String(row[col] ?? 'NULL')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="text-center py-8 text-slate-500">
                <Database className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>{language === 'mm' ? 'Query ရလဒ်များ ဤနေရာတွင်ပြပါမည်' : 'Query results will appear here'}</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  )
}
