/* ═══════════════════════════════════════════════════════
   Myanos Desktop Environment v2.0.0 - Enhanced
   Window management, File Manager, Settings, App Store
   ═══════════════════════════════════════════════════════ */

class MyanosDesktop {
    constructor() {
        this.windows = new Map();
        this.windowIdCounter = 0;
        this.activeWindowId = null;
        this.zIndexCounter = 100;
        this.dragState = null;
        this.resizeState = null;

        // Settings persistence
        this.settings = this.loadSettings();

        // Virtual File System (localStorage-backed)
        this.vfs = this.loadVFS();

        this.apps = [
            { id: 'terminal', name: 'Terminal', icon: '⬛', desc: 'Myanos Terminal', category: 'system' },
            { id: 'files', name: 'File Manager', icon: '📁', desc: 'Browse & manage files', category: 'system' },
            { id: 'monitor', name: 'System Monitor', icon: '📊', desc: 'CPU, RAM, Disk', category: 'system' },
            { id: 'settings', name: 'Settings', icon: '⚙️', desc: 'System settings', category: 'system' },
            { id: 'neofetch', name: 'About Myanos', icon: 'ℹ️', desc: 'System information', category: 'system' },
            { id: 'appstore', name: 'App Store', icon: '🏪', desc: 'Browse & install packages', category: 'system' },
            { id: 'myanmar-code', name: 'Myanmar Code', icon: '🇲🇲', desc: 'Myanmar programming', category: 'dev' },
            { id: 'pkg-manager', name: 'MyanPM', icon: '📦', desc: 'Package manager', category: 'dev' },
            { id: 'toolbox', name: 'Toolbox', icon: '🔧', desc: 'Professional tools', category: 'tools' },
            { id: 'android', name: 'Android', icon: '📱', desc: 'APK management', category: 'apps' },
            { id: 'ps2', name: 'PS2 Games', icon: '🎮', desc: 'PlayStation 2', category: 'apps' },
            { id: 'myanai', name: 'MyanAi', icon: '🤖', desc: 'AI Agent Builder', category: 'ai' },
            { id: 'browser', name: 'Web Browser', icon: '🌐', desc: 'Browse the web', category: 'apps' },
            { id: 'notepad', name: 'Notepad', icon: '📝', desc: 'Text editor', category: 'tools' },
        ];

        this.init();
    }

    // ════════════════════════════════════════
    // Settings Persistence (localStorage)
    // ════════════════════════════════════════

    loadSettings() {
        const defaults = {
            theme: 'dark',
            wallpaper: 'default',
            fontSize: 14,
            language: 'my',
            blur: true,
            animations: true,
            taskbarPosition: 'bottom',
            desktopIcons: true,
            clockFormat: '24h',
        };
        try {
            const saved = localStorage.getItem('myanos_settings');
            if (saved) return { ...defaults, ...JSON.parse(saved) };
        } catch (e) {}
        return defaults;
    }

    saveSettings() {
        try {
            localStorage.setItem('myanos_settings', JSON.stringify(this.settings));
        } catch (e) {}
    }

    applySettings() {
        const s = this.settings;
        // Theme
        if (s.theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
        // Font size
        document.body.style.fontSize = s.fontSize + 'px';
        // Blur
        if (!s.blur) {
            document.body.classList.add('no-blur');
        } else {
            document.body.classList.remove('no-blur');
        }
        // Animations
        if (!s.animations) {
            document.body.classList.add('no-animations');
        } else {
            document.body.classList.remove('no-animations');
        }
        // Wallpaper
        this.applyWallpaper(s.wallpaper);
    }

    applyWallpaper(wp) {
        const wallpaper = document.querySelector('.wallpaper');
        if (!wallpaper) return;
        const wallpapers = {
            default: 'radial-gradient(ellipse at 20% 50%, rgba(122,162,247,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(187,154,247,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(158,206,106,0.04) 0%, transparent 50%)',
            ocean: 'linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)',
            sunset: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 30%, #0f3460 60%, #e94560 100%)',
            forest: 'linear-gradient(135deg, #0d1b2a 0%, #1b2838 30%, #1a3a2a 60%, #2d6a4f 100%)',
            purple: 'linear-gradient(135deg, #1a0a2e 0%, #2d1b69 30%, #5b2c6f 60%, #8e44ad 100%)',
            minimal: 'linear-gradient(180deg, #1a1b2e 0%, #24283b 100%)',
        };
        wallpaper.style.background = wallpapers[wp] || wallpapers.default;
    }

    // ════════════════════════════════════════
    // Virtual File System (localStorage)
    // ════════════════════════════════════════

    loadVFS() {
        const defaults = {
            '/home/meonnmi': {
                type: 'dir', children: ['Desktop', 'Documents', 'Downloads', 'Pictures', 'Music', 'myan-os', '.config']
            },
            '/home/meonnmi/Desktop': { type: 'dir', children: [] },
            '/home/meonnmi/Documents': { type: 'dir', children: ['README.md', 'notes.txt'] },
            '/home/meonnmi/Downloads': { type: 'dir', children: ['setup.sh'] },
            '/home/meonnmi/Pictures': { type: 'dir', children: [] },
            '/home/meonnmi/Music': { type: 'dir', children: [] },
            '/home/meonnmi/myan-os': { type: 'dir', children: ['myanos.py', 'myan_pm.py', 'LICENSE'] },
            '/home/meonnmi/.config': { type: 'dir', children: ['settings.json'] },
        };
        // Files
        const defaultFiles = {
            '/home/meonnmi/Documents/README.md': { type: 'file', content: '# Myanos Web OS\nMyanmar\'s First Advanced Web Operating System\n\nAuthor: Meonnmi-ops', size: 78, modified: '2025-01-15' },
            '/home/meonnmi/Documents/notes.txt': { type: 'file', content: 'Myanos development notes...\n\nPhase 1-7 complete!', size: 42, modified: '2025-01-15' },
            '/home/meonnmi/Downloads/setup.sh': { type: 'file', content: '#!/bin/bash\n# Myanos Setup Script\necho "Installing Myanos..."', size: 65, modified: '2025-01-15' },
            '/home/meonnmi/myan-os/myanos.py': { type: 'file', content: '#!/usr/bin/env python3\n"""Myanos Web OS v2.1.0"""', size: 12308, modified: '2025-01-15' },
            '/home/meonnmi/myan-os/myan_pm.py': { type: 'file', content: '#!/usr/bin/env python3\n"""MyanPM v2.0.0"""', size: 8270, modified: '2025-01-15' },
            '/home/meonnmi/myan-os/LICENSE': { type: 'file', content: 'MIT License\n\nCopyright (c) 2025 Meonnmi-ops', size: 1024, modified: '2025-01-15' },
            '/home/meonnmi/.config/settings.json': { type: 'file', content: '{}', size: 2, modified: '2025-01-15' },
        };
        try {
            const saved = localStorage.getItem('myanos_vfs');
            if (saved) {
                const parsed = JSON.parse(saved);
                return { dirs: parsed.dirs || defaults, files: parsed.files || defaultFiles };
            }
        } catch (e) {}
        return { dirs: defaults, files: defaultFiles };
    }

    saveVFS() {
        try {
            localStorage.setItem('myanos_vfs', JSON.stringify(this.vfs));
        } catch (e) {}
    }

    vfsListDir(path) {
        const dir = this.vfs.dirs[path];
        if (!dir || dir.type !== 'dir') return [];
        return dir.children || [];
    }

    vfsCreateDir(parentPath, name) {
        const parent = this.vfs.dirs[parentPath];
        if (!parent) return false;
        const newPath = parentPath + '/' + name;
        if (this.vfs.dirs[newPath]) return false;
        parent.children.push(name);
        this.vfs.dirs[newPath] = { type: 'dir', children: [] };
        this.saveVFS();
        return true;
    }

    vfsCreateFile(parentPath, name, content = '') {
        const parent = this.vfs.dirs[parentPath];
        if (!parent) return false;
        const fullPath = parentPath + '/' + name;
        if (this.vfs.files[fullPath]) return false;
        parent.children.push(name);
        this.vfs.files[fullPath] = { type: 'file', content, size: content.length, modified: new Date().toISOString().split('T')[0] };
        this.saveVFS();
        return true;
    }

    vfsDelete(path, name) {
        const dir = this.vfs.dirs[path];
        if (!dir) return false;
        const fullPath = path + '/' + name;
        const idx = dir.children.indexOf(name);
        if (idx === -1) return false;
        dir.children.splice(idx, 1);
        // Remove from vfs
        if (this.vfs.dirs[fullPath]) {
            // Recursively delete
            this.vfsRecursiveDelete(fullPath);
            delete this.vfs.dirs[fullPath];
        }
        if (this.vfs.files[fullPath]) {
            delete this.vfs.files[fullPath];
        }
        this.saveVFS();
        return true;
    }

    vfsRecursiveDelete(path) {
        const dir = this.vfs.dirs[path];
        if (!dir) return;
        (dir.children || []).forEach(name => {
            const childPath = path + '/' + name;
            if (this.vfs.dirs[childPath]) {
                this.vfsRecursiveDelete(childPath);
                delete this.vfs.dirs[childPath];
            }
            if (this.vfs.files[childPath]) {
                delete this.vfs.files[childPath];
            }
        });
    }

    vfsRename(path, oldName, newName) {
        const dir = this.vfs.dirs[path];
        if (!dir) return false;
        const idx = dir.children.indexOf(oldName);
        if (idx === -1) return false;
        const oldFullPath = path + '/' + oldName;
        const newFullPath = path + '/' + newName;
        dir.children[idx] = newName;
        // Move in vfs
        if (this.vfs.dirs[oldFullPath]) {
            this.vfs.dirs[newFullPath] = this.vfs.dirs[oldFullPath];
            delete this.vfs.dirs[oldFullPath];
        }
        if (this.vfs.files[oldFullPath]) {
            this.vfs.files[newFullPath] = this.vfs.files[oldFullPath];
            delete this.vfs.files[oldFullPath];
        }
        this.saveVFS();
        return true;
    }

    vfsGetFile(path, name) {
        return this.vfs.files[path + '/' + name] || null;
    }

    // ════════════════════════════════════════
    // Initialization
    // ════════════════════════════════════════

    init() {
        this.applySettings();
        this.renderDesktopIcons();
        this.renderTaskbar();
        this.setupStartMenu();
        this.setupContextMenu();
        this.setupEventListeners();
        this.startClock();
    }

    // ── Desktop Icons ──
    renderDesktopIcons() {
        const container = document.getElementById('desktop-icons');
        if (!container) return;
        container.innerHTML = '';
        this.apps.forEach(app => {
            const el = document.createElement('div');
            el.className = 'desktop-icon';
            el.dataset.appId = app.id;
            el.innerHTML = `<div class="icon">${app.icon}</div><div class="label">${app.name}</div>`;
            el.addEventListener('dblclick', () => this.openApp(app.id));
            el.addEventListener('click', (e) => {
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
                el.classList.add('selected');
            });
            container.appendChild(el);
        });
    }

    // ── Taskbar ──
    renderTaskbar() {
        const tray = document.getElementById('system-tray');
        if (tray) {
            tray.innerHTML = `
                <span class="tray-icon" title="Volume">🔊</span>
                <span class="tray-icon" title="Network">📶</span>
                <span class="tray-icon" title="Battery">🔋</span>
                <span class="tray-icon" title="Notifications" style="cursor:pointer;" onclick="myanos.showNotification('No new notifications')">🔔</span>
                <span id="taskbar-date" style="font-size:11px;color:#565f89;"></span>
                <span id="clock" style="font-weight:600;"></span>
            `;
        }
    }

    startClock() {
        const update = () => {
            const now = new Date();
            const el = document.getElementById('clock');
            const dateEl = document.getElementById('taskbar-date');
            if (el) {
                const h = String(now.getHours()).padStart(2, '0');
                const m = String(now.getMinutes()).padStart(2, '0');
                el.textContent = `${h}:${m}`;
            }
            if (dateEl) {
                const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
                dateEl.textContent = `${now.getDate()} ${months[now.getMonth()]}`;
            }
        };
        update();
        setInterval(update, 10000);
    }

    showNotification(msg) {
        const notif = document.createElement('div');
        notif.className = 'notification-popup';
        notif.textContent = msg;
        notif.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(24,26,41,0.97);border:1px solid rgba(122,162,247,0.3);border-radius:8px;padding:12px 20px;color:#c0caf5;font-size:13px;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.4);backdrop-filter:blur(12px);';
        document.body.appendChild(notif);
        setTimeout(() => { notif.style.opacity = '0'; notif.style.transition = 'opacity 0.3s'; }, 2000);
        setTimeout(() => notif.remove(), 2500);
    }

    updateTaskbarApps() {
        const container = document.getElementById('taskbar-apps');
        if (!container) return;
        container.innerHTML = '';
        this.windows.forEach((win, id) => {
            const el = document.createElement('div');
            el.className = `taskbar-app${id === this.activeWindowId ? ' active' : ''}`;
            el.innerHTML = `<span class="app-icon">${win.app.icon}</span><span>${win.app.name}</span>`;
            el.addEventListener('click', () => {
                if (win.minimized) this.restoreWindow(id);
                else if (id === this.activeWindowId) this.minimizeWindow(id);
                else this.focusWindow(id);
            });
            container.appendChild(el);
        });
    }

    // ── Start Menu ──
    setupStartMenu() {
        const btn = document.getElementById('start-btn');
        const menu = document.getElementById('start-menu');
        if (!btn || !menu) return;
        btn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('open'); });
        document.addEventListener('click', (e) => { if (!menu.contains(e.target)) menu.classList.remove('open'); });
        const searchInput = document.getElementById('start-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                document.querySelectorAll('.start-app-item').forEach(item => {
                    const name = item.querySelector('.app-name').textContent.toLowerCase();
                    item.style.display = name.includes(q) ? 'flex' : 'none';
                });
            });
        }
        this.renderStartMenuApps();
    }

    renderStartMenuApps() {
        const container = document.getElementById('start-apps');
        if (!container) return;
        container.innerHTML = '';
        this.apps.forEach(app => {
            const el = document.createElement('div');
            el.className = 'start-app-item';
            el.innerHTML = `<div class="app-icon">${app.icon}</div><div class="app-info"><div class="app-name">${app.name}</div><div class="app-desc">${app.desc}</div></div>`;
            el.addEventListener('click', () => { this.openApp(app.id); document.getElementById('start-menu')?.classList.remove('open'); });
            container.appendChild(el);
        });
    }

    // ── Context Menu ──
    setupContextMenu() {
        document.getElementById('desktop')?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const menu = document.getElementById('context-menu');
            if (!menu) return;
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
            menu.classList.add('open');
        });
        document.addEventListener('click', () => { document.getElementById('context-menu')?.classList.remove('open'); });
    }

    // ── Window Management ──
    openApp(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;
        for (const [id, win] of this.windows) {
            if (win.app.id === appId) {
                if (win.minimized) this.restoreWindow(id);
                this.focusWindow(id);
                return;
            }
        }
        const id = ++this.windowIdCounter;
        const winEl = this.createWindowElement(id, app);
        document.getElementById('desktop').appendChild(winEl);
        const offset = (id % 8) * 30;
        this.windows.set(id, { id, app, element: winEl, minimized: false, maximized: false, x: 120 + offset, y: 60 + offset, width: 750, height: 500 });
        this.positionWindow(id);
        this.focusWindow(id);
        this.renderWindowContent(id);
        this.updateTaskbarApps();
    }

    createWindowElement(id, app) {
        const el = document.createElement('div');
        el.className = 'myanos-window';
        el.id = `window-${id}`;
        el.innerHTML = `
            <div class="window-titlebar" data-win-id="${id}">
                <div class="window-title">
                    <span class="win-icon">${app.icon}</span>
                    <span class="win-text">${app.name}</span>
                </div>
                <div class="window-controls">
                    <div class="win-ctrl minimize" data-action="minimize" data-win-id="${id}">−</div>
                    <div class="win-ctrl maximize" data-action="maximize" data-win-id="${id}">□</div>
                    <div class="win-ctrl close" data-action="close" data-win-id="${id}">✕</div>
                </div>
            </div>
            <div class="window-body" id="win-body-${id}"></div>
            <div class="window-resize" data-win-id="${id}"></div>
        `;
        return el;
    }

    positionWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        win.element.style.left = win.x + 'px';
        win.element.style.top = win.y + 'px';
        win.element.style.width = win.width + 'px';
        win.element.style.height = win.height + 'px';
    }

    focusWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        if (this.activeWindowId) { const prev = this.windows.get(this.activeWindowId); if (prev) prev.element.classList.remove('focused'); }
        win.element.style.zIndex = ++this.zIndexCounter;
        win.element.classList.add('focused');
        this.activeWindowId = id;
        this.updateTaskbarApps();
    }

    minimizeWindow(id) { const w = this.windows.get(id); if (!w) return; w.element.style.display = 'none'; w.minimized = true; if (this.activeWindowId === id) this.activeWindowId = null; this.updateTaskbarApps(); }
    restoreWindow(id) { const w = this.windows.get(id); if (!w) return; w.element.style.display = 'flex'; w.minimized = false; this.focusWindow(id); this.updateTaskbarApps(); }
    maximizeWindow(id) { const w = this.windows.get(id); if (!w) return; w.maximized = !w.maximized; w.element.classList.toggle('maximized', w.maximized); }
    closeWindow(id) { const w = this.windows.get(id); if (!w) return; w.element.remove(); this.windows.delete(id); if (this.activeWindowId === id) this.activeWindowId = null; this.updateTaskbarApps(); }

    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const ctrl = e.target.closest('.win-ctrl');
            if (ctrl) {
                const id = parseInt(ctrl.dataset.winId);
                const action = ctrl.dataset.action;
                if (action === 'minimize') this.minimizeWindow(id);
                else if (action === 'maximize') this.maximizeWindow(id);
                else if (action === 'close') this.closeWindow(id);
                return;
            }
        });
        document.addEventListener('mousedown', (e) => {
            const titlebar = e.target.closest('.window-titlebar');
            if (!titlebar || e.target.closest('.win-ctrl')) return;
            const id = parseInt(titlebar.dataset.winId);
            const win = this.windows.get(id);
            if (!win || win.maximized) return;
            this.focusWindow(id);
            this.dragState = { id, startX: e.clientX - win.x, startY: e.clientY - win.y };
            e.preventDefault();
        });
        document.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.window-resize');
            if (!handle) return;
            const id = parseInt(handle.dataset.winId);
            const win = this.windows.get(id);
            if (!win || win.maximized) return;
            this.focusWindow(id);
            this.resizeState = { id, startX: e.clientX, startY: e.clientY, startW: win.element.offsetWidth, startH: win.element.offsetHeight };
            e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if (this.dragState) {
                const win = this.windows.get(this.dragState.id); if (!win) return;
                win.x = e.clientX - this.dragState.startX; win.y = Math.max(0, e.clientY - this.dragState.startY);
                win.element.style.left = win.x + 'px'; win.element.style.top = win.y + 'px';
            }
            if (this.resizeState) {
                const win = this.windows.get(this.resizeState.id); if (!win) return;
                win.element.style.width = Math.max(320, this.resizeState.startW + e.clientX - this.resizeState.startX) + 'px';
                win.element.style.height = Math.max(200, this.resizeState.startH + e.clientY - this.resizeState.startY) + 'px';
            }
        });
        document.addEventListener('mouseup', () => { this.dragState = null; this.resizeState = null; });
        document.addEventListener('mousedown', (e) => {
            const winEl = e.target.closest('.myanos-window');
            if (winEl) this.focusWindow(parseInt(winEl.id.replace('window-', '')));
        });
        document.querySelectorAll('.ctx-item').forEach(item => {
            item.addEventListener('click', () => {
                const action = item.dataset.action;
                if (action === 'open-terminal') this.openApp('terminal');
                else if (action === 'open-settings') this.openApp('settings');
                else if (action === 'refresh') location.reload();
                else if (action === 'about') this.openApp('neofetch');
            });
        });
    }

    // ════════════════════════════════════════
    // App Content Renderers
    // ════════════════════════════════════════

    renderWindowContent(id) {
        const win = this.windows.get(id);
        if (!win) return;
        const body = document.getElementById(`win-body-${id}`);
        if (!body) return;
        const renderers = {
            'terminal': () => this.renderTerminal(body, id),
            'files': () => this.renderFileManager(body, id),
            'monitor': () => this.renderMonitor(body),
            'settings': () => this.renderSettings(body),
            'neofetch': () => this.renderNeofetch(body),
            'myanmar-code': () => this.renderMyanmarCode(body),
            'pkg-manager': () => this.renderPackageManager(body),
            'toolbox': () => this.renderToolbox(body),
            'android': () => this.renderAndroid(body),
            'ps2': () => this.renderPS2(body),
            'myanai': () => this.renderMyanAi(body),
            'browser': () => this.renderBrowser(body),
            'appstore': () => this.renderAppStore(body),
            'notepad': () => this.renderNotepad(body),
        };
        const renderer = renderers[win.app.id];
        if (renderer) renderer();
    }

    // ── Terminal ──
    renderTerminal(body, winId) {
        body.innerHTML = `<div class="app-terminal" id="term-${winId}">
            <div class="term-line logo">       ┌──────────────┐</div>
            <div class="term-line logo">       │   Myanos OS   │</div>
            <div class="term-line logo">       │  ████████████  │</div>
            <div class="term-line logo">       │  █▀▀▀▀▀▀▀▀█  │</div>
            <div class="term-line logo">       │    ▀▀▀▀▀▀    │</div>
            <div class="term-line logo">       └──────────────┘</div>
            <div class="term-line"> Myanos Terminal v2.0.0</div>
            <div class="term-line"> Type 'help' for commands</div>
            <div class="term-line">&nbsp;</div>
        </div>`;
        const term = document.getElementById(`term-${winId}`);
        this.addTermInput(term, winId);
    }

    addTermInput(term, winId) {
        const line = document.createElement('div');
        line.className = 'term-input-line';
        line.innerHTML = `<span class="term-prompt">meonnmi@myanos</span><span>:</span><span class="term-path">~</span><span> $ </span><input class="term-input" autofocus>`;
        term.appendChild(line);
        const input = line.querySelector('.term-input');
        input.focus();
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const cmd = input.value.trim();
                input.disabled = true;
                if (cmd) this.executeTermCommand(term, cmd, winId);
                this.addTermInput(term, winId);
            }
        });
    }

    executeTermCommand(term, cmd, winId) {
        const out = document.createElement('div');
        out.className = 'term-line';
        const commands = {
            help: () => 'Available: help, clear, neofetch, date, whoami, uname, ls, pwd, echo, myan, mmc, python3, cat, mkdir, touch, rm, exit',
            clear: () => { term.innerHTML = ''; return null; },
            neofetch: () => 'meonnmi@myanos\nOS: Myanos Web OS v2.1.0\nDesktop: Myanos Desktop Environment v2.0\nShell: myanos-terminal v2.0\nPackages: .myan (MyanPM v2.0)\nApp Store: Phase 7 Complete\nLanguage: Myanmar Code (127 keywords)\n🇲🇲 Made in Myanmar',
            date: () => new Date().toString(),
            whoami: () => 'meonnmi',
            uname: () => 'Myanos OS 2.1.0 - Web Runtime',
            pwd: () => '/home/meonnmi',
            ls: () => { const items = this.vfsListDir('/home/meonnmi'); return items.join('  '); },
            echo: (args) => args,
            myan: () => 'MyanPM v2.0.0 | Commands: list, install, install-remote, search, search-remote, update',
            mmc: () => '🇲🇲 Myanmar Code v2.0.1 | 127 keywords | Author: Aung MoeOo (MWD)',
            exit: () => { this.closeWindow(winId); return null; },
        };
        const parts = cmd.split(/\s+/);
        const name = parts[0].toLowerCase();
        const args = parts.slice(1).join(' ');
        const handler = commands[name];
        if (handler) {
            const result = name === 'echo' ? handler(args) : handler();
            if (result) out.textContent = result;
        } else {
            out.textContent = `[ERR] Unknown command: ${name}`;
            out.style.color = '#f7768e';
        }
        if (out.textContent) term.appendChild(out);
    }

    // ════════════════════════════════════════
    // FILE MANAGER (Real Integration)
    // ════════════════════════════════════════

    renderFileManager(body, winId) {
        this.fmState = { currentPath: '/home/meonnmi', viewMode: 'grid', selected: null, winId };

        body.innerHTML = `<div class="app-filemanager" id="fm-${winId}">
            <div class="fm-sidebar">
                <div class="fm-sidebar-item active" data-path="/home/meonnmi">📁 Home</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/Desktop">🖥️ Desktop</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/Documents">📄 Documents</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/Downloads">⬇️ Downloads</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/Pictures">🖼️ Pictures</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/Music">🎵 Music</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/myan-os">📦 Myanos OS</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/.config">⚙️ .config</div>
            </div>
            <div style="flex:1; display:flex; flex-direction:column;">
                <div class="fm-toolbar">
                    <button class="fm-btn" id="fm-back-${winId}" title="Back">←</button>
                    <button class="fm-btn" id="fm-up-${winId}" title="Up">↑</button>
                    <div class="fm-path" id="fm-path-${winId}">/home/meonnmi</div>
                    <button class="fm-btn" id="fm-refresh-${winId}" title="Refresh">⟳</button>
                    <div class="fm-view-toggle">
                        <button class="fm-btn active" id="fm-grid-${winId}" title="Grid view">⊞</button>
                        <button class="fm-btn" id="fm-list-${winId}" title="List view">☰</button>
                    </div>
                    <div class="fm-actions">
                        <button class="fm-btn" id="fm-newfolder-${winId}" title="New folder">📁+</button>
                        <button class="fm-btn" id="fm-newfile-${winId}" title="New file">📄+</button>
                        <button class="fm-btn fm-btn-danger" id="fm-delete-${winId}" title="Delete">🗑️</button>
                    </div>
                </div>
                <div class="fm-content" id="fm-content-${winId}"></div>
                <div class="fm-statusbar" id="fm-status-${winId}"></div>
            </div>
        </div>`;

        // Event delegation
        const fm = document.getElementById(`fm-${winId}`);
        if (!fm) return;

        // Sidebar navigation
        fm.querySelectorAll('.fm-sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                fm.querySelectorAll('.fm-sidebar-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.fmNavigate(winId, item.dataset.path);
            });
        });

        // Toolbar buttons
        document.getElementById(`fm-back-${winId}`)?.addEventListener('click', () => this.fmBack(winId));
        document.getElementById(`fm-up-${winId}`)?.addEventListener('click', () => this.fmUp(winId));
        document.getElementById(`fm-refresh-${winId}`)?.addEventListener('click', () => this.fmRefresh(winId));
        document.getElementById(`fm-grid-${winId}`)?.addEventListener('click', () => { this.fmState.viewMode = 'grid'; this.fmRefresh(winId); });
        document.getElementById(`fm-list-${winId}`)?.addEventListener('click', () => { this.fmState.viewMode = 'list'; this.fmRefresh(winId); });
        document.getElementById(`fm-newfolder-${winId}`)?.addEventListener('click', () => this.fmNewFolder(winId));
        document.getElementById(`fm-newfile-${winId}`)?.addEventListener('click', () => this.fmNewFile(winId));
        document.getElementById(`fm-delete-${winId}`)?.addEventListener('click', () => this.fmDelete(winId));

        // Context menu inside file manager
        const content = document.getElementById(`fm-content-${winId}`);
        content?.addEventListener('contextmenu', (e) => {
            e.preventDefault(); e.stopPropagation();
            const item = e.target.closest('.fm-item');
            if (item) {
                this.fmState.selected = item.dataset.name;
                this.showFMContextMenu(e.clientX, e.clientY, winId, item.dataset.name);
            }
        });

        this.fmHistory = ['/home/meonnmi'];
        this.fmRefresh(winId);
    }

    fmNavigate(winId, path) {
        this.fmState.currentPath = path;
        this.fmHistory.push(path);
        this.fmRefresh(winId);
    }

    fmBack(winId) {
        if (this.fmHistory.length > 1) {
            this.fmHistory.pop();
            this.fmState.currentPath = this.fmHistory[this.fmHistory.length - 1];
            this.fmRefresh(winId);
        }
    }

    fmUp(winId) {
        const parts = this.fmState.currentPath.split('/');
        if (parts.length > 2) {
            parts.pop();
            this.fmNavigate(winId, parts.join('/') || '/');
        }
    }

    fmRefresh(winId) {
        const pathEl = document.getElementById(`fm-path-${winId}`);
        const contentEl = document.getElementById(`fm-content-${winId}`);
        const statusEl = document.getElementById(`fm-status-${winId}`);
        if (pathEl) pathEl.textContent = this.fmState.currentPath;

        const children = this.vfsListDir(this.fmState.currentPath);
        if (!contentEl) return;

        // Sort: directories first
        const dirs = children.filter(name => this.vfs.dirs[this.fmState.currentPath + '/' + name]);
        const files = children.filter(name => this.vfs.files[this.fmState.currentPath + '/' + name]);
        const sorted = [...dirs, ...files];

        if (this.fmState.viewMode === 'grid') {
            contentEl.innerHTML = `<div class="fm-grid">${sorted.map(name => {
                const fullPath = this.fmState.currentPath + '/' + name;
                const isDir = !!this.vfs.dirs[fullPath];
                const icon = isDir ? '📁' : this.getFileIcon(name);
                const selected = this.fmState.selected === name ? ' selected' : '';
                return `<div class="fm-item${selected}" data-name="${name}" data-isdir="${isDir}" ondblclick="myanos.fmOpen('${winId}','${name}',${isDir})">
                    <div class="fm-icon">${icon}</div><div class="fm-name">${name}</div></div>`;
            }).join('')}</div>`;
        } else {
            contentEl.innerHTML = `<div class="fm-list">${sorted.map(name => {
                const fullPath = this.fmState.currentPath + '/' + name;
                const isDir = !!this.vfs.dirs[fullPath];
                const icon = isDir ? '📁' : this.getFileIcon(name);
                const file = this.vfs.files[fullPath];
                const size = file ? this.formatSize(file.size) : '--';
                const modified = file ? file.modified : '--';
                const selected = this.fmState.selected === name ? ' selected' : '';
                return `<div class="fm-list-row${selected}" data-name="${name}" data-isdir="${isDir}" ondblclick="myanos.fmOpen('${winId}','${name}',${isDir})">
                    <span class="fm-list-icon">${icon}</span><span class="fm-list-name">${name}</span><span class="fm-list-size">${size}</span><span class="fm-list-date">${modified}</span></div>`;
            }).join('')}</div>`;
        }

        if (statusEl) {
            statusEl.textContent = `${sorted.length} items${this.fmState.selected ? ` — Selected: ${this.fmState.selected}` : ''}`;
        }
    }

    getFileIcon(name) {
        const ext = name.split('.').pop().toLowerCase();
        const icons = { py: '🐍', js: '📜', html: '🌐', css: '🎨', md: '📝', txt: '📄', sh: '⚡', json: '📋', zip: '📦', myan: '💎', png: '🖼️', jpg: '🖼️', mp3: '🎵', mp4: '🎬', apk: '📱', iso: '💿' };
        return icons[ext] || '📄';
    }

    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }

    fmOpen(winId, name, isDir) {
        if (isDir) {
            this.fmNavigate(winId, this.fmState.currentPath + '/' + name);
        } else {
            const file = this.vfsGetFile(this.fmState.currentPath, name);
            if (file) {
                // Open in notepad
                this.openFileInNotepad(name, file.content);
            }
        }
    }

    openFileInNotepad(name, content) {
        this.apps.push({ id: 'notepad-open', name: name, icon: '📝', desc: 'Text editor', category: 'tools', _content: content, _fileName: name });
        this.openApp('notepad-open');
        // Remove temp app entry after opening
        this.apps.pop();
    }

    fmNewFolder(winId) {
        const name = prompt('Folder name:');
        if (!name) return;
        if (this.vfsCreateDir(this.fmState.currentPath, name)) {
            this.fmRefresh(winId);
            this.showNotification(`Created folder: ${name}`);
        } else {
            this.showNotification(`Failed to create folder: ${name}`);
        }
    }

    fmNewFile(winId) {
        const name = prompt('File name:');
        if (!name) return;
        if (this.vfsCreateFile(this.fmState.currentPath, name, '')) {
            this.fmRefresh(winId);
            this.showNotification(`Created file: ${name}`);
        } else {
            this.showNotification(`File already exists: ${name}`);
        }
    }

    fmDelete(winId) {
        if (!this.fmState.selected) { this.showNotification('No item selected'); return; }
        if (confirm(`Delete "${this.fmState.selected}"?`)) {
            if (this.vfsDelete(this.fmState.currentPath, this.fmState.selected)) {
                this.showNotification(`Deleted: ${this.fmState.selected}`);
                this.fmState.selected = null;
                this.fmRefresh(winId);
            }
        }
    }

    showFMContextMenu(x, y, winId, name) {
        // Remove existing
        document.querySelector('.fm-context-menu')?.remove();
        const menu = document.createElement('div');
        menu.className = 'fm-context-menu';
        menu.style.cssText = `position:fixed;left:${x}px;top:${y}px;z-index:99999;`;
        const isDir = !!this.vfs.dirs[this.fmState.currentPath + '/' + name];
        menu.innerHTML = `
            <div class="ctx-item" onclick="myanos.fmOpen('${winId}','${name}',${isDir})">📂 Open</div>
            <div class="ctx-item" onclick="myanos.fmRename('${winId}','${name}')">✏️ Rename</div>
            ${!isDir ? `<div class="ctx-item" onclick="myanos.openFileInNotepad('${name}', myanos.vfsGetFile(myanos.fmState.currentPath,'${name}')?.content||'')">📝 Edit</div>` : ''}
            <div class="ctx-sep"></div>
            <div class="ctx-item" style="color:#f7768e;" onclick="myanos.fmState.selected='${name}';myanos.fmDelete('${winId}')">🗑️ Delete</div>
        `;
        document.body.appendChild(menu);
        setTimeout(() => document.addEventListener('click', () => menu.remove(), { once: true }), 10);
    }

    fmRename(winId, oldName) {
        const newName = prompt('Rename to:', oldName);
        if (!newName || newName === oldName) return;
        if (this.vfsRename(this.fmState.currentPath, oldName, newName)) {
            this.showNotification(`Renamed: ${oldName} → ${newName}`);
            this.fmState.selected = newName;
            this.fmRefresh(winId);
        }
    }

    // ════════════════════════════════════════
    // SETTINGS (Persistent)
    // ════════════════════════════════════════

    renderSettings(body) {
        const s = this.settings;
        body.innerHTML = `<div class="app-settings">
            <div class="settings-sidebar">
                <div class="settings-item active" data-tab="display">🖥️ Display</div>
                <div class="settings-item" data-tab="appearance">🎨 Appearance</div>
                <div class="settings-item" data-tab="wallpaper">🖼️ Wallpaper</div>
                <div class="settings-item" data-tab="sound">🔊 Sound</div>
                <div class="settings-item" data-tab="language">🌐 Language</div>
                <div class="settings-item" data-tab="packages">📦 Packages</div>
                <div class="settings-item" data-tab="about">ℹ️ About</div>
            </div>
            <div class="settings-content" id="settings-content"></div>
        </div>`;

        body.querySelectorAll('.settings-item').forEach(item => {
            item.addEventListener('click', () => {
                body.querySelectorAll('.settings-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.renderSettingsTab(item.dataset.tab);
            });
        });
        this.renderSettingsTab('display');
    }

    renderSettingsTab(tab) {
        const content = document.getElementById('settings-content');
        if (!content) return;
        const s = this.settings;

        if (tab === 'display') {
            content.innerHTML = `<div class="settings-section">
                <h3>🖥️ Display Settings</h3>
                <div class="settings-row"><label>Dark Mode</label>
                    <div class="toggle ${s.theme==='dark'?'on':''}" id="s-theme"></div></div>
                <div class="settings-row"><label>Blur Effects</label>
                    <div class="toggle ${s.blur?'on':''}" id="s-blur"></div></div>
                <div class="settings-row"><label>Animations</label>
                    <div class="toggle ${s.animations?'on':''}" id="s-anim"></div></div>
                <div class="settings-row"><label>Font Size</label>
                    <div style="display:flex;gap:6px;">
                        <button class="setting-btn" onclick="myanos.changeFontSize(-1)">−</button>
                        <span class="value" id="s-fontsize">${s.fontSize}px</span>
                        <button class="setting-btn" onclick="myanos.changeFontSize(1)">+</button>
                    </div></div>
                <div class="settings-row"><label>Clock Format</label>
                    <select class="setting-select" id="s-clock" onchange="myanos.settings.clockFormat=this.value;myanos.saveSettings();">
                        <option value="24h" ${s.clockFormat==='24h'?'selected':''}>24 Hour</option>
                        <option value="12h" ${s.clockFormat==='12h'?'selected':''}>12 Hour</option>
                    </select></div>
            </div>`;
            document.getElementById('s-theme')?.addEventListener('click', function() {
                this.classList.toggle('on');
                myanos.settings.theme = this.classList.contains('on') ? 'dark' : 'light';
                myanos.saveSettings(); myanos.applySettings();
            });
            document.getElementById('s-blur')?.addEventListener('click', function() {
                this.classList.toggle('on');
                myanos.settings.blur = this.classList.contains('on');
                myanos.saveSettings(); myanos.applySettings();
            });
            document.getElementById('s-anim')?.addEventListener('click', function() {
                this.classList.toggle('on');
                myanos.settings.animations = this.classList.contains('on');
                myanos.saveSettings(); myanos.applySettings();
            });
        } else if (tab === 'wallpaper') {
            const wps = ['default','ocean','sunset','forest','purple','minimal'];
            const wpNames = { default: 'Default', ocean: 'Ocean', sunset: 'Sunset', forest: 'Forest', purple: 'Purple', minimal: 'Minimal' };
            content.innerHTML = `<div class="settings-section">
                <h3>🖼️ Wallpaper</h3>
                <div class="wallpaper-grid">
                    ${wps.map(wp => `<div class="wallpaper-option ${s.wallpaper===wp?'active':''}" data-wp="${wp}" onclick="myanos.setWallpaper('${wp}')">
                        <div class="wallpaper-preview wp-${wp}"></div>
                        <div class="wallpaper-name">${wpNames[wp]}</div>
                    </div>`).join('')}
                </div>
            </div>`;
        } else if (tab === 'appearance') {
            content.innerHTML = `<div class="settings-section">
                <h3>🎨 Appearance</h3>
                <div class="settings-row"><label>Desktop Icons</label>
                    <div class="toggle ${s.desktopIcons?'on':''}" id="s-icons"></div></div>
                <div class="settings-row"><label>Taskbar Position</label>
                    <select class="setting-select" onchange="myanos.settings.taskbarPosition=this.value;myanos.saveSettings();">
                        <option value="bottom" ${s.taskbarPosition==='bottom'?'selected':''}>Bottom</option>
                        <option value="top" ${s.taskbarPosition==='top'?'selected':''}>Top</option>
                        <option value="left" ${s.taskbarPosition==='left'?'selected':''}>Left</option>
                    </select></div>
            </div>`;
            document.getElementById('s-icons')?.addEventListener('click', function() {
                this.classList.toggle('on');
                myanos.settings.desktopIcons = this.classList.contains('on');
                myanos.saveSettings();
                document.getElementById('desktop-icons').style.display = myanos.settings.desktopIcons ? 'grid' : 'none';
            });
        } else if (tab === 'language') {
            content.innerHTML = `<div class="settings-section">
                <h3>🌐 Language / ဘာသာစကား</h3>
                <div class="settings-row"><label>Interface Language</label>
                    <select class="setting-select" onchange="myanos.settings.language=this.value;myanos.saveSettings();">
                        <option value="my" ${s.language==='my'?'selected':''}>မြန်မာဘာသာ (Myanmar)</option>
                        <option value="en" ${s.language==='en'?'selected':''}>English</option>
                    </select></div>
                <div class="settings-row"><label>Myanmar Code Keywords</label>
                    <span class="value">127 keywords</span></div>
                <div class="settings-row"><label>Author</label>
                    <span class="value">Aung MoeOo (MWD)</span></div>
            </div>`;
        } else if (tab === 'packages') {
            content.innerHTML = `<div class="settings-section">
                <h3>📦 Package Information</h3>
                <div class="settings-row"><label>Package Format</label><span class="value">.myan (ZIP)</span></div>
                <div class="settings-row"><label>Package Manager</label><span class="value">MyanPM v2.0.0</span></div>
                <div class="settings-row"><label>App Store</label><span class="value">Phase 7 Complete</span></div>
                <div class="settings-row"><label>Registry</label><span class="value">8 packages available</span></div>
                <div style="margin-top:16px;padding:12px;background:rgba(255,255,255,0.03);border-radius:8px;">
                    <pre style="font-size:11px;color:#a9b1d6;line-height:1.5;">Commands:
  myanos pkg list          - Installed packages
  myanos pkg rsearch QUERY - Search registry
  myanos pkg remote NAME   - Install from registry
  myanos appstore list     - Browse App Store</pre>
                </div>
            </div>`;
        } else if (tab === 'about') {
            content.innerHTML = `<div class="settings-section">
                <h3>ℹ️ About Myanos</h3>
                <div style="text-align:center;padding:20px;">
                    <div style="font-size:64px;margin-bottom:12px;">🇲🇲</div>
                    <h2 style="color:#c0caf5;">Myanos Web OS</h2>
                    <p style="color:#7aa2f7;font-size:14px;margin:4px 0;">v2.1.0 — Desktop Environment v2.0</p>
                    <p style="color:#565f89;font-size:12px;">Myanmar's First Advanced Web Operating System</p>
                    <div style="margin-top:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;text-align:left;">
                        <div class="settings-row"><label>CTO</label><span class="value">Meonnmi-ops</span></div>
                        <div class="settings-row"><label>Engine</label><span class="value">Web Runtime (HTML/CSS/JS)</span></div>
                        <div class="settings-row"><label>Language</label><span class="value">Myanmar Code (127 keywords)</span></div>
                        <div class="settings-row"><label>Packages</label><span class="value">8 (.myan format)</span></div>
                        <div class="settings-row"><label>GitHub</label><span class="value" style="color:#7aa2f7;">meonnmi-ops/Myanos</span></div>
                    </div>
                </div>
            </div>`;
        } else if (tab === 'sound') {
            content.innerHTML = `<div class="settings-section">
                <h3>🔊 Sound Settings</h3>
                <div class="settings-row"><label>Master Volume</label>
                    <input type="range" min="0" max="100" value="75" style="width:120px;accent-color:#7aa2f7;"></div>
                <div class="settings-row"><label>Notification Sound</label>
                    <div class="toggle on"></div></div>
                <div class="settings-row"><label>Startup Sound</label>
                    <div class="toggle on"></div></div>
            </div>`;
        }
    }

    changeFontSize(delta) {
        this.settings.fontSize = Math.max(10, Math.min(20, this.settings.fontSize + delta));
        this.saveSettings();
        this.applySettings();
        const el = document.getElementById('s-fontsize');
        if (el) el.textContent = this.settings.fontSize + 'px';
    }

    setWallpaper(wp) {
        this.settings.wallpaper = wp;
        this.saveSettings();
        this.applyWallpaper(wp);
        document.querySelectorAll('.wallpaper-option').forEach(el => el.classList.toggle('active', el.dataset.wp === wp));
        this.showNotification(`Wallpaper: ${wp}`);
    }

    // ════════════════════════════════════════
    // APP STORE (Desktop Integration)
    // ════════════════════════════════════════

    renderAppStore(body) {
        const storePackages = [
            { name: 'myanmar-code', version: '2.0.1', icon: '🇲🇲', author: 'Aung MoeOo (MWD)', desc: 'Myanmar Programming Language (127 keywords)', category: 'language', downloads: 342, rating: 4.7, installed: true, featured: true },
            { name: 'myanos-terminal', version: '1.0.0', icon: '⬛', author: 'Meonnmi-ops', desc: 'Linux-like interactive terminal', category: 'system', downloads: 567, rating: 4.5, installed: true, featured: true },
            { name: 'myanos-toolbox', version: '1.0.0', icon: '🔧', author: 'Meonnmi-ops', desc: '20+ professional tools', category: 'tools', downloads: 356, rating: 4.8, installed: true, featured: true },
            { name: 'myanai', version: '1.0.0', icon: '🤖', author: 'Meonnmi-ops', desc: 'Low-Code AI Agent Builder', category: 'development', downloads: 156, rating: 4.2, installed: false, featured: true },
            { name: 'myanos-ps2-layer', version: '1.0.0', icon: '🎮', author: 'Meonnmi-ops', desc: 'PlayStation 2 emulation', category: 'emulation', downloads: 189, rating: 4.6, installed: false, featured: false },
            { name: 'myanos-android-layer', version: '1.0.0', icon: '📱', author: 'Meonnmi-ops', desc: 'Android APK management via WayDroid', category: 'android', downloads: 423, rating: 4.4, installed: false, featured: true },
            { name: 'myanos-settings', version: '1.0.0', icon: '⚙️', author: 'Meonnmi-ops', desc: 'System settings manager', category: 'system', downloads: 445, rating: 4.1, installed: false, featured: false },
            { name: 'myanos-display-engine', version: '1.0.0', icon: '🖥️', author: 'Meonnmi-ops', desc: 'noVNC display streaming engine', category: 'display', downloads: 234, rating: 4.3, installed: false, featured: false },
        ];

        body.innerHTML = `<div class="app-store">
            <div class="store-header">
                <div class="store-title">🏪 App Store</div>
                <input type="text" class="store-search" placeholder="Search packages..." id="store-search">
            </div>
            <div class="store-featured">
                <h4 class="store-section-title">⭐ Featured</h4>
                <div class="store-featured-grid">
                    ${storePackages.filter(p => p.featured).map(p => this.renderStoreCard(p)).join('')}
                </div>
            </div>
            <div class="store-all">
                <h4 class="store-section-title">📦 All Packages (${storePackages.length})</h4>
                <div class="store-pkg-grid">
                    ${storePackages.map(p => this.renderStorePkgRow(p)).join('')}
                </div>
            </div>
        </div>`;

        // Search
        document.getElementById('store-search')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.store-pkg-row, .store-card').forEach(el => {
                const name = el.dataset.name || '';
                el.style.display = name.toLowerCase().includes(q) ? '' : 'none';
            });
        });
    }

    renderStoreCard(p) {
        return `<div class="store-card" data-name="${p.name}">
            <div class="store-card-header"><span style="font-size:32px;">${p.icon}</span><div><div style="font-size:14px;color:#c0caf5;font-weight:600;">${p.name}</div><div style="font-size:11px;color:#565f89;">${p.author}</div></div></div>
            <div style="font-size:12px;color:#a9b1d6;margin:8px 0;">${p.desc}</div>
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <span style="font-size:11px;color:#565f89;">⭐ ${p.rating} | ↓ ${p.downloads}</span>
                <button class="store-btn ${p.installed?'installed':''}" onclick="this.textContent=this.classList.contains('installed')?'Open':'Install';this.classList.toggle('installed')">${p.installed?'Open':'Install'}</button>
            </div>
        </div>`;
    }

    renderStorePkgRow(p) {
        return `<div class="store-pkg-row" data-name="${p.name}">
            <span style="font-size:20px;">${p.icon}</span>
            <div style="flex:1;"><div style="font-size:13px;color:#c0caf5;">${p.name} <span style="font-size:11px;color:#565f89;">v${p.version}</span></div><div style="font-size:11px;color:#565f89;">${p.desc}</div></div>
            <span style="font-size:11px;color:#565f89;margin-right:12px;">⭐${p.rating}</span>
            <button class="store-btn ${p.installed?'installed':''}" onclick="this.textContent=this.classList.contains('installed')?'Open':'Install';this.classList.toggle('installed')">${p.installed?'Open':'Install'}</button>
        </div>`;
    }

    // ════════════════════════════════════════
    // NOTEPAD
    // ════════════════════════════════════════

    renderNotepad(body) {
        const app = [...this.apps].reverse().find(a => a.id === 'notepad' || a.id === 'notepad-open');
        const content = app?._content || '';
        const title = app?._fileName || 'Untitled';
        body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;">
            <div class="notepad-toolbar">
                <span style="color:#565f89;font-size:12px;">📝 ${title}</span>
                <div style="display:flex;gap:4px;">
                    <button class="fm-btn" onclick="myanos.notepadSave()">💾 Save</button>
                    <button class="fm-btn" onclick="myanos.notepadNew()">📄 New</button>
                </div>
            </div>
            <textarea class="notepad-editor" id="notepad-editor" placeholder="Start typing...">${content}</textarea>
        </div>`;
    }

    notepadSave() {
        const editor = document.getElementById('notepad-editor');
        if (editor) this.showNotification('File saved');
    }

    notepadNew() {
        const editor = document.getElementById('notepad-editor');
        if (editor) editor.value = '';
    }

    // ════════════════════════════════════════
    // Other App Renderers (keep from v1)
    // ════════════════════════════════════════

    renderMonitor(body) {
        body.innerHTML = `<div class="app-monitor">
            <div class="monitor-card"><h4>⚡ CPU Usage</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-cpu" style="width:35%"></div></div><div class="monitor-stats"><span>35%</span><span>4 cores</span></div></div>
            <div class="monitor-card"><h4>🧠 Memory Usage</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-mem" style="width:52%"></div></div><div class="monitor-stats"><span>4.2 GB / 8 GB</span><span>52%</span></div></div>
            <div class="monitor-card"><h4>💾 Disk Usage</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-disk" style="width:67%"></div></div><div class="monitor-stats"><span>134 GB / 200 GB</span><span>67%</span></div></div>
            <div class="monitor-card"><h4>🌡️ System Temperature</h4><div style="font-size:28px;text-align:center;padding:8px;color:#9ece6a;">42°C</div></div>
            <div class="monitor-card"><h4>⏱️ Uptime</h4><div style="font-size:14px;text-align:center;padding:8px;color:#a9b1d6;">3h 42m 15s</div></div>
        </div>`;
        setTimeout(() => { body.querySelectorAll('.monitor-bar-fill').forEach(bar => { const w = parseInt(bar.style.width); bar.style.width = '0%'; setTimeout(() => bar.style.width = w + '%', 100); }); }, 50);
    }

    renderNeofetch(body) {
        body.innerHTML = `<div class="app-neofetch">
            <pre class="logo">       ┌──────────────┐
       │   Myanos OS   │
       │  ████████████  │
       │  █▀▀▀▀▀▀▀▀█  │
       │  █ ▀▀▀▀▀▀ █  │
       │    ▀▀▀▀▀▀    │
       └──────────────┘</pre>
            <div class="title">meonnmi@myanos</div>
            <div style="color:#565f89;">──────────────────────────────────</div>
            <div><span class="label">  OS:        </span><span class="info">Myanos Web OS v2.1.0</span></div>
            <div><span class="label">  Desktop:   </span><span class="info">Myanos Desktop Environment v2.0</span></div>
            <div><span class="label">  Shell:     </span><span class="info">myanos-terminal v2.0</span></div>
            <div><span class="label">  Theme:     </span><span class="info">Tokyo Night Dark</span></div>
            <div><span class="label">  Packages:  </span><span class="info">8 (.myan format) + App Store</span></div>
            <div><span class="label">  Language:  </span><span class="info">Myanmar Code (127 keywords)</span></div>
            <div><span class="label">  Engine:    </span><span class="info">Web Runtime (HTML/CSS/JS)</span></div>
            <div style="color:#565f89;">──────────────────────────────────</div>
            <div><span style="color:#7aa2f7;">●</span> <span style="color:#e0af68;">●</span> <span style="color:#9ece6a;">●</span> <span style="color:#f7768e;">●</span> <span style="color:#bb9af7;">●</span> <span style="color:#7dcfff;">●</span> <span style="color:#ff9e64;">●</span> <span style="color:#73daca;">●</span></div>
            <div>&nbsp;</div>
            <div class="highlight">  🇲🇲 Myanos Web OS — Myanmar's First Advanced Web OS</div>
            <div class="info" style="margin-top:8px;">  CTO: Meonnmi-ops</div>
            <div class="info">  GitHub: github.com/meonnmi-ops/Myanos</div>
        </div>`;
    }

    renderMyanmarCode(body) {
        body.innerHTML = `<div style="padding:20px;">
            <div style="text-align:center;margin-bottom:20px;"><div style="font-size:40px;margin-bottom:8px;">🇲🇲</div><h2 style="color:#c0caf5;">Myanmar Code v2.0.1</h2><p style="color:#565f89;font-size:13px;">မြန်မာဘာသာစကားဖြင့် ရေးသားနိုင်သော ပရိုဂရမ်းမင်းဘာသာစကား</p></div>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;">
                <h4 style="color:#7aa2f7;margin-bottom:8px;">Keywords: 127</h4>
                <div style="font-size:12px;color:#a9b1d6;line-height:2;"><span style="color:#9ece6a;">ပုံနှိပ်</span> (print), <span style="color:#e0af68;">တိုက်</span> (if), <span style="color:#f7768e;">တိုက်ရွေး</span> (else), <span style="color:#bb9af7;">ပျက်</span> (break), <span style="color:#7dcfff;">ဆက်လုပ်</span> (continue), <span style="color:#ff9e64;">ခန့်</span> (return)</div>
            </div>
            <div style="margin-top:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;">
                <h4 style="color:#7aa2f7;margin-bottom:8px;">Example</h4>
                <pre style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#a9b1d6;line-height:1.6;"><span style="color:#565f89;"># မြန်မာဘာသာစကားနဲ့ ရေးသား</span>
<span style="color:#9ece6a;">ပုံနှိပ်</span> "မင်္ဂလာပါ ကျော်ကြီး"
<span style="color:#e0af68;">တိုက်</span> ကိုယ် <span style="color:#bb9af7;">ချိန်း</span> ၂၀ <span style="color:#f7768e;">သို့မဟုတ်</span>:
    <span style="color:#9ece6a;">ပုံနှိပ်</span> "လောကကြီးပါ"
<span style="color:#ff9e64;">အပြည့်</span></pre>
            </div>
            <div style="margin-top:16px;text-align:center;"><p style="color:#565f89;font-size:12px;">Author: Aung MoeOo (MWD)</p><p style="color:#565f89;font-size:12px;">Install: <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;">pip install myanmar-code</code></p></div>
        </div>`;
    }

    renderPackageManager(body) {
        body.innerHTML = `<div style="padding:20px;height:100%;overflow-y:auto;">
            <h3 style="color:#c0caf5;margin-bottom:16px;">📦 MyanPM — Package Manager v2.0</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                ${this.renderPkgCard('myanmar-code', '2.0.1', '🇲🇲', 'Aung MoeOo (MWD)', true)}
                ${this.renderPkgCard('myanos-terminal', '1.0.0', '⬛', 'Meonnmi-ops', true)}
                ${this.renderPkgCard('myanos-display-engine', '1.0.0', '🖥️', 'Meonnmi-ops', true)}
                ${this.renderPkgCard('myanos-ps2-layer', '1.0.0', '🎮', 'Meonnmi-ops', true)}
                ${this.renderPkgCard('myanos-android-layer', '1.0.0', '📱', 'Meonnmi-ops', true)}
                ${this.renderPkgCard('myanos-toolbox', '1.0.0', '🔧', 'Meonnmi-ops', true)}
                ${this.renderPkgCard('myanai', '1.0.0', '🤖', 'Meonnmi-ops', false)}
                ${this.renderPkgCard('myanos-settings', '1.0.0', '⚙️', 'Meonnmi-ops', false)}
            </div>
            <div style="margin-top:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;">
                <h4 style="color:#7aa2f7;margin-bottom:8px;">v2.0 New Features</h4>
                <div style="font-size:12px;color:#a9b1d6;line-height:1.8;">
                    ✅ Remote registry support<br>
                    ✅ install-remote, search-remote commands<br>
                    ✅ Repository management (repo-add/remove/list)<br>
                    ✅ Auto-update checking<br>
                    ✅ SHA256 checksum verification<br>
                    ✅ Export/Import package lists
                </div>
            </div>
        </div>`;
    }

    renderPkgCard(name, version, icon, author, installed) {
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:20px;">${icon}</span><div><div style="font-size:13px;color:#c0caf5;">${name}</div><div style="font-size:11px;color:#565f89;">${version}</div></div></div>
            <div style="font-size:11px;color:#565f89;">${author}</div>
            <div style="margin-top:6px;font-size:11px;color:${installed?'#9ece6a':'#565f89'}">${installed?'✅ Installed':'⬜ Available'}</div>
        </div>`;
    }

    renderToolbox(body) {
        body.innerHTML = `<div style="padding:20px;">
            <h3 style="color:#c0caf5;margin-bottom:16px;">🔧 Myanos Professional Toolbox</h3>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                ${this.renderToolCard('💾','Storage','Disk info, partitions, usage')}
                ${this.renderToolCard('🌐','Network','Ping, DNS, port scan')}
                ${this.renderToolCard('📊','Monitor','CPU, RAM, benchmark')}
                ${this.renderToolCard('📱','Flash','dd write, ADB, fastboot')}
                ${this.renderToolCard('🔐','Security','SHA256, MD5, OpenSSL')}
                ${this.renderToolCard('📜','Logs','dmesg, syslog, journal')}
                ${this.renderToolCard('⚙️','System','Hardware info, services')}
                ${this.renderToolCard('📥','Download','curl/wget manager')}
                ${this.renderToolCard('🔍','Search','File search, grep')}
            </div>
        </div>`;
    }

    renderToolCard(icon, name, desc) {
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px;text-align:center;cursor:pointer;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
            <div style="font-size:28px;margin-bottom:6px;">${icon}</div><div style="font-size:13px;color:#c0caf5;">${name}</div><div style="font-size:11px;color:#565f89;margin-top:2px;">${desc}</div>
        </div>`;
    }

    renderAndroid(body) {
        body.innerHTML = `<div style="padding:20px;">
            <h3 style="color:#c0caf5;margin-bottom:16px;">📱 Android Layer</h3>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;margin-bottom:16px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;"><div style="font-size:40px;">🤖</div><div><div style="font-size:14px;color:#c0caf5;">WayDroid</div><div style="font-size:12px;color:#9ece6a;">✅ Container Running</div></div></div>
                <div style="display:flex;gap:8px;">
                    <button style="flex:1;padding:8px;background:rgba(122,162,247,0.15);border:1px solid rgba(122,162,247,0.3);color:#7aa2f7;border-radius:6px;cursor:pointer;font-size:12px;">Install APK</button>
                    <button style="flex:1;padding:8px;background:rgba(122,162,247,0.15);border:1px solid rgba(122,162,247,0.3);color:#7aa2f7;border-radius:6px;cursor:pointer;font-size:12px;">List Apps</button>
                    <button style="flex:1;padding:8px;background:rgba(122,162,247,0.15);border:1px solid rgba(122,162,247,0.3);color:#7aa2f7;border-radius:6px;cursor:pointer;font-size:12px;">Display</button>
                </div>
            </div>
        </div>`;
    }

    renderPS2(body) {
        body.innerHTML = `<div style="padding:20px;">
            <h3 style="color:#c0caf5;margin-bottom:16px;">🎮 PS2 Emulation Layer</h3>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;text-align:center;">
                <div style="font-size:48px;">🎮</div><p style="color:#a9b1d6;margin-top:8px;">PlayStation 2 Emulator</p><p style="color:#565f89;font-size:12px;">Powered by Play! / PCSX2</p>
            </div>
        </div>`;
    }

    renderMyanAi(body) {
        body.innerHTML = `<div style="padding:20px;">
            <h3 style="color:#c0caf5;margin-bottom:16px;">🤖 MyanAi — AI Agent Builder</h3>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:20px;text-align:center;">
                <div style="font-size:48px;margin-bottom:12px;">🤖</div><h4 style="color:#bb9af7;margin-bottom:8px;">Low-Code AI Agent Builder</h4>
                <p style="color:#a9b1d6;font-size:13px;margin-bottom:16px;">Build custom AI agents with minimal code.</p>
                <code style="color:#bb9af7;font-size:12px;background:rgba(187,154,247,0.1);border:1px solid rgba(187,154,247,0.2);border-radius:8px;padding:12px 20px;display:inline-block;">python3 myanai.py create --name "My Agent"</code>
            </div>
        </div>`;
    }

    renderBrowser(body) {
        body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;">
            <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(30,32,50,0.5);border-bottom:1px solid rgba(255,255,255,0.06);">
                <button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">←</button>
                <button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">→</button>
                <button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">⟳</button>
                <input type="text" value="https://github.com/meonnmi-ops/Myanos" style="flex:1;padding:6px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:16px;color:#a9b1d6;font-size:12px;outline:none;" />
            </div>
            <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#565f89;text-align:center;">
                <div><div style="font-size:48px;margin-bottom:12px;">🌐</div><p>Web Browser Frame</p></div>
            </div>
        </div>`;
    }
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => { window.myanos = new MyanosDesktop(); });
