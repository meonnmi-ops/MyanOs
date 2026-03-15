'use client'

import React, { useState } from 'react'
import { useMyanOSStore } from '@/stores/myanos-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Folder, 
  File, 
  ChevronRight, 
  ChevronDown,
  Plus,
  Trash2,
  FilePlus,
  FolderPlus,
  Home,
  ArrowUp
} from 'lucide-react'

interface FileManagerAppProps {
  windowId: string
}

export function FileManagerApp({ windowId }: FileManagerAppProps) {
  const { files, currentPath, setFiles, setCurrentPath, createFile, deleteFile, language } = useMyanOSStore()
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [showNewFile, setShowNewFile] = useState(false)
  const [newFileName, setNewFileName] = useState('')
  const [newFileType, setNewFileType] = useState<'file' | 'folder'>('file')

  const handleCreateFile = () => {
    if (newFileName.trim()) {
      createFile(newFileName, newFileType, '')
      setNewFileName('')
      setShowNewFile(false)
    }
  }

  const handleDelete = (name: string) => {
    if (confirm(language === 'mm' ? `"${name}" ကို ဖျက်မှာ သေချာပါသလား?` : `Are you sure you want to delete "${name}"?`)) {
      deleteFile(name)
      setSelectedFile(null)
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            onClick={() => setCurrentPath('/home/user')}
          >
            <Home className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-slate-400 hover:text-white"
            onClick={() => setCurrentPath(currentPath.split('/').slice(0, -1).join('/') || '/')}
          >
            <ArrowUp className="w-4 h-4" />
          </Button>
          <div className="flex items-center text-sm text-slate-400 bg-slate-800 px-2 py-1 rounded">
            <Folder className="w-4 h-4 mr-1" />
            {currentPath}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            onClick={() => { setShowNewFile(true); setNewFileType('folder') }}
          >
            <FolderPlus className="w-3 h-3 mr-1" />
            {language === 'mm' ? 'ဖိုင်တာ' : 'Folder'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-slate-400 hover:text-white"
            onClick={() => { setShowNewFile(true); setNewFileType('file') }}
          >
            <FilePlus className="w-3 h-3 mr-1" />
            {language === 'mm' ? 'ဖိုင်' : 'File'}
          </Button>
        </div>
      </div>

      {/* New File Dialog */}
      {showNewFile && (
        <div className="p-2 bg-slate-800/50 border-b border-slate-700 flex items-center gap-2">
          <span className="text-sm text-slate-400">
            {newFileType === 'folder' ? '📁' : '📄'}
          </span>
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder={language === 'mm' ? 'အမည်ထည့်ပါ...' : 'Enter name...'}
            className="flex-1 h-7 bg-slate-800 border-slate-600 text-white text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreateFile()
              if (e.key === 'Escape') setShowNewFile(false)
            }}
            autoFocus
          />
          <Button
            size="sm"
            className="h-7 bg-green-600 hover:bg-green-700"
            onClick={handleCreateFile}
          >
            {language === 'mm' ? 'ပြုလုပ်မည်' : 'Create'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-slate-400"
            onClick={() => setShowNewFile(false)}
          >
            ✕
          </Button>
        </div>
      )}

      {/* File List */}
      <ScrollArea className="flex-1 p-2">
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.name}
              className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-colors ${
                selectedFile === file.name
                  ? 'bg-blue-600/20 border border-blue-500/50'
                  : 'hover:bg-slate-800/50 border border-transparent'
              }`}
              onClick={() => setSelectedFile(file.name)}
              onDoubleClick={() => {
                if (file.type === 'folder') {
                  setCurrentPath(`${currentPath}/${file.name}`)
                }
              }}
            >
              <div className="flex items-center gap-2">
                {file.type === 'folder' ? (
                  <Folder className="w-5 h-5 text-yellow-400" />
                ) : (
                  <File className="w-5 h-5 text-slate-400" />
                )}
                <span className="text-sm text-slate-200">{file.name}</span>
              </div>
              {selectedFile === file.name && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                  onClick={(e) => { e.stopPropagation(); handleDelete(file.name) }}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
            </div>
          ))}
        </div>

        {files.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <Folder className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>{language === 'mm' ? 'ဖိုင်တာ ဗလာဖြစ်နေပါသည်' : 'This folder is empty'}</p>
          </div>
        )}
      </ScrollArea>

      {/* Status Bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-slate-800/50 border-t border-slate-700 text-xs text-slate-500">
        <span>{files.length} {language === 'mm' ? 'ပစ္စည်း' : 'items'}</span>
        {selectedFile && (
          <span>{language === 'mm' ? 'ရွေးထားသည်:' : 'Selected:'} {selectedFile}</span>
        )}
      </div>
    </div>
  )
}
