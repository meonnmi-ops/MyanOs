'use client'
import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Folder, File, Plus, Trash2, FilePlus, FolderPlus } from 'lucide-react'
import { useMyanOSStore } from '@/stores/myanos-store'

interface FileManagerAppProps { windowId: string }

export function FileManagerApp({ windowId: _windowId }: FileManagerAppProps) {
  const { files, createFile, deleteFile, currentPath, language } = useMyanOSStore()
  const [selected, setSelected] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [newName, setNewName] = useState('')
  const [newType, setNewType] = useState<'file' | 'folder'>('file')

  const handleCreate = () => { if (newName.trim()) { createFile(newName, newType, ''); setNewName(''); setShowNew(false) } }

  return (
    <div className="h-full flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800/50 border-b border-slate-700">
        <div className="flex items-center text-[10px] text-slate-400"><Folder className="w-3 h-3 mr-1" />{currentPath}</div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" onClick={() => { setShowNew(true); setNewType('folder') }}><FolderPlus className="w-3 h-3 mr-0.5" />{language === 'mm' ? 'ဖိုင်တာ' : 'Folder'}</Button>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-white" onClick={() => { setShowNew(true); setNewType('file') }}><FilePlus className="w-3 h-3 mr-0.5" />{language === 'mm' ? 'ဖိုင်' : 'File'}</Button>
        </div>
      </div>
      {showNew && (
        <div className="p-1.5 bg-slate-800/30 border-b border-slate-700 flex items-center gap-1.5">
          <span className="text-[10px]">{newType === 'folder' ? '📁' : '📄'}</span>
          <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder={language === 'mm' ? 'အမည်' : 'Name'} className="flex-1 h-6 bg-slate-800 border border-slate-600 text-white text-[10px] rounded px-1.5" onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setShowNew(false) }} autoFocus />
          <Button size="sm" className="h-6 bg-green-600 hover:bg-green-700 text-[10px]" onClick={handleCreate}>{language === 'mm' ? 'ပြုလုပ်' : 'Create'}</Button>
          <Button variant="ghost" size="sm" className="h-6 text-[10px] text-slate-400" onClick={() => setShowNew(false)}>✕</Button>
        </div>
      )}
      <ScrollArea className="flex-1 p-1.5">
        <div className="space-y-0.5">
          {files.map((file) => (
            <div key={file.name} className={`flex items-center justify-between p-1.5 rounded cursor-pointer transition-colors ${selected === file.name ? 'bg-blue-600/20 border border-blue-500/50' : 'hover:bg-slate-800/50 border border-transparent'}`} onClick={() => setSelected(file.name)}>
              <div className="flex items-center gap-1.5">{file.type === 'folder' ? <Folder className="w-4 h-4 text-yellow-400" /> : <File className="w-4 h-4 text-slate-400" />}<span className="text-[10px] text-slate-200">{file.name}</span></div>
              {selected === file.name && <Button variant="ghost" size="sm" className="h-5 w-5 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20" onClick={(e) => { e.stopPropagation(); deleteFile(file.name); setSelected(null) }}><Trash2 className="w-2.5 h-2.5" /></Button>}
            </div>
          ))}
        </div>
        {files.length === 0 && <div className="text-center py-6 text-slate-500 text-xs"><Folder className="w-8 h-8 mx-auto mb-1 opacity-50" /><p>{language === 'mm' ? 'ဖိုင်တာ ဗလာ' : 'Empty folder'}</p></div>}
      </ScrollArea>
      <div className="flex items-center justify-between px-2 py-1 bg-slate-800/50 border-t border-slate-700 text-[10px] text-slate-500">
        <span>{files.length} {language === 'mm' ? 'ပစ္စည်း' : 'items'}</span>
        {selected && <span>{language === 'mm' ? 'ရွေးထား:' : 'Selected:'} {selected}</span>}
      </div>
    </div>
  )
}
