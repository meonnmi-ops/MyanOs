/* ═══════════════════════════════════════════════════════
   Myanos Desktop Environment v3.0.0 - Mobile Responsive
   Window management, File Manager, Settings, App Store
   NEW: Touch support, responsive layout, mobile detection
   ═══════════════════════════════════════════════════════ */

class MyanosDesktop {
    constructor() {
        this.windows = new Map();
        this.windowIdCounter = 0;
        this.activeWindowId = null;
        this.zIndexCounter = 100;
        this.dragState = null;
        this.resizeState = null;
        this.isMobile = this.detectMobile();
        this.lastTapTime = 0;
        this.lastTapTarget = null;

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
    // Mobile Detection
    // ════════════════════════════════════════

    detectMobile() {
        if (window.innerWidth <= 600) return true;
        const ua = navigator.userAgent || navigator.vendor || '';
        if (/android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua) && window.innerWidth < 900) return true;
        if ('ontouchstart' in window && window.innerWidth < 900) return true;
        return false;
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
        if (s.theme === 'light') {
            document.body.classList.add('light-theme');
        } else {
            document.body.classList.remove('light-theme');
        }
        document.body.style.fontSize = s.fontSize + 'px';
        if (!s.blur) {
            document.body.classList.add('no-blur');
        } else {
            document.body.classList.remove('no-blur');
        }
        if (!s.animations) {
            document.body.classList.add('no-animations');
        } else {
            document.body.classList.remove('no-animations');
        }
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
        try { localStorage.setItem('myanos_vfs', JSON.stringify(this.vfs)); } catch (e) {}
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
        if (this.vfs.dirs[fullPath]) { this.vfsRecursiveDelete(fullPath); delete this.vfs.dirs[fullPath]; }
        if (this.vfs.files[fullPath]) { delete this.vfs.files[fullPath]; }
        this.saveVFS();
        return true;
    }

    vfsRecursiveDelete(path) {
        const dir = this.vfs.dirs[path];
        if (!dir) return;
        (dir.children || []).forEach(name => {
            const childPath = path + '/' + name;
            if (this.vfs.dirs[childPath]) { this.vfsRecursiveDelete(childPath); delete this.vfs.dirs[childPath]; }
            if (this.vfs.files[childPath]) { delete this.vfs.files[childPath]; }
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
        if (this.vfs.dirs[oldFullPath]) { this.vfs.dirs[newFullPath] = this.vfs.dirs[oldFullPath]; delete this.vfs.dirs[oldFullPath]; }
        if (this.vfs.files[oldFullPath]) { this.vfs.files[newFullPath] = this.vfs.files[oldFullPath]; delete this.vfs.files[oldFullPath]; }
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
        // Apply mobile class
        if (this.isMobile) {
            document.body.classList.add('mobile-device');
        }

        this.applySettings();
        this.renderDesktopIcons();
        this.renderTaskbar();
        this.setupStartMenu();
        this.setupContextMenu();
        this.setupEventListeners();
        this.setupTouchEvents();
        this.startClock();

        // Listen for resize (orientation changes)
        window.addEventListener('resize', () => {
            this.isMobile = this.detectMobile();
            document.body.classList.toggle('mobile-device', this.isMobile);
        });
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
            const trayIcons = this.isMobile
                ? `<span class="tray-icon" title="Notifications" style="cursor:pointer;" onclick="myanos.showNotification('No new notifications')">🔔</span><span id="clock" style="font-weight:600;"></span>`
                : `<span class="tray-icon" title="Volume">🔊</span><span class="tray-icon" title="Network">📶</span><span class="tray-icon" title="Battery">🔋</span><span class="tray-icon" title="Notifications" style="cursor:pointer;" onclick="myanos.showNotification('No new notifications')">🔔</span><span id="taskbar-date" style="font-size:11px;color:#565f89;"></span><span id="clock" style="font-weight:600;"></span>`;
            tray.innerHTML = trayIcons;
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
        document.querySelector('.notification-popup')?.remove();
        const notif = document.createElement('div');
        notif.className = 'notification-popup';
        notif.textContent = msg;
        notif.style.cssText = 'position:fixed;top:20px;right:20px;background:rgba(24,26,41,0.97);border:1px solid rgba(122,162,247,0.3);border-radius:8px;padding:12px 20px;color:#c0caf5;font-size:13px;z-index:99999;box-shadow:0 4px 16px rgba(0,0,0,0.4);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);';
        document.body.appendChild(notif);
        setTimeout(() => { notif.style.opacity = '0'; notif.style.transition = 'opacity 0.3s'; }, 2500);
        setTimeout(() => notif.remove(), 3000);
    }

    updateTaskbarApps() {
        const container = document.getElementById('taskbar-apps');
        if (!container) return;
        container.innerHTML = '';
        this.windows.forEach((win, id) => {
            const el = document.createElement('div');
            el.className = `taskbar-app${id === this.activeWindowId ? ' active' : ''}`;
            const showText = !this.isMobile && window.innerWidth > 500;
            el.innerHTML = `<span class="app-icon">${win.app.icon}</span>${showText ? `<span class="taskbar-text">${win.app.name}</span>` : ''}`;
            el.addEventListener('click', () => {
                if (win.minimized) this.restoreWindow(id);
                else if (id === this.activeWindowId) this.minimizeWindow(id);
                else this.focusWindow(id);
            });
            container.appendChild(el);
        });
        // Auto-scroll to active app
        const activeApp = container.querySelector('.active');
        if (activeApp) activeApp.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
    }

    // ── Start Menu ──
    setupStartMenu() {
        const btn = document.getElementById('start-btn');
        const menu = document.getElementById('start-menu');
        if (!btn || !menu) return;
        btn.addEventListener('click', (e) => { e.stopPropagation(); menu.classList.toggle('open'); });
        document.addEventListener('click', (e) => { if (!menu.contains(e.target) && !btn.contains(e.target)) menu.classList.remove('open'); });
        // Also close on touchstart outside
        document.addEventListener('touchstart', (e) => {
            if (!menu.contains(e.target) && !btn.contains(e.target) && menu.classList.contains('open')) {
                menu.classList.remove('open');
            }
        });
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
            if (this.isMobile) return; // Use long-press on mobile instead
            e.preventDefault();
            const menu = document.getElementById('context-menu');
            if (!menu) return;
            menu.style.left = Math.min(e.clientX, window.innerWidth - 200) + 'px';
            menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
            menu.classList.add('open');
        });
        document.addEventListener('click', () => { document.getElementById('context-menu')?.classList.remove('open'); });
    }

    // ════════════════════════════════════════
    // TOUCH EVENTS (Mobile Support)
    // ════════════════════════════════════════

    setupTouchEvents() {
        let longPressTimer = null;
        let longPressTarget = null;

        // ── Double-tap detection for desktop icons ──
        document.getElementById('desktop-icons')?.addEventListener('touchend', (e) => {
            const icon = e.target.closest('.desktop-icon');
            if (!icon) return;
            const now = Date.now();
            if (this.lastTapTarget === icon && now - this.lastTapTime < 350) {
                // Double-tap detected
                e.preventDefault();
                this.openApp(icon.dataset.appId);
                this.lastTapTime = 0;
                this.lastTapTarget = null;
            } else {
                this.lastTapTime = now;
                this.lastTapTarget = icon;
                // Single tap - select
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
                icon.classList.add('selected');
            }
        });

        // ── Long-press for context menu on mobile ──
        document.getElementById('desktop')?.addEventListener('touchstart', (e) => {
            // Don't trigger on icons, windows, or taskbar
            if (e.target.closest('.desktop-icon') || e.target.closest('.myanos-window') || e.target.closest('#taskbar') || e.target.closest('#start-menu')) return;

            longPressTarget = e.target;
            longPressTimer = setTimeout(() => {
                e.preventDefault();
                const touch = e.touches[0];
                const menu = document.getElementById('context-menu');
                if (!menu) return;
                menu.style.left = '8px';
                menu.style.top = Math.max(8, touch.clientY - 100) + 'px';
                menu.classList.add('open');
                longPressTimer = null;
            }, 600);
        }, { passive: false });

        document.getElementById('desktop')?.addEventListener('touchmove', () => {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        });

        document.getElementById('desktop')?.addEventListener('touchend', () => {
            if (longPressTimer) { clearTimeout(longPressTimer); longPressTimer = null; }
        });

        // ── Touch drag for windows ──
        document.addEventListener('touchstart', (e) => {
            const titlebar = e.target.closest('.window-titlebar');
            if (!titlebar || e.target.closest('.win-ctrl') || e.target.closest('.mobile-back-btn')) return;
            const id = parseInt(titlebar.dataset.winId);
            const win = this.windows.get(id);
            if (!win || win.maximized) return;
            this.focusWindow(id);
            const touch = e.touches[0];
            this.dragState = { id, startX: touch.clientX - win.x, startY: touch.clientY - win.y };
        }, { passive: true });

        // ── Touch drag for file manager items ──
        document.addEventListener('touchstart', (e) => {
            const fmItem = e.target.closest('.fm-item, .fm-list-row');
            if (!fmItem) return;
            const now = Date.now();
            const name = fmItem.dataset.name;
            if (this._lastFmTapTarget === fmItem && now - this._lastFmTapTime < 350) {
                // Double-tap on FM item
                const winId = this.fmState?.winId;
                if (winId && name) {
                    const isDir = fmItem.dataset.isdir === 'true';
                    this.fmOpen(winId, name, isDir);
                }
                this._lastFmTapTime = 0;
                this._lastFmTapTarget = null;
            } else {
                this._lastFmTapTime = now;
                this._lastFmTapTarget = fmItem;
            }
        }, { passive: true });
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

        // Responsive window sizing
        let x, y, w, h;
        if (this.isMobile) {
            // Full screen on mobile
            x = 0; y = 0; w = '100vw'; h = `calc(100vh - 52px)`;
        } else {
            const offset = (id % 8) * 30;
            x = 120 + offset; y = 60 + offset; w = 750; h = 500;
        }

        this.windows.set(id, { id, app, element: winEl, minimized: false, maximized: false, x, y, width: w, height: h });
        this.positionWindow(id);
        this.focusWindow(id);
        this.renderWindowContent(id);
        this.updateTaskbarApps();

        // Auto-maximize on mobile
        if (this.isMobile) {
            winEl.classList.add('maximized');
            this.windows.get(id).maximized = true;
        }
    }

    createWindowElement(id, app) {
        const el = document.createElement('div');
        el.className = 'myanos-window';
        el.id = `window-${id}`;
        const backBtn = this.isMobile ? `<button class="mobile-back-btn" onclick="myanos.closeWindow(${id})">✕</button>` : '';
        el.innerHTML = `
            <div class="window-titlebar" data-win-id="${id}">
                <div class="window-title">
                    ${backBtn}
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
        if (typeof win.width === 'string') {
            win.element.style.left = win.x + 'px';
            win.element.style.top = win.y + 'px';
            win.element.style.width = win.width;
            win.element.style.height = win.height;
        } else {
            win.element.style.left = win.x + 'px';
            win.element.style.top = win.y + 'px';
            win.element.style.width = win.width + 'px';
            win.element.style.height = win.height + 'px';
        }
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
    maximizeWindow(id) {
        const w = this.windows.get(id);
        if (!w) return;
        if (this.isMobile) {
            // Toggle maximize/minimize on mobile
            if (w.maximized) { this.minimizeWindow(id); }
            else { w.element.classList.add('maximized'); w.maximized = true; }
        } else {
            w.maximized = !w.maximized;
            w.element.classList.toggle('maximized', w.maximized);
        }
    }
    closeWindow(id) { const w = this.windows.get(id); if (!w) return; w.element.remove(); this.windows.delete(id); if (this.activeWindowId === id) this.activeWindowId = null; this.updateTaskbarApps(); }

    setupEventListeners() {
        // Window controls
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

        // Mouse drag (desktop)
        document.addEventListener('mousedown', (e) => {
            if (this.isMobile) return; // Use touch events on mobile
            const titlebar = e.target.closest('.window-titlebar');
            if (!titlebar || e.target.closest('.win-ctrl')) return;
            const id = parseInt(titlebar.dataset.winId);
            const win = this.windows.get(id);
            if (!win || win.maximized) return;
            this.focusWindow(id);
            this.dragState = { id, startX: e.clientX - win.x, startY: e.clientY - win.y };
            e.preventDefault();
        });

        // Mouse resize (desktop)
        document.addEventListener('mousedown', (e) => {
            if (this.isMobile) return;
            const handle = e.target.closest('.window-resize');
            if (!handle) return;
            const id = parseInt(handle.dataset.winId);
            const win = this.windows.get(id);
            if (!win || win.maximized) return;
            this.focusWindow(id);
            this.resizeState = { id, startX: e.clientX, startY: e.clientY, startW: win.element.offsetWidth, startH: win.element.offsetHeight };
            e.preventDefault();
        });

        // Mouse move (desktop drag/resize)
        document.addEventListener('mousemove', (e) => {
            if (this.dragState) {
                const win = this.windows.get(this.dragState.id); if (!win) return;
                win.x = e.clientX - this.dragState.startX; win.y = Math.max(0, e.clientY - this.dragState.startY);
                win.element.style.left = win.x + 'px'; win.element.style.top = win.y + 'px';
            }
            if (this.resizeState) {
                const win = this.windows.get(this.resizeState.id); if (!win) return;
                win.element.style.width = Math.max(280, this.resizeState.startW + e.clientX - this.resizeState.startX) + 'px';
                win.element.style.height = Math.max(180, this.resizeState.startH + e.clientY - this.resizeState.startY) + 'px';
            }
        });

        // Touch move (mobile drag)
        document.addEventListener('touchmove', (e) => {
            if (this.dragState && e.touches.length === 1) {
                const touch = e.touches[0];
                const win = this.windows.get(this.dragState.id);
                if (!win || win.maximized) return;
                win.x = touch.clientX - this.dragState.startX;
                win.y = Math.max(0, touch.clientY - this.dragState.startY);
                win.element.style.left = win.x + 'px';
                win.element.style.top = win.y + 'px';
            }
        }, { passive: true });

        // End drag/resize
        document.addEventListener('mouseup', () => { this.dragState = null; this.resizeState = null; });
        document.addEventListener('touchend', () => { this.dragState = null; this.resizeState = null; });

        // Focus window on click/touch
        document.addEventListener('mousedown', (e) => {
            const winEl = e.target.closest('.myanos-window');
            if (winEl) this.focusWindow(parseInt(winEl.id.replace('window-', '')));
        });
        document.addEventListener('touchstart', (e) => {
            const winEl = e.target.closest('.myanos-window');
            if (winEl) this.focusWindow(parseInt(winEl.id.replace('window-', '')));
        }, { passive: true });

        // Context menu items
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
            'myanai': () => this.renderMyanAi(body, id),
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
        // Auto-scroll to bottom
        term.scrollTop = term.scrollHeight;
    }

    executeTermCommand(term, cmd, winId) {
        const out = document.createElement('div');
        out.className = 'term-line';
        const commands = {
            help: () => 'Available: help, clear, neofetch, date, whoami, uname, ls, pwd, echo, myan, mmc, python3, cat, mkdir, touch, rm, exit',
            clear: () => { term.innerHTML = ''; return null; },
            neofetch: () => 'meonnmi@myanos\nOS: Myanos Web OS v2.1.0\nDesktop: Myanos Desktop Environment v3.0\nShell: myanos-terminal v2.0\nPackages: .myan (MyanPM v2.0)\nApp Store: Phase 7 Complete\nLanguage: Myanmar Code (127 keywords)\nMobile: ' + (this.isMobile ? 'Yes' : 'No') + '\n🇲🇲 Made in Myanmar',
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
        term.scrollTop = term.scrollHeight;
    }

    // ════════════════════════════════════════
    // FILE MANAGER (Enhanced + Mobile)
    // ════════════════════════════════════════

    renderFileManager(body, winId) {
        this.fmState = { currentPath: '/home/meonnmi', viewMode: 'grid', selected: null, winId };

        const sidebarToggle = this.isMobile ? `<button class="fm-sidebar-toggle" id="fm-toggle-${winId}">☰ Folders</button>` : '';

        body.innerHTML = `<div class="app-filemanager" id="fm-${winId}">
            <div class="fm-sidebar" id="fm-sidebar-${winId}">
                <div class="fm-sidebar-item active" data-path="/home/meonnmi">📁 Home</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/Desktop">🖥️ Desktop</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/Documents">📄 Documents</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/Downloads">⬇️ Downloads</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/Pictures">🖼️ Pictures</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/Music">🎵 Music</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/myan-os">📦 Myanos OS</div>
                <div class="fm-sidebar-item" data-path="/home/meonnmi/.config">⚙️ .config</div>
            </div>
            <div style="flex:1; display:flex; flex-direction:column; position:relative;">
                <div class="fm-toolbar">
                    ${sidebarToggle}
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

        const fm = document.getElementById(`fm-${winId}`);
        if (!fm) return;

        // Sidebar toggle (mobile)
        const toggleBtn = document.getElementById(`fm-toggle-${winId}`);
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                document.getElementById(`fm-sidebar-${winId}`)?.classList.toggle('open');
            });
        }

        // Sidebar navigation - close sidebar on mobile after select
        fm.querySelectorAll('.fm-sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                fm.querySelectorAll('.fm-sidebar-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.fmNavigate(winId, item.dataset.path);
                if (this.isMobile) {
                    document.getElementById(`fm-sidebar-${winId}`)?.classList.remove('open');
                }
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

        // Context menu
        const content = document.getElementById(`fm-content-${winId}`);
        content?.addEventListener('contextmenu', (e) => {
            e.preventDefault(); e.stopPropagation();
            const item = e.target.closest('.fm-item, .fm-list-row');
            if (item) {
                this.fmState.selected = item.dataset.name;
                this.showFMContextMenu(e.clientX, e.clientY, winId, item.dataset.name);
            }
        });

        // Click to select FM items (mobile)
        content?.addEventListener('click', (e) => {
            const item = e.target.closest('.fm-item, .fm-list-row');
            if (item) {
                this.fmState.selected = item.dataset.name;
                this.fmRefresh(winId);
            } else {
                this.fmState.selected = null;
                this.fmRefresh(winId);
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
                this.openFileInNotepad(name, file.content);
            }
        }
    }

    openFileInNotepad(name, content) {
        this.apps.push({ id: 'notepad-open', name: name, icon: '📝', desc: 'Text editor', category: 'tools', _content: content, _fileName: name });
        this.openApp('notepad-open');
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
        document.querySelector('.fm-context-menu')?.remove();
        const menu = document.createElement('div');
        menu.className = 'fm-context-menu';
        const menuX = this.isMobile ? '8px' : Math.min(x, window.innerWidth - 200) + 'px';
        const menuY = this.isMobile ? Math.max(8, y - 150) + 'px' : Math.min(y, window.innerHeight - 200) + 'px';
        menu.style.cssText = `position:fixed;left:${menuX};top:${menuY};z-index:99999;${this.isMobile ? 'right:8px;width:auto;min-width:0;' : ''}`;
        const isDir = !!this.vfs.dirs[this.fmState.currentPath + '/' + name];
        menu.innerHTML = `
            <div class="ctx-item" onclick="myanos.fmOpen('${winId}','${name}',${isDir})">📂 Open</div>
            <div class="ctx-item" onclick="myanos.fmRename('${winId}','${name}')">✏️ Rename</div>
            ${!isDir ? `<div class="ctx-item" onclick="myanos.openFileInNotepad('${name}', myanos.vfsGetFile(myanos.fmState.currentPath,'${name}')?.content||'')">📝 Edit</div>` : ''}
            <div class="ctx-sep"></div>
            <div class="ctx-item" style="color:#f7768e;" onclick="myanos.fmState.selected='${name}';myanos.fmDelete('${winId}')">🗑️ Delete</div>
        `;
        document.body.appendChild(menu);
        setTimeout(() => {
            const close = () => { menu.remove(); document.removeEventListener('click', close); document.removeEventListener('touchstart', close); };
            document.addEventListener('click', close, { once: true });
            document.addEventListener('touchstart', close, { once: true });
        }, 10);
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
    // SETTINGS (Persistent + Mobile)
    // ════════════════════════════════════════

    renderSettings(body) {
        const s = this.settings;
        const sidebarToggle = this.isMobile ? `<div class="settings-sidebar-toggle" id="settings-toggle">☰ Settings Menu</div>` : '';

        body.innerHTML = `${sidebarToggle}<div class="app-settings">
            <div class="settings-sidebar" id="settings-sidebar">
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

        // Sidebar toggle (mobile)
        const toggleBtn = document.getElementById('settings-toggle');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                document.getElementById('settings-sidebar')?.classList.toggle('open');
            });
        }

        body.querySelectorAll('.settings-item').forEach(item => {
            item.addEventListener('click', () => {
                body.querySelectorAll('.settings-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.renderSettingsTab(item.dataset.tab);
                if (this.isMobile) document.getElementById('settings-sidebar')?.classList.remove('open');
            });
        });
        this.renderSettingsTab('display');
    }

    renderSettingsTab(tab) {
        const content = document.getElementById('settings-content');
        if (!content) return;
        const s = this.settings;

        const tabs = {
            display: `<div class="settings-section">
                <h3>🖥️ Display Settings</h3>
                <div class="settings-row"><label>Font Size</label><div><select class="setting-select" id="set-fontsize"><option value="12" ${s.fontSize==12?'selected':''}>12px</option><option value="13" ${s.fontSize==13?'selected':''}>13px</option><option value="14" ${s.fontSize==14?'selected':''}>14px</option><option value="15" ${s.fontSize==15?'selected':''}>15px</option><option value="16" ${s.fontSize==16?'selected':''}>16px</option></select></div></div>
                <div class="settings-row"><label>Clock Format</label><div><select class="setting-select" id="set-clockformat"><option value="24h" ${s.clockFormat=='24h'?'selected':''}>24 Hour</option><option value="12h" ${s.clockFormat=='12h'?'selected':''}>12 Hour</option></select></div></div>
                <div class="settings-row"><label>Animations</label><div class="toggle ${s.animations?'on':''}" id="set-animations"></div></div>
                <div class="settings-row"><label>Blur Effects</label><div class="toggle ${s.blur?'on':''}" id="set-blur"></div></div>
                <div class="settings-row"><label>Device</label><div class="value">${this.isMobile?'📱 Mobile':'🖥️ Desktop'}</div></div>
                <div class="settings-row"><label>Screen</label><div class="value">${window.innerWidth} × ${window.innerHeight}</div></div>
            </div>`,
            appearance: `<div class="settings-section">
                <h3>🎨 Appearance</h3>
                <div class="settings-row"><label>Theme</label><div><select class="setting-select" id="set-theme"><option value="dark" ${s.theme=='dark'?'selected':''}>Dark</option><option value="light" ${s.theme=='light'?'selected':''}>Light</option></select></div></div>
            </div>`,
            wallpaper: `<div class="settings-section">
                <h3>🖼️ Wallpaper</h3>
                <div class="wallpaper-grid">
                    ${['default','ocean','sunset','forest','purple','minimal'].map(wp =>
                        `<div class="wallpaper-option ${s.wallpaper===wp?'active':''}" data-wp="${wp}">
                            <div class="wallpaper-preview wp-${wp}"></div>
                            <div class="wallpaper-name">${wp.charAt(0).toUpperCase()+wp.slice(1)}</div>
                        </div>`
                    ).join('')}
                </div>
            </div>`,
            sound: `<div class="settings-section"><h3>🔊 Sound</h3><div class="settings-row"><label>Notification Sounds</label><div class="toggle on" id="set-sound"></div></div></div>`,
            language: `<div class="settings-section"><h3>🌐 Language</h3><div class="settings-row"><label>System Language</label><div><select class="setting-select" id="set-language"><option value="my" ${s.language=='my'?'selected':''}>🇲🇲 Myanmar</option><option value="en" ${s.language=='en'?'selected':''}>🇬🇧 English</option></select></div></div></div>`,
            packages: `<div class="settings-section"><h3>📦 Packages</h3><div class="settings-row"><label>MyanPM Version</label><div class="value">v2.0.0</div></div><div class="settings-row"><label>Package Format</label><div class="value">.myan</div></div><div class="settings-row"><label>App Store</label><div class="value">Phase 7 Complete</div></div></div>`,
            about: `<div class="settings-section"><h3>ℹ️ About Myanos</h3>
                <div class="settings-row"><label>OS Version</label><div class="value">v2.1.0</div></div>
                <div class="settings-row"><label>Desktop</label><div class="value">v3.0.0 (Mobile)</div></div>
                <div class="settings-row"><label>Author</label><div class="value">Meonnmi-ops</div></div>
                <div class="settings-row"><label>Language</label><div class="value">Myanmar Code (127 kw)</div></div>
                <div class="settings-row"><label>GitHub</label><div class="value">meonnmi-ops/Myanos</div></div>
            </div>`,
        };

        content.innerHTML = tabs[tab] || '<div class="settings-section"><h3>Unknown tab</h3></div>';

        // Event handlers for settings
        const fontSizeEl = document.getElementById('set-fontsize');
        if (fontSizeEl) fontSizeEl.addEventListener('change', (e) => { this.settings.fontSize = parseInt(e.target.value); this.saveSettings(); this.applySettings(); });
        const clockFormatEl = document.getElementById('set-clockformat');
        if (clockFormatEl) clockFormatEl.addEventListener('change', (e) => { this.settings.clockFormat = e.target.value; this.saveSettings(); });
        const themeEl = document.getElementById('set-theme');
        if (themeEl) themeEl.addEventListener('change', (e) => { this.settings.theme = e.target.value; this.saveSettings(); this.applySettings(); });
        const langEl = document.getElementById('set-language');
        if (langEl) langEl.addEventListener('change', (e) => { this.settings.language = e.target.value; this.saveSettings(); });

        // Toggle switches
        ['animations', 'blur', 'sound'].forEach(key => {
            const el = document.getElementById(`set-${key}`);
            if (el) {
                el.addEventListener('click', () => {
                    const val = el.classList.toggle('on');
                    if (key !== 'sound') {
                        this.settings[key] = val;
                        this.saveSettings();
                        this.applySettings();
                    }
                });
            }
        });

        // Wallpaper selection
        document.querySelectorAll('.wallpaper-option').forEach(opt => {
            opt.addEventListener('click', () => {
                this.settings.wallpaper = opt.dataset.wp;
                this.saveSettings();
                this.applySettings();
                document.querySelectorAll('.wallpaper-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
            });
        });
    }

    // ════════════════════════════════════════
    // APP STORE
    // ════════════════════════════════════════

    renderAppStore(body) {
        const featuredPkgs = [
            { name: 'myanos-core', version: '2.1.0', icon: '💎', desc: 'Core OS packages', category: 'System', installed: true, downloads: 1250 },
            { name: 'myanmar-code', version: '2.0.1', icon: '🇲🇲', desc: 'Myanmar programming language', category: 'Dev', installed: true, downloads: 890 },
            { name: 'terminal-plus', version: '1.3.0', icon: '⬛', desc: 'Enhanced terminal emulator', category: 'System', installed: false, downloads: 650 },
            { name: 'code-editor', version: '1.0.0', icon: '📝', desc: 'Lightweight code editor', category: 'Dev', installed: false, downloads: 420 },
            { name: 'media-player', version: '0.9.0', icon: '🎵', desc: 'Audio & video player', category: 'Media', installed: false, downloads: 310 },
            { name: 'file-compressor', version: '1.1.0', icon: '📦', desc: 'ZIP/TAR archive tool', category: 'Utils', installed: false, downloads: 280 },
        ];
        body.innerHTML = `<div class="app-store">
            <div class="store-header">
                <div class="store-title">🏪 Myanos App Store</div>
                <input class="store-search" placeholder="Search packages..." id="store-search">
            </div>
            <div class="store-section-title">⭐ Featured Packages</div>
            <div class="store-featured-grid">${featuredPkgs.map(pkg => `
                <div class="store-card">
                    <div class="store-card-header">
                        <span style="font-size:28px;">${pkg.icon}</span>
                        <div style="flex:1;">
                            <div style="font-size:14px;color:#c0caf5;font-weight:500;">${pkg.name}</div>
                            <div style="font-size:11px;color:#565f89;">${pkg.desc}</div>
                            <div style="font-size:10px;color:#565f89;margin-top:2px;">v${pkg.version} · ${pkg.category} · ↓${pkg.downloads}</div>
                        </div>
                        <button class="store-btn ${pkg.installed?'installed':''}" onclick="this.textContent=this.classList.toggle('installed')?'Installed':'Install'">${pkg.installed?'Installed':'Install'}</button>
                    </div>
                </div>
            `).join('')}</div>
        </div>`;

        document.getElementById('store-search')?.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            document.querySelectorAll('.store-card').forEach(card => {
                card.style.display = card.textContent.toLowerCase().includes(q) ? 'block' : 'none';
            });
        });
    }

    // ════════════════════════════════════════
    // NOTEPAD
    // ════════════════════════════════════════

    renderNotepad(body) {
        // Check if opened from file
        const currentWin = [...this.windows.values()].pop();
        let fileName = 'Untitled';
        let fileContent = '';
        if (currentWin && currentWin.app._fileName) {
            fileName = currentWin.app._fileName;
            fileContent = currentWin.app._content || '';
        }
        body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;">
            <div class="notepad-toolbar">
                <span style="font-size:12px;color:#565f89;">📄 ${fileName}</span>
                <div style="display:flex;gap:6px;">
                    <button class="fm-btn" id="notepad-save" title="Save">💾 Save</button>
                    <button class="fm-btn" id="notepad-clear" title="Clear">🗑️ Clear</button>
                </div>
            </div>
            <textarea class="notepad-editor" id="notepad-editor" placeholder="Start typing...">${fileContent}</textarea>
        </div>`;
        document.getElementById('notepad-save')?.addEventListener('click', () => {
            this.showNotification('File saved to VFS');
        });
        document.getElementById('notepad-clear')?.addEventListener('click', () => {
            if (confirm('Clear all text?')) document.getElementById('notepad-editor').value = '';
        });
    }

    // ════════════════════════════════════════
    // SYSTEM MONITOR
    // ════════════════════════════════════════

    renderMonitor(body) {
        const cpu = Math.floor(Math.random() * 40 + 10);
        const mem = Math.floor(Math.random() * 30 + 30);
        const disk = 42;
        body.innerHTML = `<div class="app-monitor">
            <div class="monitor-card"><h4>📊 CPU Usage</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-cpu" style="width:${cpu}%"></div></div><div class="monitor-stats"><span>${cpu}% used</span><span>4 cores</span></div></div>
            <div class="monitor-card"><h4>🧠 Memory</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-mem" style="width:${mem}%"></div></div><div class="monitor-stats"><span>${mem}% used</span><span>${(mem*8/100).toFixed(1)} / 8.0 GB</span></div></div>
            <div class="monitor-card"><h4>💿 Disk</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-disk" style="width:${disk}%"></div></div><div class="monitor-stats"><span>${disk}% used</span><span>21.0 / 50.0 GB</span></div></div>
            <div class="monitor-card"><h4>📱 Device Info</h4>
                <div style="font-size:12px;color:#a9b1d6;line-height:2;">
                    Type: ${this.isMobile?'Mobile':'Desktop'}<br>
                    Screen: ${window.innerWidth} × ${window.innerHeight}<br>
                    Pixel Ratio: ${window.devicePixelRatio || 1}x<br>
                    Touch: ${('ontouchstart' in window)?'Yes':'No'}<br>
                    User Agent: ${navigator.userAgent.substring(0, 80)}...
                </div>
            </div>
        </div>`;
    }

    // ════════════════════════════════════════
    // ABOUT / NEOFETCH
    // ════════════════════════════════════════

    renderNeofetch(body) {
        body.innerHTML = `<div class="app-neofetch">
            <div class="logo">       ┌──────────────┐</div>
            <div class="logo">       │   Myanos OS   │</div>
            <div class="logo">       │  ████████████  │</div>
            <div class="logo">       │  █▀▀▀▀▀▀▀▀█  │</div>
            <div class="logo">       │    ▀▀▀▀▀▀    │</div>
            <div class="logo">       └──────────────┘</div>
            <br>
            <div class="title">meonnmi@myanos</div>
            <div class="info">─────────────────</div>
            <div><span class="label">OS:</span> <span class="info">Myanos Web OS v2.1.0</span></div>
            <div><span class="label">Desktop:</span> <span class="info">Myanos Desktop Environment v3.0.0</span></div>
            <div><span class="label">Device:</span> <span class="info">${this.isMobile?'📱 Mobile':'🖥️ Desktop'} (${window.innerWidth}×${window.innerHeight})</span></div>
            <div><span class="label">Shell:</span> <span class="info">myanos-terminal v2.0</span></div>
            <div><span class="label">Packages:</span> <span class="info">.myan (MyanPM v2.0)</span></div>
            <div><span class="label">App Store:</span> <span class="info">Phase 7 Complete</span></div>
            <div><span class="label">Language:</span> <span class="info">Myanmar Code (127 keywords)</span></div>
            <div><span class="label">Touch:</span> <span class="info">${('ontouchstart' in window)?'Supported':'Not available'}</span></div>
            <div><span class="label">Theme:</span> <span class="info">${this.settings.theme}</span></div>
            <div class="highlight">🇲🇲 Made in Myanmar</div>
        </div>`;
    }

    // ════════════════════════════════════════
    // OTHER APPS (Stubs)
    // ════════════════════════════════════════

    renderMyanmarCode(body) {
        body.innerHTML = `<div style="padding:20px;">
            <h3 style="color:#7aa2f7;margin-bottom:16px;">🇲🇲 Myanmar Code v2.0.1</h3>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;font-family:monospace;font-size:13px;color:#a9b1d6;line-height:1.8;">
                <div style="color:#9ece6a;">// Myanmar Programming Language</div>
                <div style="color:#9ece6a;">// 127 Keywords | Author: Aung MoeOo (MWD)</div>
                <br>
                <div><span style="color:#bb9af7;">ဥပေဒါ</span> <span style="color:#7aa2f7;">မင်္ဂလာပါ</span> = <span style="color:#ff9e64;">"Hello Myanmar"</span></div>
                <div><span style="color:#bb9af7;">ပြုစု</span>(<span style="color:#7aa2f7;">မင်္ဂလာပါ</span>)</div>
                <div><span style="color:#bb9af7;">သကြား</span> 5 <span style="color:#bb9af7;">မှ</span> 10</div>
                <div><span style="color:#bb9af7;">လုပ်</span> { ... }</div>
            </div>
        </div>`;
    }

    renderPackageManager(body) {
        body.innerHTML = `<div style="padding:20px;">
            <h3 style="color:#7aa2f7;margin-bottom:16px;">📦 MyanPM v2.0.0</h3>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;font-family:monospace;font-size:13px;color:#a9b1d6;line-height:1.8;">
                <div style="color:#9ece6a;">$ myan list</div>
                <div>myanos-core    2.1.0    [installed]</div>
                <div>myanmar-code   2.0.1    [installed]</div>
                <div>terminal-plus  1.3.0    [available]</div>
                <div>code-editor    1.0.0    [available]</div>
                <div>media-player   0.9.0    [available]</div>
                <br>
                <div style="color:#9ece6a;">$ myan search-remote myanmar</div>
                <div>myanmar-code   2.0.1    Myanmar programming lang</div>
                <div>myanmar-dict   1.0.0    Myanmar-English dictionary</div>
                <br>
                <div style="color:#565f89;">Package format: .myan (ZIP + MANIFEST.json)</div>
            </div>
        </div>`;
    }

    renderToolbox(body) {
        const tools = [
            { name: 'Password Generator', icon: '🔐', desc: 'Generate secure passwords' },
            { name: 'Color Picker', icon: '🎨', desc: 'Pick and convert colors' },
            { name: 'Base64 Encoder', icon: '🔄', desc: 'Encode/decode Base64' },
            { name: 'JSON Formatter', icon: '📋', desc: 'Format & validate JSON' },
            { name: 'Hash Generator', icon: '#️⃣', desc: 'MD5, SHA-1, SHA-256' },
            { name: 'QR Generator', icon: '📱', desc: 'Generate QR codes' },
        ];
        body.innerHTML = `<div style="padding:20px;">
            <h3 style="color:#7aa2f7;margin-bottom:16px;">🔧 Toolbox</h3>
            <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;">
                ${tools.map(t => `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;cursor:pointer;transition:background 0.15s;" onmouseover="this.style.background='rgba(255,255,255,0.06)'" onmouseout="this.style.background='rgba(255,255,255,0.03)'">
                    <div style="font-size:28px;margin-bottom:8px;">${t.icon}</div>
                    <div style="font-size:13px;color:#c0caf5;font-weight:500;">${t.name}</div>
                    <div style="font-size:11px;color:#565f89;margin-top:4px;">${t.desc}</div>
                </div>`).join('')}
            </div>
        </div>`;
    }

    renderAndroid(body) {
        body.innerHTML = `<div style="padding:20px;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">📱</div>
            <h3 style="color:#7aa2f7;margin-bottom:12px;">Android Layer</h3>
            <p style="color:#a9b1d6;font-size:13px;line-height:1.6;">APK management and Android emulation layer for Myanos OS.<br>Drop .apk files to install.</p>
        </div>`;
    }

    renderPS2(body) {
        body.innerHTML = `<div style="padding:20px;text-align:center;">
            <div style="font-size:48px;margin-bottom:16px;">🎮</div>
            <h3 style="color:#7aa2f7;margin-bottom:12px;">PS2 Games</h3>
            <p style="color:#a9b1d6;font-size:13px;line-height:1.6;">PlayStation 2 emulation layer using web technologies.<br>Load .iso or .bin files to play.</p>
        </div>`;
    }

    renderMyanAi(body, winId) {
        body.innerHTML = `<div class="myanai-chat" id="maichat-${winId}">
            <div class="myanai-header">
                <div class="myanai-header-left">
                    <span style="font-size:20px;">🤖</span>
                    <div>
                        <div style="font-size:14px;color:#c0caf5;font-weight:500;">MyanAi</div>
                        <div class="myanai-status">● Offline Mode</div>
                    </div>
                </div>
                <div class="myanai-header-right">
                    <button class="fm-btn" onclick="document.getElementById('maichat-${winId}').querySelector('.myanai-messages').innerHTML=''" title="Clear chat">🗑️</button>
                </div>
            </div>
            <div class="myanai-messages">
                <div class="myanai-msg bot">
                    <div class="msg-avatar">🤖</div>
                    <div class="msg-bubble"><div class="msg-text">Mingar-bar! 👋<br><br>I'm <b>MyanAi</b>, the AI assistant for Myanos OS.<br><br>I'm currently in offline mode. Try typing a message!</div></div>
                </div>
            </div>
            <div class="myanai-input-area">
                <input class="myanai-input" id="maichat-input-${winId}" placeholder="Type a message...">
                <button class="myanai-send" id="maichat-send-${winId}">➤</button>
            </div>
        </div>`;

        const input = document.getElementById(`maichat-input-${winId}`);
        const sendBtn = document.getElementById(`maichat-send-${winId}`);
        const messages = document.querySelector(`#maichat-${winId} .myanai-messages`);

        const sendMessage = () => {
            const text = input.value.trim();
            if (!text) return;
            // User message
            const userMsg = document.createElement('div');
            userMsg.className = 'myanai-msg user';
            userMsg.innerHTML = `<div class="msg-avatar">👤</div><div class="msg-bubble"><div class="msg-text">${this.escapeHtml(text)}</div></div>`;
            messages.appendChild(userMsg);
            input.value = '';
            // Bot response (offline mode)
            setTimeout(() => {
                const botMsg = document.createElement('div');
                botMsg.className = 'myanai-msg bot';
                const responses = [
                    "I'm in offline mode right now. Connect to the internet for full AI capabilities! 🌐",
                    "Great question! Unfortunately I need an internet connection to process this. Try again online! 📡",
                    "I'm MyanAi, currently running in offline mode. Online features coming soon! 🚀",
                    "Hmm, let me think... Actually I need to be online to help with that. Sorry! 😅",
                    "That's interesting! I'll be able to help better once we're connected to the AI backend. 🤖",
                ];
                botMsg.innerHTML = `<div class="msg-avatar">🤖</div><div class="msg-bubble"><div class="msg-text">${responses[Math.floor(Math.random() * responses.length)]}</div></div>`;
                messages.appendChild(botMsg);
                messages.scrollTop = messages.scrollHeight;
            }, 800);
            messages.scrollTop = messages.scrollHeight;
        };

        input?.addEventListener('keydown', (e) => { if (e.key === 'Enter') sendMessage(); });
        sendBtn?.addEventListener('click', sendMessage);
    }

    escapeHtml(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    renderBrowser(body) {
        body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;">
            <div style="display:flex;gap:6px;padding:8px;border-bottom:1px solid rgba(255,255,255,0.06);align-items:center;">
                <button class="fm-btn" title="Back">←</button>
                <button class="fm-btn" title="Forward">→</button>
                <button class="fm-btn" title="Refresh">⟳</button>
                <input style="flex:1;padding:6px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:16px;color:#c0caf5;font-size:13px;outline:none;min-width:0;" placeholder="Enter URL..." value="https://myanos.dev">
            </div>
            <div style="flex:1;display:flex;align-items:center;justify-content:center;background:#1a1b26;padding:20px;">
                <div style="text-align:center;">
                    <div style="font-size:48px;margin-bottom:12px;">🌐</div>
                    <div style="font-size:16px;color:#c0caf5;font-weight:500;">Myanos Browser</div>
                    <div style="font-size:12px;color:#565f89;margin-top:8px;">Web browser for Myanos OS</div>
                </div>
            </div>
        </div>`;
    }
}

// ═══════════════════════════════════════════
// Initialize Myanos Desktop
// ═══════════════════════════════════════════
let myanos;
document.addEventListener('DOMContentLoaded', () => {
    myanos = new MyanosDesktop();
});
