import { create } from 'zustand'

export type AppId = 'terminal' | 'ai-agent' | 'phone-repair' | 'calculator' | 'notepad' | 'file-manager' | 'settings' | 'database'

export interface WindowState {
  id: string
  appId: AppId
  title: string
  titleMM: string
  position: { x: number; y: number }
  size: { width: number; height: number }
  isMinimized: boolean
  isMaximized: boolean
  zIndex: number
}

export interface AppDefinition {
  id: AppId
  title: string
  titleMM: string
  icon: string
  defaultSize: { width: number; height: number }
}

export interface MyanOSState {
  // Windows
  windows: WindowState[]
  activeWindowId: string | null
  nextZIndex: number
  startMenuOpen: boolean

  // Settings
  theme: 'light' | 'dark'
  wallpaper: string
  showDesktopIcons: boolean
  fontSize: number
  language: 'en' | 'mm'

  // AI Agent
  aiMessages: Array<{ role: 'user' | 'assistant'; content: string }>
  apiKey: string
  apiConfigured: boolean
  aiLoading: boolean

  // Terminal
  terminalHistory: Array<{ type: 'input' | 'output'; content: string }>
  terminalConnected: boolean
  terminalLoading: boolean

  // Phone Repair
  adbDevices: Array<{ id: string; name: string; type: string }>
  selectedDevice: string | null

  // File System
  files: Array<{ name: string; type: 'file' | 'folder'; content?: string }>
  currentPath: string

  // Notepad
  notepadContent: string
  notepadFileName: string

  // Calculator
  calcDisplay: string
  calcHistory: string

  // Actions
  openWindow: (appId: AppId) => void
  closeWindow: (windowId: string) => void
  minimizeWindow: (windowId: string) => void
  maximizeWindow: (windowId: string) => void
  focusWindow: (windowId: string) => void
  updateWindowPosition: (windowId: string, position: { x: number; y: number }) => void
  updateWindowSize: (windowId: string, size: { width: number; height: number }) => void
  toggleStartMenu: () => void

  // Settings Actions
  setTheme: (theme: 'light' | 'dark') => void
  setWallpaper: (wallpaper: string) => void
  setFontSize: (size: number) => void
  toggleDesktopIcons: () => void
  setLanguage: (lang: 'en' | 'mm') => void

  // AI Actions
  addAIMessage: (role: 'user' | 'assistant', content: string) => void
  clearAIMessages: () => void
  setApiKey: (key: string) => void
  setApiConfigured: (configured: boolean) => void
  setAiLoading: (loading: boolean) => void

  // Terminal Actions
  addTerminalLine: (type: 'input' | 'output', content: string) => void
  clearTerminal: () => void
  setTerminalConnected: (connected: boolean) => void
  setTerminalLoading: (loading: boolean) => void

  // Phone Repair Actions
  setAdbDevices: (devices: Array<{ id: string; name: string; type: string }>) => void
  setSelectedDevice: (deviceId: string | null) => void

  // File System Actions
  setFiles: (files: Array<{ name: string; type: 'file' | 'folder'; content?: string }>) => void
  setCurrentPath: (path: string) => void
  createFile: (name: string, type: 'file' | 'folder', content?: string) => void
  deleteFile: (name: string) => void

  // Notepad Actions
  setNotepadContent: (content: string) => void
  setNotepadFileName: (name: string) => void

  // Calculator Actions
  setCalcDisplay: (value: string) => void
  setCalcHistory: (value: string) => void
}

export const APPS: AppDefinition[] = [
  { id: 'terminal', title: 'Terminal', titleMM: 'တာမီနယ်', icon: '🖥️', defaultSize: { width: 700, height: 450 } },
  { id: 'ai-agent', title: 'AI Agent', titleMM: 'အေအိုင်အေးဂျင့်', icon: '🤖', defaultSize: { width: 800, height: 600 } },
  { id: 'phone-repair', title: 'Phone Repair', titleMM: 'ဖုန်းပြုပြင်ရေး', icon: '📱', defaultSize: { width: 750, height: 550 } },
  { id: 'calculator', title: 'Calculator', titleMM: 'ဂဏန်းတွက်စက်', icon: '🧮', defaultSize: { width: 320, height: 480 } },
  { id: 'notepad', title: 'Notepad', titleMM: 'မှတ်စုစာအုပ်', icon: '📝', defaultSize: { width: 600, height: 450 } },
  { id: 'file-manager', title: 'File Manager', titleMM: 'ဖိုင်မန်နေဂျာ', icon: '📁', defaultSize: { width: 700, height: 500 } },
  { id: 'settings', title: 'Settings', titleMM: 'ဆက်တင်များ', icon: '⚙️', defaultSize: { width: 500, height: 450 } },
  { id: 'database', title: 'Database', titleMM: 'ဒေတာဘေ့စ', icon: '🗄️', defaultSize: { width: 800, height: 550 } },
]

let windowCounter = 0

export const useMyanOSStore = create<MyanOSState>((set, get) => ({
  // Initial State
  windows: [],
  activeWindowId: null,
  nextZIndex: 100,
  startMenuOpen: false,
  theme: 'dark',
  wallpaper: 'gradient',
  showDesktopIcons: true,
  fontSize: 14,
  language: 'mm',
  aiMessages: [],
  apiKey: '',
  apiConfigured: false,
  aiLoading: false,
  terminalHistory: [],
  terminalConnected: false,
  terminalLoading: false,
  adbDevices: [],
  selectedDevice: null,
  files: [
    { name: 'Documents', type: 'folder' },
    { name: 'Downloads', type: 'folder' },
    { name: 'Pictures', type: 'folder' },
    { name: 'readme.txt', type: 'file', content: 'MyanOS မှ ကြိုဆိုပါသည်!' },
  ],
  currentPath: '/home/user',
  notepadContent: '',
  notepadFileName: 'untitled.txt',
  calcDisplay: '0',
  calcHistory: '',

  // Window Actions
  openWindow: (appId) => {
    const app = APPS.find(a => a.id === appId)
    if (!app) return

    const windowId = `${appId}-${++windowCounter}`
    const offset = (get().windows.length % 5) * 30

    const newWindow: WindowState = {
      id: windowId,
      appId,
      title: app.title,
      titleMM: app.titleMM,
      position: { x: 100 + offset, y: 50 + offset },
      size: app.defaultSize,
      isMinimized: false,
      isMaximized: false,
      zIndex: get().nextZIndex,
    }

    set(state => ({
      windows: [...state.windows, newWindow],
      activeWindowId: windowId,
      nextZIndex: state.nextZIndex + 1,
      startMenuOpen: false,
    }))
  },

  closeWindow: (windowId) => {
    set(state => ({
      windows: state.windows.filter(w => w.id !== windowId),
      activeWindowId: state.activeWindowId === windowId ? null : state.activeWindowId,
    }))
  },

  minimizeWindow: (windowId) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === windowId ? { ...w, isMinimized: true } : w
      ),
      activeWindowId: state.activeWindowId === windowId ? null : state.activeWindowId,
    }))
  },

  maximizeWindow: (windowId) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === windowId ? { ...w, isMaximized: !w.isMaximized } : w
      ),
    }))
  },

  focusWindow: (windowId) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === windowId
          ? { ...w, zIndex: state.nextZIndex, isMinimized: false }
          : w
      ),
      activeWindowId: windowId,
      nextZIndex: state.nextZIndex + 1,
    }))
  },

  updateWindowPosition: (windowId, position) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === windowId ? { ...w, position } : w
      ),
    }))
  },

  updateWindowSize: (windowId, size) => {
    set(state => ({
      windows: state.windows.map(w =>
        w.id === windowId ? { ...w, size } : w
      ),
    }))
  },

  toggleStartMenu: () => {
    set(state => ({ startMenuOpen: !state.startMenuOpen }))
  },

  // Settings Actions
  setTheme: (theme) => set({ theme }),
  setWallpaper: (wallpaper) => set({ wallpaper }),
  setFontSize: (fontSize) => set({ fontSize }),
  toggleDesktopIcons: () => set(state => ({ showDesktopIcons: !state.showDesktopIcons })),
  setLanguage: (language) => set({ language }),

  // AI Actions
  addAIMessage: (role, content) => {
    set(state => ({
      aiMessages: [...state.aiMessages, { role, content }],
    }))
  },

  clearAIMessages: () => set({ aiMessages: [] }),

  setApiKey: (key) => set({ apiKey: key }),
  setApiConfigured: (configured) => set({ apiConfigured: configured }),
  setAiLoading: (loading) => set({ aiLoading: loading }),

  // Terminal Actions
  addTerminalLine: (type, content) => {
    set(state => ({
      terminalHistory: [...state.terminalHistory, { type, content }],
    }))
  },

  clearTerminal: () => set({ terminalHistory: [] }),
  setTerminalConnected: (connected) => set({ terminalConnected: connected }),
  setTerminalLoading: (loading) => set({ terminalLoading: loading }),

  // Phone Repair Actions
  setAdbDevices: (devices) => set({ adbDevices: devices }),
  setSelectedDevice: (deviceId) => set({ selectedDevice: deviceId }),

  // File System Actions
  setFiles: (files) => set({ files }),
  setCurrentPath: (path) => set({ currentPath: path }),

  createFile: (name, type, content) => {
    set(state => ({
      files: [...state.files, { name, type, content }],
    }))
  },

  deleteFile: (name) => {
    set(state => ({
      files: state.files.filter(f => f.name !== name),
    }))
  },

  // Notepad Actions
  setNotepadContent: (content) => set({ notepadContent: content }),
  setNotepadFileName: (name) => set({ notepadFileName: name }),

  // Calculator Actions
  setCalcDisplay: (value) => set({ calcDisplay: value }),
  setCalcHistory: (value) => set({ calcHistory: value }),
}))
