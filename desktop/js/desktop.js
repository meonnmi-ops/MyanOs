/* ═══════════════════════════════════════════════════════
   Myanos Desktop Environment - Core JS
   Window management, taskbar, start menu, apps
   ═══════════════════════════════════════════════════════ */

class MyanosDesktop {
    constructor() {
        this.windows = new Map();
        this.windowIdCounter = 0;
        this.activeWindowId = null;
        this.zIndexCounter = 100;
        this.dragState = null;
        this.resizeState = null;

        this.apps = [
            { id: 'terminal', name: 'Terminal', icon: '⬛', desc: 'Myanos Terminal', category: 'system' },
            { id: 'files', name: 'File Manager', icon: '📁', desc: 'Browse files', category: 'system' },
            { id: 'monitor', name: 'System Monitor', icon: '📊', desc: 'CPU, RAM, Disk', category: 'system' },
            { id: 'settings', name: 'Settings', icon: '⚙️', desc: 'System settings', category: 'system' },
            { id: 'neofetch', name: 'About Myanos', icon: 'ℹ️', desc: 'System information', category: 'system' },
            { id: 'myanmar-code', name: 'Myanmar Code', icon: '🇲🇲', desc: 'Myanmar programming', category: 'dev' },
            { id: 'pkg-manager', name: 'MyanPM', icon: '📦', desc: 'Package manager', category: 'dev' },
            { id: 'toolbox', name: 'Toolbox', icon: '🔧', desc: 'Professional tools', category: 'tools' },
            { id: 'android', name: 'Android', icon: '📱', desc: 'APK management', category: 'apps' },
            { id: 'ps2', name: 'PS2 Games', icon: '🎮', desc: 'PlayStation 2', category: 'apps' },
            { id: 'myanai', name: 'MyanAi', icon: '🤖', desc: 'AI Agent Builder', category: 'ai' },
            { id: 'browser', name: 'Web Browser', icon: '🌐', desc: 'Browse the web', category: 'apps' },
        ];

        this.init();
    }

    init() {
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
                <span id="clock">--:--</span>
            `;
        }
    }

    startClock() {
        const update = () => {
            const el = document.getElementById('clock');
            if (!el) return;
            const now = new Date();
            const h = String(now.getHours()).padStart(2, '0');
            const m = String(now.getMinutes()).padStart(2, '0');
            el.textContent = `${h}:${m}`;
        };
        update();
        setInterval(update, 10000);
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

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            menu.classList.toggle('open');
        });

        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target)) menu.classList.remove('open');
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
            el.addEventListener('click', () => {
                this.openApp(app.id);
                document.getElementById('start-menu')?.classList.remove('open');
            });
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
        document.addEventListener('click', () => {
            document.getElementById('context-menu')?.classList.remove('open');
        });
    }

    // ── Window Management ──
    openApp(appId) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;

        // Check if already open
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
        this.windows.set(id, {
            id, app,
            element: winEl,
            minimized: false,
            maximized: false,
            x: 120 + offset, y: 60 + offset,
            width: 700, height: 480,
        });

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
        const el = win.element;
        el.style.left = win.x + 'px';
        el.style.top = win.y + 'px';
        el.style.width = win.width + 'px';
        el.style.height = win.height + 'px';
    }

    focusWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        if (this.activeWindowId) {
            const prev = this.windows.get(this.activeWindowId);
            if (prev) prev.element.classList.remove('focused');
        }
        win.element.style.zIndex = ++this.zIndexCounter;
        win.element.classList.add('focused');
        this.activeWindowId = id;
        this.updateTaskbarApps();
    }

    minimizeWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        win.element.style.display = 'none';
        win.minimized = true;
        if (this.activeWindowId === id) this.activeWindowId = null;
        this.updateTaskbarApps();
    }

    restoreWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        win.element.style.display = 'flex';
        win.minimized = false;
        this.focusWindow(id);
        this.updateTaskbarApps();
    }

    maximizeWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        win.maximized = !win.maximized;
        win.element.classList.toggle('maximized', win.maximized);
    }

    closeWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        win.element.remove();
        this.windows.delete(id);
        if (this.activeWindowId === id) this.activeWindowId = null;
        this.updateTaskbarApps();
    }

    // ── Drag & Resize ──
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

        // Drag
        document.addEventListener('mousedown', (e) => {
            const titlebar = e.target.closest('.window-titlebar');
            if (!titlebar || e.target.closest('.win-ctrl')) return;
            const id = parseInt(titlebar.dataset.winId);
            const win = this.windows.get(id);
            if (!win || win.maximized) return;
            this.focusWindow(id);
            this.dragState = {
                id,
                startX: e.clientX - win.x,
                startY: e.clientY - win.y,
            };
            e.preventDefault();
        });

        // Resize
        document.addEventListener('mousedown', (e) => {
            const handle = e.target.closest('.window-resize');
            if (!handle) return;
            const id = parseInt(handle.dataset.winId);
            const win = this.windows.get(id);
            if (!win || win.maximized) return;
            this.focusWindow(id);
            this.resizeState = {
                id,
                startX: e.clientX,
                startY: e.clientY,
                startW: win.element.offsetWidth,
                startH: win.element.offsetHeight,
            };
            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (this.dragState) {
                const win = this.windows.get(this.dragState.id);
                if (!win) return;
                win.x = e.clientX - this.dragState.startX;
                win.y = e.clientY - this.dragState.startY;
                win.y = Math.max(0, win.y);
                win.element.style.left = win.x + 'px';
                win.element.style.top = win.y + 'px';
            }
            if (this.resizeState) {
                const win = this.windows.get(this.resizeState.id);
                if (!win) return;
                const dx = e.clientX - this.resizeState.startX;
                const dy = e.clientY - this.resizeState.startY;
                const newW = Math.max(320, this.resizeState.startW + dx);
                const newH = Math.max(200, this.resizeState.startH + dy);
                win.element.style.width = newW + 'px';
                win.element.style.height = newH + 'px';
            }
        });

        document.addEventListener('mouseup', () => {
            this.dragState = null;
            this.resizeState = null;
        });

        // Focus on click
        document.addEventListener('mousedown', (e) => {
            const winEl = e.target.closest('.myanos-window');
            if (winEl) {
                const id = parseInt(winEl.id.replace('window-', ''));
                this.focusWindow(id);
            }
        });

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

    // ── App Content Renderers ──
    renderWindowContent(id) {
        const win = this.windows.get(id);
        if (!win) return;
        const body = document.getElementById(`win-body-${id}`);
        if (!body) return;

        const renderers = {
            'terminal': () => this.renderTerminal(body, id),
            'files': () => this.renderFileManager(body),
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
        };

        const renderer = renderers[win.app.id];
        if (renderer) renderer();
    }

    renderTerminal(body, winId) {
        body.innerHTML = `
            <div class="app-terminal" id="term-${winId}">
                <div class="term-line logo">       ┌──────────────┐</div>
                <div class="term-line logo">       │   Myanos OS   │</div>
                <div class="term-line logo">       │  ████████████  │</div>
                <div class="term-line logo">       │  █▀▀▀▀▀▀▀▀█  │</div>
                <div class="term-line logo">       │    ▀▀▀▀▀▀    │</div>
                <div class="term-line logo">       └──────────────┘</div>
                <div class="term-line"> Myanos Terminal v1.0.0</div>
                <div class="term-line"> Type 'help' for commands</div>
                <div class="term-line">&nbsp;</div>
            </div>
        `;
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
            help: () => 'Available: help, clear, neofetch, date, whoami, uname, ls, pwd, echo, myan, mmc, python3, exit',
            clear: () => { term.innerHTML = ''; return null; },
            neofetch: () => `meonnmi@myanos\nOS: Myanos Web OS v1.0.0\nShell: myanos-terminal\nPackages: .myan (MyanPM)\nLanguage: Myanmar Code (127 keywords)\n🇲🇲 Made in Myanmar`,
            date: () => new Date().toString(),
            whoami: () => 'meonnmi',
            uname: () => 'Myanos OS 1.0.0 - Web Runtime',
            pwd: () => '/home/meonnmi',
            ls: () => 'Desktop/  Documents/  Downloads/  myan-os/  .config/',
            echo: (args) => args,
            myan: () => 'MyanPM v1.0.0 | Commands: list, install, remove, search',
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

    renderFileManager(body) {
        body.innerHTML = `
            <div class="app-filemanager">
                <div class="fm-sidebar">
                    <div class="fm-sidebar-item active">📁 Home</div>
                    <div class="fm-sidebar-item">🖥️ Desktop</div>
                    <div class="fm-sidebar-item">📄 Documents</div>
                    <div class="fm-sidebar-item">⬇️ Downloads</div>
                    <div class="fm-sidebar-item">🖼️ Pictures</div>
                    <div class="fm-sidebar-item">🎵 Music</div>
                    <div class="fm-sidebar-item">📦 myan-os</div>
                    <div class="fm-sidebar-item">🗑️ Trash</div>
                </div>
                <div style="flex:1; display:flex; flex-direction:column;">
                    <div class="fm-toolbar">
                        <button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">←</button>
                        <button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">→</button>
                        <div class="fm-path">/home/meonnmi</div>
                    </div>
                    <div class="fm-content">
                        <div class="fm-grid">
                            <div class="fm-item"><div class="fm-icon">📁</div><div class="fm-name">Desktop</div></div>
                            <div class="fm-item"><div class="fm-icon">📁</div><div class="fm-name">Documents</div></div>
                            <div class="fm-item"><div class="fm-icon">📁</div><div class="fm-name">Downloads</div></div>
                            <div class="fm-item"><div class="fm-icon">📁</div><div class="fm-name">myan-os</div></div>
                            <div class="fm-item"><div class="fm-icon">📁</div><div class="fm-name">.config</div></div>
                            <div class="fm-item"><div class="fm-icon">📄</div><div class="fm-name">myanos.py</div></div>
                            <div class="fm-item"><div class="fm-icon">📄</div><div class="fm-name">myan_pm.py</div></div>
                            <div class="fm-item"><div class="fm-icon">📦</div><div class="fm-name">setup.sh</div></div>
                            <div class="fm-item"><div class="fm-icon">📄</div><div class="fm-name">README.md</div></div>
                            <div class="fm-item"><div class="fm-icon">📄</div><div class="fm-name">LICENSE</div></div>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    renderMonitor(body) {
        body.innerHTML = `
            <div class="app-monitor">
                <div class="monitor-card">
                    <h4>⚡ CPU Usage</h4>
                    <div class="monitor-bar"><div class="monitor-bar-fill fill-cpu" style="width:35%"></div></div>
                    <div class="monitor-stats"><span>35%</span><span>4 cores</span></div>
                </div>
                <div class="monitor-card">
                    <h4>🧠 Memory Usage</h4>
                    <div class="monitor-bar"><div class="monitor-bar-fill fill-mem" style="width:52%"></div></div>
                    <div class="monitor-stats"><span>4.2 GB / 8 GB</span><span>52%</span></div>
                </div>
                <div class="monitor-card">
                    <h4>💾 Disk Usage</h4>
                    <div class="monitor-bar"><div class="monitor-bar-fill fill-disk" style="width:67%"></div></div>
                    <div class="monitor-stats"><span>134 GB / 200 GB</span><span>67%</span></div>
                </div>
                <div class="monitor-card">
                    <h4>🌡️ System Temperature</h4>
                    <div style="font-size:28px;text-align:center;padding:8px;color:#9ece6a;">42°C</div>
                </div>
                <div class="monitor-card">
                    <h4>⏱️ Uptime</h4>
                    <div style="font-size:14px;text-align:center;padding:8px;color:#a9b1d6;">3h 42m 15s</div>
                </div>
            </div>`;
        // Animate bars
        setTimeout(() => {
            body.querySelectorAll('.monitor-bar-fill').forEach(bar => {
                const w = parseInt(bar.style.width);
                bar.style.width = '0%';
                setTimeout(() => bar.style.width = w + '%', 100);
            });
        }, 50);
    }

    renderSettings(body) {
        body.innerHTML = `
            <div class="app-settings">
                <div class="settings-sidebar">
                    <div class="settings-item active">🖥️ Display</div>
                    <div class="settings-item">🎨 Appearance</div>
                    <div class="settings-item">🔊 Sound</div>
                    <div class="settings-item">📶 Network</div>
                    <div class="settings-item">🔋 Power</div>
                    <div class="settings-item">🔒 Security</div>
                    <div class="settings-item">🌐 Language</div>
                    <div class="settings-item">📦 Packages</div>
                    <div class="settings-item">ℹ️ About</div>
                </div>
                <div class="settings-content">
                    <div class="settings-section">
                        <h3>🖥️ Display Settings</h3>
                        <div class="settings-row">
                            <label>Dark Mode</label>
                            <div class="toggle on" onclick="this.classList.toggle('on')"></div>
                        </div>
                        <div class="settings-row">
                            <label>Blur Effects</label>
                            <div class="toggle on" onclick="this.classList.toggle('on')"></div>
                        </div>
                        <div class="settings-row">
                            <label>Animations</label>
                            <div class="toggle on" onclick="this.classList.toggle('on')"></div>
                        </div>
                        <div class="settings-row">
                            <label>Taskbar Position</label>
                            <span class="value">Bottom</span>
                        </div>
                        <div class="settings-row">
                            <label>Font Size</label>
                            <span class="value">14px</span>
                        </div>
                    </div>
                </div>
            </div>`;
    }

    renderNeofetch(body) {
        body.innerHTML = `
            <div class="app-neofetch">
                <pre class="logo">       ┌──────────────┐
       │   Myanos OS   │
       │  ████████████  │
       │  █▀▀▀▀▀▀▀▀█  │
       │  █ ▀▀▀▀▀▀ █  │
       │    ▀▀▀▀▀▀    │
       └──────────────┘</pre>
                <div class="title">meonnmi@myanos</div>
                <div style="color:#565f89;">──────────────────────────────────</div>
                <div><span class="label">  OS:        </span><span class="info">Myanos Web OS v1.0.0</span></div>
                <div><span class="label">  Shell:     </span><span class="info">myanos-terminal v1.0.0</span></div>
                <div><span class="label">  Desktop:   </span><span class="info">Myanos Desktop Environment</span></div>
                <div><span class="label">  Theme:     </span><span class="info">Tokyo Night Dark</span></div>
                <div><span class="label">  Language:  </span><span class="info">Myanmar Code (127 keywords)</span></div>
                <div><span class="label">  Packages:  </span><span class="info">6 (.myan format)</span></div>
                <div><span class="label">  Engine:    </span><span class="info">Web Runtime (HTML/CSS/JS)</span></div>
                <div style="color:#565f89;">──────────────────────────────────</div>
                <div><span style="color:#7aa2f7;">  ● </span><span style="color:#e0af68;">  ● </span><span style="color:#9ece6a;">  ● </span><span style="color:#f7768e;">  ● </span><span style="color:#bb9af7;">  ● </span><span style="color:#7dcfff;">  ● </span><span style="color:#ff9e64;">  ● </span><span style="color:#73daca;">  ● </span></div>
                <div>&nbsp;</div>
                <div class="highlight">  🇲🇲 Myanos Web OS — Myanmar's First Advanced Web OS</div>
                <div class="info" style="margin-top:8px;">  CTO: Meonnmi-ops</div>
                <div class="info">  GitHub: github.com/meonnmi-ops/Myanos</div>
            </div>`;
    }

    renderMyanmarCode(body) {
        body.innerHTML = `
            <div style="padding:20px;">
                <div style="text-align:center;margin-bottom:20px;">
                    <div style="font-size:40px;margin-bottom:8px;">🇲🇲</div>
                    <h2 style="color:#c0caf5;">Myanmar Code v2.0.1</h2>
                    <p style="color:#565f89;font-size:13px;">မြန်မာဘာသာစကားဖြင့် ရေးသားနိုင်သော ပရိုဂရမ်းမင်းဘာသာစကား</p>
                </div>
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;">
                    <h4 style="color:#7aa2f7;margin-bottom:8px;">Keywords: 127</h4>
                    <div style="font-size:12px;color:#a9b1d6;line-height:2;">
                        <span style="color:#9ece6a;">ပုံနှိပ်</span> (print), <span style="color:#e0af68;">တိုက်</span> (if), <span style="color:#f7768e;">တိုက်ရွေး</span> (else),
                        <span style="color:#bb9af7;">ပျက်</span> (break), <span style="color:#7dcfff;">ဆက်လုပ်</span> (continue), <span style="color:#ff9e64;">ခန့်</span> (return),
                        <span style="color:#73daca;">လုပ်</span> (function), <span style="color:#9ece6a;">ဖြတ်</span> (class), <span style="color:#e0af68;">သို့</span> (while)...
                    </div>
                </div>
                <div style="margin-top:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;">
                    <h4 style="color:#7aa2f7;margin-bottom:8px;">Example</h4>
                    <pre style="font-family:'JetBrains Mono',monospace;font-size:12px;color:#a9b1d6;line-height:1.6;">
<span style="color:#565f89;"># မြန်မာဘာသာစကားနဲ့ ရေးသား</span>
<span style="color:#9ece6a;">ပုံနှိပ်</span> "မင်္ဂလာပါ ကျော်ကြီး"
<span style="color:#e0af68;">တိုက်</span> ကိုယ် <span style="color:#bb9af7;">ချိန်း</span> ၂၀ <span style="color:#f7768e;">သို့မဟုတ်</span>:
    <span style="color:#9ece6a;">ပုံနှိပ်</span> "လောကကြီးပါ"
<span style="color:#ff9e64;">အပြည့်</span></pre>
                </div>
                <div style="margin-top:16px;text-align:center;">
                    <p style="color:#565f89;font-size:12px;">Author: Aung MoeOo (MWD)</p>
                    <p style="color:#565f89;font-size:12px;">Install: <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;">pip install myanmar-code</code></p>
                </div>
            </div>`;
    }

    renderPackageManager(body) {
        body.innerHTML = `
            <div style="padding:20px;height:100%;overflow-y:auto;">
                <h3 style="color:#c0caf5;margin-bottom:16px;">📦 MyanPM — Package Manager</h3>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                    ${this.renderPkgCard('myanmar-code', '2.0.1', '🇲🇲', 'Aung MoeOo (MWD)', true)}
                    ${this.renderPkgCard('myanos-terminal', '1.0.0', '⬛', 'Meonnmi-ops', true)}
                    ${this.renderPkgCard('myanos-display-engine', '1.0.0', '🖥️', 'Meonnmi-ops', true)}
                    ${this.renderPkgCard('myanos-ps2-layer', '1.0.0', '🎮', 'Meonnmi-ops', true)}
                    ${this.renderPkgCard('myanos-android-layer', '1.0.0', '📱', 'Meonnmi-ops', true)}
                    ${this.renderPkgCard('myanos-toolbox', '1.0.0', '🔧', 'Meonnmi-ops', true)}
                </div>
                <div style="margin-top:20px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;">
                    <h4 style="color:#7aa2f7;margin-bottom:8px;">.myan Package Format</h4>
                    <pre style="font-family:monospace;font-size:11px;color:#a9b1d6;line-height:1.5;">
app-1.0.0.myan (ZIP)
├── MANIFEST.json       ← Metadata
├── CHECKSUM.sha256     ← Integrity
└── data/               ← Files</pre>
                </div>
            </div>`;
    }

    renderPkgCard(name, version, icon, author, installed) {
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                <span style="font-size:20px;">${icon}</span>
                <div><div style="font-size:13px;color:#c0caf5;">${name}</div><div style="font-size:11px;color:#565f89;">${version}</div></div>
            </div>
            <div style="font-size:11px;color:#565f89;">${author}</div>
            <div style="margin-top:6px;font-size:11px;color:${installed?'#9ece6a':'#565f89'}">${installed?'✅ Installed':'⬜ Not installed'}</div>
        </div>`;
    }

    renderToolbox(body) {
        body.innerHTML = `
            <div style="padding:20px;">
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
            <div style="font-size:28px;margin-bottom:6px;">${icon}</div>
            <div style="font-size:13px;color:#c0caf5;">${name}</div>
            <div style="font-size:11px;color:#565f89;margin-top:2px;">${desc}</div>
        </div>`;
    }

    renderAndroid(body) {
        body.innerHTML = `
            <div style="padding:20px;">
                <h3 style="color:#c0caf5;margin-bottom:16px;">📱 Android Layer</h3>
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
                        <div style="font-size:40px;">🤖</div>
                        <div><div style="font-size:14px;color:#c0caf5;">WayDroid</div><div style="font-size:12px;color:#9ece6a;">✅ Container Running</div></div>
                    </div>
                    <div style="display:flex;gap:8px;">
                        <button style="flex:1;padding:8px;background:rgba(122,162,247,0.15);border:1px solid rgba(122,162,247,0.3);color:#7aa2f7;border-radius:6px;cursor:pointer;font-size:12px;">Install APK</button>
                        <button style="flex:1;padding:8px;background:rgba(122,162,247,0.15);border:1px solid rgba(122,162,247,0.3);color:#7aa2f7;border-radius:6px;cursor:pointer;font-size:12px;">List Apps</button>
                        <button style="flex:1;padding:8px;background:rgba(122,162,247,0.15);border:1px solid rgba(122,162,247,0.3);color:#7aa2f7;border-radius:6px;cursor:pointer;font-size:12px;">Display</button>
                    </div>
                </div>
                <div style="font-size:12px;color:#565f89;">Connect via: <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;">python3 myanos.py display android</code></div>
            </div>`;
    }

    renderPS2(body) {
        body.innerHTML = `
            <div style="padding:20px;">
                <h3 style="color:#c0caf5;margin-bottom:16px;">🎮 PS2 Emulation Layer</h3>
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;">
                    <div style="text-align:center;margin-bottom:16px;">
                        <div style="font-size:48px;">🎮</div>
                        <p style="color:#a9b1d6;margin-top:8px;">PlayStation 2 Emulator</p>
                        <p style="color:#565f89;font-size:12px;">Powered by Play! / PCSX2</p>
                    </div>
                    <div style="text-align:center;">
                        <p style="color:#565f89;font-size:12px;">Place .iso/.bin files in ~/PS2/ directory</p>
                        <p style="color:#565f89;font-size:12px;margin-top:4px;">Then run: <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;">python3 myanos.py ps2 list</code></p>
                    </div>
                </div>
            </div>`;
    }

    renderMyanAi(body) {
        body.innerHTML = `
            <div style="padding:20px;">
                <h3 style="color:#c0caf5;margin-bottom:16px;">🤖 MyanAi — AI Agent Builder</h3>
                <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:20px;text-align:center;">
                    <div style="font-size:48px;margin-bottom:12px;">🤖</div>
                    <h4 style="color:#bb9af7;margin-bottom:8px;">Low-Code AI Agent Builder</h4>
                    <p style="color:#a9b1d6;font-size:13px;margin-bottom:16px;">Build custom AI agents with minimal code.<br>Define tools, personality, and workflows.</p>
                    <div style="display:inline-block;background:rgba(187,154,247,0.1);border:1px solid rgba(187,154,247,0.2);border-radius:8px;padding:12px 20px;">
                        <code style="color:#bb9af7;font-size:12px;">python3 myanai.py create --name "My Agent"</code>
                    </div>
                </div>
            </div>`;
    }

    renderBrowser(body) {
        body.innerHTML = `
            <div style="display:flex;flex-direction:column;height:100%;">
                <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(30,32,50,0.5);border-bottom:1px solid rgba(255,255,255,0.06);">
                    <button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">←</button>
                    <button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">→</button>
                    <button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">⟳</button>
                    <input type="text" value="https://github.com/meonnmi-ops/Myanos" style="flex:1;padding:6px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:16px;color:#a9b1d6;font-size:12px;outline:none;" />
                </div>
                <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#565f89;">
                    <div style="text-align:center;">
                        <div style="font-size:48px;margin-bottom:12px;">🌐</div>
                        <p>Web Browser Frame</p>
                        <p style="font-size:12px;margin-top:4px;">Embed your favorite browser engine</p>
                    </div>
                </div>
            </div>`;
    }
}

// ── Initialize ──
document.addEventListener('DOMContentLoaded', () => {
    window.myanos = new MyanosDesktop();
});
