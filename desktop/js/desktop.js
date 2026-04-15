/* ═══════════════════════════════════════════════════════
   Myanos Desktop Environment v3.0.0
   Full Real OS Experience — Boot + VFS + Window Manager
   + Context Menu + Code Editor + Notepad + File Manager
   + Notifications + Keyboard Shortcuts + Properties Window
   ═══════════════════════════════════════════════════════ */

// ── Virtual File System (localStorage) ────────────────────────────────
class VFS {
    constructor() {
        this.STORAGE_KEY = 'myanos_vfs';
        this.CLIPBOARD_KEY = 'myanos_clipboard';
        this.WALLPAPER_KEY = 'myanos_wallpaper';
        this.load();
    }
    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            this.files = data ? JSON.parse(data) : {};
        } catch { this.files = {}; }
        // Ensure base folders
        if (!this.files['/']) this.files['/'] = { type:'folder', children:[], created: Date.now() };
        if (!this.files['/Desktop']) this.files['/Desktop'] = { type:'folder', children:[], created: Date.now() };
        if (!this.files['/Documents']) this.files['/Documents'] = { type:'folder', children:[], created: Date.now() };
        if (!this.files['/Downloads']) this.files['/Downloads'] = { type:'folder', children:[], created: Date.now() };
        if (!this.files['/myan-os']) this.files['/myan-os'] = { type:'folder', children:[], created: Date.now() };
        // Add children to root
        if (!this.files['/'].children.includes('/Desktop')) this.files['/'].children.push('/Desktop');
        if (!this.files['/'].children.includes('/Documents')) this.files['/'].children.push('/Documents');
        if (!this.files['/'].children.includes('/Downloads')) this.files['/'].children.push('/Downloads');
        if (!this.files['/'].children.includes('/myan-os')) this.files['/'].children.push('/myan-os');
        this.save();
    }
    save() {
        try { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.files)); } catch(e) { console.warn('VFS save failed:', e); }
    }
    resolve(path) {
        return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }
    parent(path) {
        const p = this.resolve(path);
        if (p === '/') return '/';
        const parts = p.split('/');
        parts.pop();
        return this.resolve(parts.join('/')) || '/';
    }
    basename(path) {
        const parts = this.resolve(path).split('/');
        return parts[parts.length - 1] || '/';
    }
    exists(path) { return !!this.files[this.resolve(path)]; }
    isDir(path) { const f = this.files[this.resolve(path)]; return f && f.type === 'folder'; }
    isFile(path) { const f = this.files[this.resolve(path)]; return f && f.type === 'file'; }
    get(path) { return this.files[this.resolve(path)] || null; }
    createFile(path, content='') {
        const p = this.resolve(path);
        if (this.exists(p)) return false;
        this.files[p] = { type:'file', content, created: Date.now(), modified: Date.now() };
        const parent = this.files[this.parent(p)];
        if (parent && parent.children && !parent.children.includes(p)) parent.children.push(p);
        this.save();
        return true;
    }
    createFolder(path) {
        const p = this.resolve(path);
        if (this.exists(p)) return false;
        this.files[p] = { type:'folder', children:[], created: Date.now(), modified: Date.now() };
        const parent = this.files[this.parent(p)];
        if (parent && parent.children && !parent.children.includes(p)) parent.children.push(p);
        this.save();
        return true;
    }
    read(path) { const f = this.files[this.resolve(path)]; return f ? f.content : null; }
    write(path, content) {
        const p = this.resolve(path);
        if (!this.isFile(p)) {
            // Auto-create if doesn't exist
            this.files[p] = { type:'file', content, created: Date.now(), modified: Date.now() };
            const parent = this.files[this.parent(p)];
            if (parent && parent.children && !parent.children.includes(p)) parent.children.push(p);
        } else {
            this.files[p].content = content;
            this.files[p].modified = Date.now();
        }
        this.save();
        return true;
    }
    delete(path) {
        const p = this.resolve(path);
        if (!this.exists(p)) return false;
        const parent = this.files[this.parent(p)];
        if (parent && parent.children) parent.children = parent.children.filter(c => c !== p);
        if (this.isDir(p)) {
            const f = this.files[p];
            if (f.children) { for (const child of [...f.children]) this.delete(child); }
        }
        delete this.files[p];
        this.save();
        return true;
    }
    list(path) {
        const p = this.resolve(path);
        const f = this.files[p];
        if (f && f.type === 'folder' && f.children) return f.children.map(c => ({ path: c, ...this.files[c] })).filter(Boolean);
        return [];
    }
    copy(src, dst) {
        const s = this.files[this.resolve(src)];
        if (!s) return false;
        this.files[this.resolve(dst)] = JSON.parse(JSON.stringify(s));
        this.files[this.resolve(dst)].created = Date.now();
        this.files[this.resolve(dst)].modified = Date.now();
        const parent = this.files[this.parent(this.resolve(dst))];
        if (parent && parent.children && !parent.children.includes(this.resolve(dst))) parent.children.push(this.resolve(dst));
        this.save();
        return true;
    }
    move(src, dst) {
        if (this.copy(src, dst)) { this.delete(src); return true; }
        return false;
    }
    rename(oldPath, newPath) {
        oldPath = this.resolve(oldPath);
        newPath = this.resolve(newPath);
        if (!this.exists(oldPath) || this.exists(newPath)) return false;
        this.files[newPath] = this.files[oldPath];
        delete this.files[oldPath];
        const parent = this.files[this.parent(oldPath)];
        if (parent && parent.children) parent.children = parent.children.map(c => c === oldPath ? newPath : c);
        const newParent = this.files[this.parent(newPath)];
        if (newParent && newParent.children && !newParent.children.includes(newPath)) newParent.children.push(newPath);
        const f = this.files[newPath];
        if (f && f.type === 'folder' && f.children) {
            f.children = f.children.map(c => {
                const newChild = newPath + '/' + this.basename(c);
                this.files[newChild] = this.files[c];
                delete this.files[c];
                return newChild;
            });
        }
        this.save();
        return true;
    }
    getSize(path) {
        const f = this.files[this.resolve(path)];
        if (!f) return 0;
        if (f.type === 'file') return new Blob([f.content || '']).size;
        let total = 0;
        if (f.children) {
            for (const child of f.children) total += this.getSize(child);
        }
        return total;
    }
    formatSize(bytes) {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / 1048576).toFixed(1) + ' MB';
    }
    setClipboard(action, path) {
        localStorage.setItem(this.CLIPBOARD_KEY, JSON.stringify({ action, path, time: Date.now() }));
    }
    getClipboard() {
        try { return JSON.parse(localStorage.getItem(this.CLIPBOARD_KEY)); } catch { return null; }
    }
    setWallpaper(id) { localStorage.setItem(this.WALLPAPER_KEY, id); }
    getWallpaper() { return localStorage.getItem(this.WALLPAPER_KEY) || 'default'; }
}

// ── Notification System ──────────────────────────────────────────────
class NotificationSystem {
    constructor(containerId) {
        this.container = document.getElementById(containerId) || document.body;
        this.container.id = containerId;
        if (!document.getElementById(containerId)) {
            const el = document.createElement('div');
            el.id = containerId;
            el.className = 'notification-container';
            document.body.appendChild(el);
            this.container = el;
        }
    }
    show(message, type = 'info', duration = 3000) {
        const icons = { info: 'ℹ️', success: '✅', warning: '⚠️', error: '❌' };
        const colors = { info: '#7aa2f7', success: '#9ece6a', warning: '#e0af68', error: '#f7768e' };
        const el = document.createElement('div');
        el.className = 'notification notification-' + type;
        el.innerHTML = `<span class="notif-icon">${icons[type] || 'ℹ️'}</span><span class="notif-text">${message}</span>`;
        el.style.borderLeft = `3px solid ${colors[type] || colors.info}`;
        this.container.appendChild(el);
        setTimeout(() => { el.classList.add('notif-out'); setTimeout(() => el.remove(), 300); }, duration);
        return el;
    }
}

// ── Boot Sequence ────────────────────────────────────────────────────
function runBootSequence(callback) {
    const biosEl = document.getElementById('boot-bios');
    const grubEl = document.getElementById('boot-grub');
    const loadEl = document.getElementById('boot-loading');
    const fillEl = document.getElementById('loading-fill');
    const statusEl = document.getElementById('loading-status');

    const biosText = `Myanos BIOS v3.0.0 — POST (Power On Self Test)

CPU: AMD64 Compatible Processor ......... OK
Memory Test: 8192 MB ...................... OK
Storage: VFS (Virtual File System) ....... OK
Display: Web Runtime ..................... OK
Network: Online .......................... OK
Security: Secure Boot ................... OK

Detecting boot device...
  HDD-0: Myanos OS v3.0.0 ............... Found

Press F2 for Setup, F12 for Boot Menu
Booting from HDD-0...`;

    const biosOutput = biosEl.querySelector('.bios-output');
    let biosIdx = 0;
    const biosTimer = setInterval(() => {
        if (biosIdx < biosText.length) {
            const chunk = biosText.substring(biosIdx, Math.min(biosIdx + 3, biosText.length));
            biosOutput.textContent += chunk;
            biosIdx += 3;
        } else {
            clearInterval(biosTimer);
            setTimeout(() => showGrub(), 400);
        }
    }, 10);

    function showGrub() {
        biosEl.classList.remove('active');
        grubEl.classList.add('active');
        const grubItems = [
            '*Myanos Web OS v3.0.0',
            ' Myanos Web OS (Recovery Mode)',
            ' Myanos Web OS (Safe Mode)',
        ];
        const menu = document.getElementById('grub-menu');
        menu.innerHTML = grubItems.map((item, i) =>
            `<div class="grub-item${i === 0 ? ' selected' : ''}">${item}</div>`
        ).join('');
        // Keyboard support
        let selected = 0;
        const grubKeyHandler = (e) => {
            if (e.key === 'ArrowDown') { selected = Math.min(selected + 1, grubItems.length - 1); updateGrubSelection(); }
            else if (e.key === 'ArrowUp') { selected = Math.max(selected - 1, 0); updateGrubSelection(); }
            else if (e.key === 'Enter') { document.removeEventListener('keydown', grubKeyHandler); showLoading(); }
        };
        const updateGrubSelection = () => {
            menu.querySelectorAll('.grub-item').forEach((el, i) => el.classList.toggle('selected', i === selected));
        };
        document.addEventListener('keydown', grubKeyHandler);
        // Auto-select after 3 seconds
        setTimeout(() => {
            document.removeEventListener('keydown', grubKeyHandler);
            showLoading();
        }, 3000);
        menu.querySelectorAll('.grub-item').forEach((item, i) => {
            item.addEventListener('click', () => {
                document.removeEventListener('keydown', grubKeyHandler);
                menu.querySelectorAll('.grub-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                setTimeout(() => showLoading(), 500);
            });
        });
    }

    function showLoading() {
        grubEl.classList.remove('active');
        loadEl.classList.add('active');
        const steps = [
            [8, 'Loading kernel modules...'],
            [18, 'Initializing hardware drivers...'],
            [30, 'Starting MMR Shell v1.0.0...'],
            [42, 'Mounting virtual filesystem...'],
            [55, 'Loading Myan Package Manager...'],
            [65, 'Starting network services...'],
            [75, 'Loading desktop environment...'],
            [85, 'Initializing window manager...'],
            [92, 'Loading user preferences...'],
            [97, 'Starting notification service...'],
            [100, 'Welcome to Myanos!'],
        ];
        let step = 0;
        const loadTimer = setInterval(() => {
            if (step < steps.length) {
                fillEl.style.width = steps[step][0] + '%';
                statusEl.textContent = steps[step][1];
                step++;
            } else {
                clearInterval(loadTimer);
                setTimeout(() => {
                    document.getElementById('boot-screen').style.display = 'none';
                    document.getElementById('desktop').style.display = 'block';
                    document.getElementById('taskbar').style.display = 'flex';
                    callback();
                }, 400);
            }
        }, 280);
    }
}

// ── Wallpapers ────────────────────────────────────────────────────────
const WALLPAPERS = {
    default: {
        name: 'Tokyo Night',
        css: 'linear-gradient(135deg, #1a1b2e 0%, #24283b 50%, #1f2335 100%)',
        overlay: 'radial-gradient(ellipse at 20% 50%, rgba(122,162,247,0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(187,154,247,0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(158,206,106,0.04) 0%, transparent 50%)'
    },
    ocean: {
        name: 'Ocean Blue',
        css: 'linear-gradient(135deg, #0a1628 0%, #0d2137 30%, #0f3460 60%, #16213e 100%)',
        overlay: 'radial-gradient(ellipse at 30% 60%, rgba(13,71,161,0.2) 0%, transparent 60%), radial-gradient(ellipse at 70% 30%, rgba(30,136,229,0.1) 0%, transparent 50%)'
    },
    forest: {
        name: 'Forest Green',
        css: 'linear-gradient(135deg, #0d1b0e 0%, #1a2f1a 40%, #1b4332 70%, #0d2818 100%)',
        overlay: 'radial-gradient(ellipse at 40% 50%, rgba(27,67,50,0.3) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(40,100,70,0.15) 0%, transparent 50%)'
    },
    sunset: {
        name: 'Sunset Orange',
        css: 'linear-gradient(135deg, #1a0a00 0%, #2d1400 30%, #4a1a00 50%, #3d1200 70%, #1a0800 100%)',
        overlay: 'radial-gradient(ellipse at 50% 30%, rgba(255,111,0,0.15) 0%, transparent 50%), radial-gradient(ellipse at 30% 70%, rgba(255,61,0,0.08) 0%, transparent 50%)'
    },
    purple: {
        name: 'Royal Purple',
        css: 'linear-gradient(135deg, #12051f 0%, #1a0533 30%, #2d0a4e 50%, #1f0838 70%, #0f0319 100%)',
        overlay: 'radial-gradient(ellipse at 50% 40%, rgba(123,31,162,0.2) 0%, transparent 50%), radial-gradient(ellipse at 20% 80%, rgba(74,20,140,0.15) 0%, transparent 50%)'
    },
    dark: {
        name: 'Pure Dark',
        css: 'linear-gradient(135deg, #0a0a0a 0%, #111111 50%, #0a0a0a 100%)',
        overlay: 'radial-gradient(ellipse at 50% 50%, rgba(255,255,255,0.02) 0%, transparent 60%)'
    }
};

// ── Main Desktop Class ───────────────────────────────────────────────
class MyanosDesktop {
    constructor() {
        this.vfs = new VFS();
        this.notif = new NotificationSystem('notification-area');
        this.windows = new Map();
        this.windowIdCounter = 0;
        this.activeWindowId = null;
        this.zIndexCounter = 100;
        this.dragState = null;
        this.resizeState = null;
        this.selectedVfsFile = null;
        this.clipboard = null;
        this._termApiMode = false;
        this._fmCurrentPath = '/Desktop';
        this._termHistory = [];
        this._termHistoryIdx = -1;
        this._settings = JSON.parse(localStorage.getItem('myanos_settings') || '{}');
        this._isLocked = false;

        this.apps = [
            { id:'terminal', name:'Terminal', icon:'⬛', desc:'MMR Shell', category:'system' },
            { id:'files', name:'File Manager', icon:'📁', desc:'Browse files', category:'system' },
            { id:'monitor', name:'System Monitor', icon:'📊', desc:'CPU, RAM, Disk', category:'system' },
            { id:'settings', name:'Settings', icon:'⚙️', desc:'System settings', category:'system' },
            { id:'neofetch', name:'About Myanos', icon:'ℹ️', desc:'System information', category:'system' },
            { id:'myanmar-code', name:'Myanmar Code', icon:'🇲🇲', desc:'Myanmar programming', category:'dev' },
            { id:'pkg-manager', name:'MyanPM', icon:'📦', desc:'Package manager', category:'dev' },
            { id:'code-editor', name:'Code Editor', icon:'💻', desc:'Write code', category:'dev' },
            { id:'notepad', name:'Notepad', icon:'📝', desc:'Text editor', category:'dev' },
            { id:'toolbox', name:'Toolbox', icon:'🔧', desc:'Professional tools', category:'tools' },
            { id:'android', name:'Android', icon:'📱', desc:'APK management', category:'apps' },
            { id:'ps2', name:'PS2 Games', icon:'🎮', desc:'PlayStation 2', category:'apps' },
            { id:'myanai', name:'MyanAi', icon:'🤖', desc:'AI Agent Builder', category:'ai' },
            { id:'browser', name:'Web Browser', icon:'🌐', desc:'Browse the web', category:'apps' },
        ];

        this.init();
    }

    init() {
        this.applyWallpaper(this.vfs.getWallpaper());
        this.renderDesktopIcons();
        this.renderTaskbar();
        this.setupStartMenu();
        this.setupContextMenu();
        this.setupEventListeners();
        this.setupKeyboardShortcuts();
        this.startClock();
        this.applySettings();
        this.notif.show('Myanos v3.0.0 — Desktop ready', 'success', 3000);
    }

    applySettings() {
        const s = this._settings;
        if (s.fontSize) document.body.style.fontSize = s.fontSize + 'px';
        if (s.accentColor) document.documentElement.style.setProperty('--accent', s.accentColor);
        if (s.wallpaper) this.applyWallpaper(s.wallpaper);
    }

    // ── Wallpaper ──
    applyWallpaper(id) {
        const wp = WALLPAPERS[id] || WALLPAPERS.default;
        const desktop = document.getElementById('desktop');
        if (!desktop) return;
        desktop.style.background = wp.css;
        const wallpaperEl = desktop.querySelector('.wallpaper');
        if (wallpaperEl) wallpaperEl.style.background = wp.overlay;
    }

    // ── Desktop Icons (apps + VFS files) ──
    renderDesktopIcons() {
        const container = document.getElementById('desktop-icons');
        if (!container) return;
        container.innerHTML = '';

        // System app icons
        this.apps.forEach(app => {
            const el = document.createElement('div');
            el.className = 'desktop-icon';
            el.dataset.appId = app.id;
            el.innerHTML = `<div class="icon">${app.icon}</div><div class="label">${app.name}</div>`;
            el.addEventListener('dblclick', () => this.openApp(app.id));
            el.addEventListener('click', (e) => {
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
                el.classList.add('selected');
                this.selectedVfsFile = null;
            });
            el.addEventListener('contextmenu', (e) => e.preventDefault());
            container.appendChild(el);
        });

        // VFS files on Desktop
        const desktopFiles = this.vfs.list('/Desktop');
        desktopFiles.forEach(f => {
            const el = document.createElement('div');
            el.className = 'desktop-icon vfs-icon';
            el.dataset.vfsPath = f.path;
            const icon = f.type === 'folder' ? '📁' : this._getFileIcon(f.path);
            const name = this.vfs.basename(f.path);
            el.innerHTML = `<div class="icon">${icon}</div><div class="label" title="${name}">${name}</div>`;
            el.addEventListener('dblclick', () => this._openVfsFile(f.path));
            el.addEventListener('click', (e) => {
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
                el.classList.add('selected');
                this.selectedVfsFile = f.path;
            });
            el.addEventListener('contextmenu', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.selectedVfsFile = f.path;
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
                el.classList.add('selected');
                this._showFileContextMenu(e.clientX, e.clientY);
            });
            container.appendChild(el);
        });
    }

    _getFileIcon(path) {
        const ext = path.split('.').pop().toLowerCase();
        const icons = {
            py:'🐍', js:'📜', html:'🌐', css:'🎨', sh:'⬛',
            txt:'📄', md:'📋', json:'🔧', csv:'📊',
            myan:'📦', png:'🖼️', jpg:'🖼️', gif:'🖼️',
            xml:'📄', yml:'📄', yaml:'📄', toml:'📄', cfg:'📄', ini:'📄',
            sql:'🗄️', db:'🗄️', zip:'🗜️', tar:'🗜️', gz:'🗜️',
            mp3:'🎵', mp4:'🎬', mkv:'🎬', pdf:'📕', doc:'📘',
        };
        return icons[ext] || '📄';
    }

    _openVfsFile(path) {
        if (this.vfs.isDir(path)) {
            this.openApp('files', path);
            return;
        }
        const ext = path.split('.').pop().toLowerCase();
        if (['py','js','html','css','sh','json','md','myan','xml','yml','yaml','toml','cfg','ini','sql','txt'].includes(ext)) {
            this.openApp('code-editor', path);
        } else {
            this.openApp('notepad', path);
        }
    }

    // ── Taskbar ──
    renderTaskbar() {
        const tray = document.getElementById('system-tray');
        if (tray) {
            tray.innerHTML = `
                <span class="tray-icon" title="Volume" onclick="window.myanos.notif.show('Volume: 80%','info',2000)">🔊</span>
                <span class="tray-icon" title="Network" onclick="window.myanos.notif.show('Network: Connected','success',2000)">📶</span>
                <span class="tray-icon" title="Battery" onclick="window.myanos.notif.show('Battery: 100%','success',2000)">🔋</span>
                <span id="clock">--:--</span>
            `;
        }
    }

    startClock() {
        const update = () => {
            const el = document.getElementById('clock');
            if (!el) return;
            const now = new Date();
            const h = String(now.getHours()).padStart(2,'0');
            const m = String(now.getMinutes()).padStart(2,'0');
            const s = String(now.getSeconds()).padStart(2,'0');
            el.textContent = `${h}:${m}`;
            el.title = `${h}:${m}:${s}`;
        };
        update();
        setInterval(update, 1000);
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
        document.addEventListener('click', (e) => { if (!menu.contains(e.target) && e.target !== btn) menu.classList.remove('open'); });
        const searchInput = document.getElementById('start-search-input');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase();
                document.querySelectorAll('.start-app-item').forEach(item => {
                    const name = item.querySelector('.app-name').textContent.toLowerCase();
                    const desc = item.querySelector('.app-desc').textContent.toLowerCase();
                    item.style.display = (name.includes(q) || desc.includes(q)) ? 'flex' : 'none';
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
            el.addEventListener('click', () => { this.openApp(app.id); document.getElementById('start-menu').classList.remove('open'); });
            container.appendChild(el);
        });
    }

    // ── Context Menus ──
    setupContextMenu() {
        const desktop = document.getElementById('desktop');
        if (!desktop) return;
        desktop.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.desktop-icon') || e.target.closest('.myanos-window') || e.target.closest('#taskbar')) return;
            e.preventDefault();
            this.selectedVfsFile = null;
            document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
            this._showDesktopContextMenu(e.clientX, e.clientY);
        });
        document.addEventListener('click', () => {
            document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('open'));
        });
        document.addEventListener('contextmenu', (e) => {
            if (!e.target.closest('.desktop-icon') && !e.target.closest('#desktop') && !e.target.closest('.myanos-window') && !e.target.closest('.context-menu')) {
                document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('open'));
            }
        });
    }

    _showContextMenu(menuId, x, y, bindFn) {
        const menu = document.getElementById(menuId);
        if (!menu) return;
        menu.style.left = Math.min(x, window.innerWidth - 240) + 'px';
        menu.style.top = Math.min(y, window.innerHeight - 400) + 'px';
        document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('open'));
        menu.classList.add('open');
        bindFn(menu);
    }

    _showDesktopContextMenu(x, y) {
        this._showContextMenu('context-menu', x, y, (menu) => {
            menu.querySelectorAll('.ctx-item').forEach(item => {
                item.onclick = () => {
                    const action = item.dataset.action;
                    switch(action) {
                        case 'new-file': this._promptNew('file'); break;
                        case 'new-folder': this._promptNew('folder'); break;
                        case 'paste': this._doPaste(); break;
                        case 'open-terminal-here': this.openApp('terminal'); break;
                        case 'open-notepad': this.openApp('notepad'); break;
                        case 'open-code-editor': this.openApp('code-editor'); break;
                        case 'install-package': this.openApp('terminal'); break;
                        case 'download-file': this._downloadFileDialog(); break;
                        case 'refresh': this.renderDesktopIcons(); this.notif.show('Desktop refreshed', 'info', 1500); break;
                        case 'open-settings': this.openApp('settings'); break;
                        case 'about': this.openApp('neofetch'); break;
                        case 'wallpaper-tokyo': this._changeWallpaper('default'); break;
                        case 'wallpaper-ocean': this._changeWallpaper('ocean'); break;
                        case 'wallpaper-forest': this._changeWallpaper('forest'); break;
                        case 'wallpaper-sunset': this._changeWallpaper('sunset'); break;
                        case 'wallpaper-purple': this._changeWallpaper('purple'); break;
                        case 'wallpaper-dark': this._changeWallpaper('dark'); break;
                    }
                };
            });
        });
    }

    _showFileContextMenu(x, y) {
        this._showContextMenu('file-context-menu', x, y, (menu) => {
            menu.querySelectorAll('.ctx-item').forEach(item => {
                item.onclick = () => {
                    const action = item.dataset.action;
                    const path = this.selectedVfsFile;
                    if (!path) return;
                    switch(action) {
                        case 'open-file': this._openVfsFile(path); break;
                        case 'edit-file': this.openApp('code-editor', path); break;
                        case 'copy-file': this.clipboard = {action:'copy', path}; this.notif.show(`Copied: ${this.vfs.basename(path)}`, 'success', 1500); break;
                        case 'cut-file': this.clipboard = {action:'cut', path}; this.notif.show(`Cut: ${this.vfs.basename(path)}`, 'info', 1500); break;
                        case 'rename-file': this._promptRename(path); break;
                        case 'delete-file': this._confirmDelete(path); break;
                        case 'file-properties': this._showPropertiesWindow(path); break;
                    }
                };
            });
        });
    }

    _changeWallpaper(id) {
        this.vfs.setWallpaper(id);
        this.applyWallpaper(id);
        const name = (WALLPAPERS[id] || WALLPAPERS.default).name;
        this.notif.show(`Wallpaper: ${name}`, 'success', 2000);
    }

    // ── Confirmation Dialog ──
    _showConfirmDialog(title, message, onConfirm) {
        const dialog = document.getElementById('confirm-dialog');
        const titleEl = document.getElementById('confirm-title');
        const msgEl = document.getElementById('confirm-message');
        if (!dialog) return;
        titleEl.textContent = title;
        msgEl.textContent = message;
        dialog.classList.add('open');
        const okBtn = document.getElementById('confirm-ok');
        const cancelBtn = document.getElementById('confirm-cancel');
        const close = (confirmed) => {
            dialog.classList.remove('open');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            if (confirmed) onConfirm();
        };
        okBtn.onclick = () => close(true);
        cancelBtn.onclick = () => close(false);
    }

    _confirmDelete(path) {
        const name = this.vfs.basename(path);
        const isDir = this.vfs.isDir(path);
        this._showConfirmDialog(
            `Delete ${isDir ? 'Folder' : 'File'}`,
            `Are you sure you want to delete "${name}"?${isDir ? ' All contents will be permanently removed.' : ''} This cannot be undone.`,
            () => {
                this.vfs.delete(path);
                this.renderDesktopIcons();
                this.notif.show(`Deleted: ${name}`, 'warning', 2000);
            }
        );
    }

    // ── Input Dialog ──
    _showInputDialog(title, placeholder, defaultValue, callback) {
        const dialog = document.getElementById('input-dialog');
        const titleEl = document.getElementById('input-dialog-title');
        const input = document.getElementById('input-dialog-input');
        if (!dialog) return;
        titleEl.textContent = title;
        input.value = defaultValue || '';
        input.placeholder = placeholder;
        dialog.classList.add('open');
        setTimeout(() => { input.focus(); input.select(); }, 100);
        const okBtn = document.getElementById('input-dialog-ok');
        const cancelBtn = document.getElementById('input-dialog-cancel');
        const close = (val) => {
            dialog.classList.remove('open');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            input.onkeydown = null;
            if (val !== null) callback(val);
        };
        okBtn.onclick = () => close(input.value.trim());
        cancelBtn.onclick = () => close(null);
        input.onkeydown = (e) => {
            if (e.key === 'Enter') close(input.value.trim());
            if (e.key === 'Escape') close(null);
        };
    }

    _promptNew(type) {
        const title = type === 'file' ? '📄 New File' : '📁 New Folder';
        const placeholder = type === 'file' ? 'filename.txt' : 'Folder name';
        this._showInputDialog(title, placeholder, '', (name) => {
            if (!name) return;
            const path = '/Desktop/' + name;
            if (this.vfs.exists(path)) {
                this.notif.show(`"${name}" already exists!`, 'error', 2000);
                return;
            }
            if (type === 'file') this.vfs.createFile(path, '');
            else this.vfs.createFolder(path);
            this.renderDesktopIcons();
            this.notif.show(`Created: ${name}`, 'success', 1500);
        });
    }

    _promptRename(oldPath) {
        const oldName = this.vfs.basename(oldPath);
        this._showInputDialog('✏️ Rename', oldName, oldName, (newName) => {
            if (!newName || newName === oldName) return;
            const newPath = this.vfs.parent(oldPath) + '/' + newName;
            if (this.vfs.exists(newPath)) {
                this.notif.show(`"${newName}" already exists!`, 'error', 2000);
                return;
            }
            this.vfs.rename(oldPath, newPath);
            this.renderDesktopIcons();
            this.notif.show(`Renamed to: ${newName}`, 'success', 1500);
        });
    }

    _doPaste() {
        const clip = this.clipboard;
        if (!clip) { this.notif.show('Nothing to paste', 'info', 1500); return; }
        const name = this.vfs.basename(clip.path);
        const ext = name.includes('.') ? '.' + name.split('.').pop() : '';
        const baseName = ext ? name.replace(ext, '') : name;
        let newPath = '/Desktop/' + name;
        let counter = 1;
        while (this.vfs.exists(newPath)) {
            newPath = `/Desktop/${baseName} (${counter})${ext}`;
            counter++;
        }
        if (clip.action === 'copy') {
            this.vfs.copy(clip.path, newPath);
            this.notif.show(`Pasted: ${name}`, 'success', 1500);
        } else if (clip.action === 'cut') {
            this.vfs.move(clip.path, newPath);
            this.clipboard = null;
            this.notif.show(`Moved: ${name}`, 'success', 1500);
        }
        this.renderDesktopIcons();
    }

    _downloadFileDialog() {
        this._showInputDialog('📥 Download File', 'filename.txt', '', (name) => {
            if (!name) return;
            const path = '/Downloads/' + name;
            this.vfs.createFile(path, '');
            this.notif.show(`Created in Downloads: ${name}`, 'success', 2000);
        });
    }

    // ── Properties Window ──
    _showPropertiesWindow(path) {
        const f = this.vfs.get(path);
        if (!f) return;
        const name = this.vfs.basename(path);
        const type = f.type === 'folder' ? 'Folder' : 'File';
        const created = new Date(f.created).toLocaleString();
        const modified = new Date(f.modified).toLocaleString();
        const size = f.type === 'file' ? this.vfs.formatSize(new Blob([f.content || '']).size) : this.vfs.formatSize(this.vfs.getSize(path));
        const ext = f.type === 'file' ? (name.includes('.') ? name.split('.').pop().toUpperCase() : 'Unknown') : '-';
        const contentPreview = f.type === 'file' && f.content ? (f.content.substring(0, 200) + (f.content.length > 200 ? '...' : '')) : '';

        // Open as a window
        const propsApp = { id: 'props-' + Date.now(), name: `Properties - ${name}`, icon: 'ℹ️', desc: 'File properties', category: 'system' };
        // Reuse existing or create
        const id = ++this.windowIdCounter;
        const winEl = this.createWindowElement(id, propsApp);
        document.getElementById('desktop').appendChild(winEl);
        const offset = (id % 8) * 30;
        this.windows.set(id, { id, app: propsApp, arg: null, element: winEl, minimized: false, maximized: false, x: 200 + offset, y: 100 + offset, width: 420, height: 450 });
        this.positionWindow(id);
        this.focusWindow(id);
        const body = document.getElementById(`win-body-${id}`);
        body.innerHTML = `
            <div style="padding:20px;font-size:13px;">
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="font-size:48px;">${f.type === 'folder' ? '📁' : this._getFileIcon(path)}</div>
                    <div>
                        <div style="font-size:16px;color:#c0caf5;font-weight:600;">${this._escapeHtml(name)}</div>
                        <div style="font-size:12px;color:#565f89;margin-top:4px;">${type}</div>
                    </div>
                </div>
                <table style="width:100%;border-collapse:collapse;">
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                        <td style="padding:10px 0;color:#565f89;width:120px;">Type:</td>
                        <td style="padding:10px 0;color:#a9b1d6;">${type}${ext !== '-' ? ' (.' + ext.toLowerCase() + ')' : ''}</td>
                    </tr>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                        <td style="padding:10px 0;color:#565f89;">Path:</td>
                        <td style="padding:10px 0;color:#a9b1d6;font-family:'JetBrains Mono',monospace;font-size:12px;">${path}</td>
                    </tr>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                        <td style="padding:10px 0;color:#565f89;">Size:</td>
                        <td style="padding:10px 0;color:#a9b1d6;">${size}</td>
                    </tr>
                    <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                        <td style="padding:10px 0;color:#565f89;">Created:</td>
                        <td style="padding:10px 0;color:#a9b1d6;">${created}</td>
                    </tr>
                    <tr>
                        <td style="padding:10px 0;color:#565f89;">Modified:</td>
                        <td style="padding:10px 0;color:#a9b1d6;">${modified}</td>
                    </tr>
                </table>
                ${contentPreview ? `<div style="margin-top:16px;padding-top:12px;border-top:1px solid rgba(255,255,255,0.06);"><div style="color:#565f89;margin-bottom:6px;">Content Preview:</div><pre style="background:rgba(255,255,255,0.03);padding:10px;border-radius:6px;font-family:'JetBrains Mono',monospace;font-size:11px;color:#565f89;white-space:pre-wrap;max-height:120px;overflow-y:auto;">${this._escapeHtml(contentPreview)}</pre></div>` : ''}
            </div>`;
        this.updateTaskbarApps();
    }

    // ── Window Management ──
    openApp(appId, arg) {
        const app = this.apps.find(a => a.id === appId);
        if (!app) return;
        // Allow multiple instances for code-editor and notepad
        const singleInstance = !['code-editor', 'notepad'].includes(appId);
        if (singleInstance) {
            for (const [id, win] of this.windows) {
                if (win.app.id === appId) {
                    if (win.minimized) this.restoreWindow(id);
                    this.focusWindow(id);
                    return;
                }
            }
        }
        const id = ++this.windowIdCounter;
        const winEl = this.createWindowElement(id, app);
        document.getElementById('desktop').appendChild(winEl);
        const offset = (id % 8) * 30;
        this.windows.set(id, { id, app, arg, element:winEl, minimized:false, maximized:false, x:120+offset, y:60+offset, width:750, height:500 });
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
                <div class="window-title"><span class="win-icon">${app.icon}</span><span class="win-text">${app.name}</span></div>
                <div class="window-controls">
                    <div class="win-ctrl minimize" data-action="minimize" data-win-id="${id}">−</div>
                    <div class="win-ctrl maximize" data-action="maximize" data-win-id="${id}">□</div>
                    <div class="win-ctrl close" data-action="close" data-win-id="${id}">✕</div>
                </div>
            </div>
            <div class="window-body" id="win-body-${id}"></div>
            <div class="window-resize" data-win-id="${id}"></div>`;
        return el;
    }

    positionWindow(id) {
        const win = this.windows.get(id);
        if (!win) return;
        const el = win.element;
        el.style.left = win.x+'px'; el.style.top = win.y+'px';
        el.style.width = win.width+'px'; el.style.height = win.height+'px';
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

    minimizeWindow(id) { const w=this.windows.get(id); if(!w)return; w.element.style.display='none'; w.minimized=true; if(this.activeWindowId===id)this.activeWindowId=null; this.updateTaskbarApps(); }
    restoreWindow(id) { const w=this.windows.get(id); if(!w)return; w.element.style.display='flex'; w.minimized=false; this.focusWindow(id); this.updateTaskbarApps(); }
    maximizeWindow(id) { const w=this.windows.get(id); if(!w)return; w.maximized=!w.maximized; w.element.classList.toggle('maximized',w.maximized); }
    closeWindow(id) { const w=this.windows.get(id); if(!w)return; w.element.remove(); this.windows.delete(id); if(this.activeWindowId===id)this.activeWindowId=null; this.updateTaskbarApps(); }

    // ── Drag & Resize ──
    setupEventListeners() {
        document.addEventListener('click', (e) => {
            const ctrl = e.target.closest('.win-ctrl');
            if (ctrl) { const id=parseInt(ctrl.dataset.winId); const a=ctrl.dataset.action; if(a==='minimize')this.minimizeWindow(id); else if(a==='maximize')this.maximizeWindow(id); else if(a==='close')this.closeWindow(id); return; }
        });
        document.addEventListener('mousedown', (e) => {
            const titlebar = e.target.closest('.window-titlebar');
            if (!titlebar || e.target.closest('.win-ctrl')) return;
            const id=parseInt(titlebar.dataset.winId); const win=this.windows.get(id);
            if (!win||win.maximized) return; this.focusWindow(id);
            this.dragState = { id, startX:e.clientX-win.x, startY:e.clientY-win.y }; e.preventDefault();
        });
        document.addEventListener('mousedown', (e) => {
            const handle=e.target.closest('.window-resize');
            if(!handle)return; const id=parseInt(handle.dataset.winId); const win=this.windows.get(id);
            if(!win||win.maximized)return; this.focusWindow(id);
            this.resizeState = { id, startX:e.clientX, startY:e.clientY, startW:win.element.offsetWidth, startH:win.element.offsetHeight }; e.preventDefault();
        });
        document.addEventListener('mousemove', (e) => {
            if(this.dragState){const w=this.windows.get(this.dragState.id);if(!w)return;w.x=e.clientX-this.dragState.startX;w.y=Math.max(0,e.clientY-this.dragState.startY);w.element.style.left=w.x+'px';w.element.style.top=w.y+'px';}
            if(this.resizeState){const w=this.windows.get(this.resizeState.id);if(!w)return;w.element.style.width=Math.max(320,this.resizeState.startW+e.clientX-this.resizeState.startX)+'px';w.element.style.height=Math.max(200,this.resizeState.startH+e.clientY-this.resizeState.startY)+'px';}
        });
        document.addEventListener('mouseup', () => { this.dragState=null; this.resizeState=null; });
        document.addEventListener('mousedown', (e) => { const winEl=e.target.closest('.myanos-window'); if(winEl){const id=parseInt(winEl.id.replace('window-','')); this.focusWindow(id);} });
    }

    // ── Keyboard Shortcuts ──
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // F2 to rename selected file
            if (e.key === 'F2' && this.selectedVfsFile) {
                e.preventDefault();
                this._promptRename(this.selectedVfsFile);
            }
            // Delete selected file
            if (e.key === 'Delete' && this.selectedVfsFile && !e.target.closest('input, textarea')) {
                e.preventDefault();
                this._confirmDelete(this.selectedVfsFile);
            }
            // Ctrl+C - copy
            if (e.ctrlKey && e.key === 'c' && this.selectedVfsFile && !e.target.closest('input, textarea')) {
                e.preventDefault();
                this.clipboard = { action: 'copy', path: this.selectedVfsFile };
                this.notif.show(`Copied: ${this.vfs.basename(this.selectedVfsFile)}`, 'success', 1500);
            }
            // Ctrl+X - cut
            if (e.ctrlKey && e.key === 'x' && this.selectedVfsFile && !e.target.closest('input, textarea')) {
                e.preventDefault();
                this.clipboard = { action: 'cut', path: this.selectedVfsFile };
                this.notif.show(`Cut: ${this.vfs.basename(this.selectedVfsFile)}`, 'info', 1500);
            }
            // Ctrl+V - paste
            if (e.ctrlKey && e.key === 'v' && this.clipboard && !e.target.closest('input, textarea')) {
                e.preventDefault();
                this._doPaste();
            }
            // Ctrl+N - new file on desktop
            if (e.ctrlKey && e.key === 'n' && !e.target.closest('input, textarea')) {
                e.preventDefault();
                this._promptNew('file');
            }
            // Ctrl+Shift+N - new folder
            if (e.ctrlKey && e.shiftKey && e.key === 'N' && !e.target.closest('input, textarea')) {
                e.preventDefault();
                this._promptNew('folder');
            }
            // Escape - deselect
            if (e.key === 'Escape') {
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
                this.selectedVfsFile = null;
                document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('open'));
                document.getElementById('start-menu')?.classList.remove('open');
            }
            // F5 - refresh desktop
            if (e.key === 'F5' && !e.target.closest('input, textarea')) {
                e.preventDefault();
                this.renderDesktopIcons();
                this.notif.show('Desktop refreshed', 'info', 1500);
            }
            // ESC - unlock
            if (e.key === 'Escape' && this._isLocked) {
                this.unlockScreen();
            }
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
            'files': () => this.renderFileManager(body, id, win.arg),
            'monitor': () => this.renderMonitor(body),
            'settings': () => this.renderSettings(body),
            'neofetch': () => this.renderNeofetch(body),
            'myanmar-code': () => this.renderMyanmarCode(body, id),
            'pkg-manager': () => this.renderPackageManager(body, id),
            'code-editor': () => this.renderCodeEditor(body, id, win.arg),
            'notepad': () => this.renderNotepad(body, id, win.arg),
            'toolbox': () => this.renderToolbox(body),
            'android': () => this.renderAndroid(body),
            'ps2': () => this.renderPS2(body),
            'myanai': () => this.renderMyanAi(body),
            'browser': () => this.renderBrowser(body),
        };
        const r = renderers[win.app.id];
        if (r) r();
    }

    // ══════════════════════════════════════════════════════════
    //  APP: Terminal (Real API)
    // ══════════════════════════════════════════════════════════
    async renderTerminal(body, winId) {
        const termId = `term-${winId}`;
        body.innerHTML = `<div class="app-terminal" id="${termId}"></div>`;
        const term = document.getElementById(termId);
        term.innerHTML = `<div class="term-line" style="color:#7aa2f7;">Connecting to MMR Shell...</div>`;
        let apiWorking = false;
        try {
            const res = await fetch('/api/exec', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({cmd:'echo MMRSHELL_OK'}) });
            const data = await res.json();
            if (data.output && data.output.includes('MMRSHELL_OK')) apiWorking = true;
        } catch(e) { apiWorking = false; }
        if (apiWorking) {
            term.innerHTML = `<div class="term-line" style="color:#9ece6a;">✓ MMR Shell v1.0.0 connected</div><div class="term-line" style="color:#565f89;">Type 'help' for commands | 'myan help' for package manager</div><div class="term-line">&nbsp;</div>`;
            this._termApiMode = true;
        } else {
            term.innerHTML = `<div class="term-line" style="color:#f7768e;">⚠ MMR Shell API not available</div><div class="term-line" style="color:#565f89;">Run: python3 server.py (in myanos-build directory)</div><div class="term-line" style="color:#565f89;">Using offline mode (local VFS commands)</div><div class="term-line">&nbsp;</div>`;
            this._termApiMode = false;
        }
        this._addTermInput(term, winId);
    }

    _addTermInput(term, winId) {
        const line = document.createElement('div');
        line.className = 'term-input-line';
        line.innerHTML = `<span class="term-prompt">meonnmi@myanos</span><span>:</span><span class="term-path">~</span><span> $ </span><input class="term-input" autofocus>`;
        term.appendChild(line);
        const input = line.querySelector('.term-input');
        input.focus();
        term.scrollTop = term.scrollHeight;
        input.addEventListener('keydown', async (e) => {
            if (e.key==='Enter') {
                const cmd=input.value.trim();
                input.disabled=true;
                if(cmd) {
                    this._termHistory.push(cmd);
                    this._termHistoryIdx = this._termHistory.length;
                    await this._execTermCmd(term,cmd,winId);
                } else { this._addTermInput(term,winId); }
            }
            if (e.key==='Tab') { e.preventDefault(); this._tabComplete(input); }
            if (e.key==='ArrowUp') {
                e.preventDefault();
                if (this._termHistoryIdx > 0) {
                    this._termHistoryIdx--;
                    input.value = this._termHistory[this._termHistoryIdx];
                }
            }
            if (e.key==='ArrowDown') {
                e.preventDefault();
                if (this._termHistoryIdx < this._termHistory.length - 1) {
                    this._termHistoryIdx++;
                    input.value = this._termHistory[this._termHistoryIdx];
                } else {
                    this._termHistoryIdx = this._termHistory.length;
                    input.value = '';
                }
            }
            if (e.key==='l' && e.ctrlKey) { e.preventDefault(); term.innerHTML=''; this._addTermInput(term,winId); }
        });
        term.addEventListener('click', () => input.focus());
    }

    async _execTermCmd(term, cmd, winId) {
        const out = document.createElement('div');
        out.className = 'term-line'; out.style.whiteSpace='pre-wrap'; out.style.fontFamily='"JetBrains Mono","Fira Code",monospace'; out.style.fontSize='13px'; out.style.lineHeight='1.4';

        // Local commands
        const localCmds = {
            'exit': () => { this.closeWindow(winId); return '__EXIT__'; },
            'clear': () => { term.innerHTML=''; return '__CLEAR__'; },
            'help': () => 'Available commands:\n  help, clear, exit, echo, date, whoami, hostname, uname,\n  ls, cd, pwd, mkdir, rm, cp, mv, cat, head, tail,\n  grep, find, touch, chmod, neofetch, df, free, ps,\n  myan (package manager), python3, pip, git, wget, curl',
            'date': () => new Date().toString(),
            'whoami': () => 'meonnmi',
            'hostname': () => 'myanos',
            'uname': () => 'Myanos Web OS v3.0.0 AMD64',
            'pwd': () => '/home/meonnmi',
            'neofetch': () => this._neofetchText(),
        };

        // Simple local file commands when API is off
        if (!this._termApiMode) {
            const vfsCmds = {
                'ls': () => {
                    const files = this.vfs.list('/Desktop');
                    if (files.length === 0) return '(empty)';
                    return files.map(f => {
                        const name = this.vfs.basename(f.path);
                        return f.type === 'folder' ? `\x1b[0;34m${name}/\x1b[0m` : name;
                    }).join('  ');
                },
                'mkdir': () => {
                    const arg = cmd.split(/\s+/)[1];
                    if (!arg) return 'Usage: mkdir <name>';
                    const path = '/Desktop/' + arg;
                    if (this.vfs.exists(path)) return `mkdir: ${arg}: already exists`;
                    this.vfs.createFolder(path);
                    this.renderDesktopIcons();
                    return '';
                },
                'touch': () => {
                    const arg = cmd.split(/\s+/)[1];
                    if (!arg) return 'Usage: touch <name>';
                    const path = '/Desktop/' + arg;
                    if (this.vfs.exists(path)) return '';
                    this.vfs.createFile(path, '');
                    this.renderDesktopIcons();
                    return '';
                },
                'rm': () => {
                    const arg = cmd.split(/\s+/)[1];
                    if (!arg) return 'Usage: rm <name>';
                    const path = '/Desktop/' + arg;
                    if (!this.vfs.exists(path)) return `rm: ${arg}: No such file`;
                    this.vfs.delete(path);
                    this.renderDesktopIcons();
                    return '';
                },
                'cat': () => {
                    const arg = cmd.split(/\s+/)[1];
                    if (!arg) return 'Usage: cat <name>';
                    const path = '/Desktop/' + arg;
                    const content = this.vfs.read(path);
                    if (content === null) return `cat: ${arg}: No such file`;
                    return content;
                },
                'echo': () => cmd.substring(5),
            'history': () => this._termHistory.length === 0 ? '(empty)' : this._termHistory.map((h,i) => `  ${String(i+1).padStart(4)}  ${h}`).join('\n'),
            };

            const parts = cmd.split(/\s+/);
            const base = parts[0];
            if (base in localCmds) {
                const r = localCmds[base]();
                if (r === '__CLEAR__') return;
                if (r === '__EXIT__') return;
                if (r) { out.innerHTML = this._renderAnsi(r); term.appendChild(out); }
                this._addTermInput(term, winId);
                return;
            }
            if (base in vfsCmds) {
                const r = vfsCmds[base]();
                if (r) { out.innerHTML = this._renderAnsi(r); term.appendChild(out); }
                this._addTermInput(term, winId);
                return;
            }
            out.textContent = `[offline] ${base}: command not available offline. Start server.py for full access.`;
            out.style.color = '#f7768e';
            if (out.textContent) term.appendChild(out);
            this._addTermInput(term, winId);
            return;
        }

        // API mode
        if (cmd in localCmds) {
            const r = localCmds[cmd]();
            if (r === '__CLEAR__') return;
            if (r === '__EXIT__') return;
            if (r) { out.innerHTML = this._renderAnsi(r); term.appendChild(out); }
            this._addTermInput(term, winId);
            return;
        }

        try {
            const res = await fetch('/api/exec', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({cmd,session:winId}) });
            const data = await res.json();
            if (data.output==='__CLEAR__') { term.innerHTML=''; }
            else if (data.output==='exit') { this.closeWindow(winId); return; }
            else if (data.output) { out.innerHTML=this._renderAnsi(data.output); }
        } catch(e) { out.textContent=`[ERR] API error: ${e.message}`; out.style.color='#f7768e'; }
        if (out.textContent||out.innerHTML) term.appendChild(out);
        this._addTermInput(term, winId);
    }

    _neofetchText() {
        return `       ┌──────────────┐
       │   Myanos OS   │
       │  ████████████  │
       │  █▀▀▀▀▀▀▀▀█  │
       │  █ ▀▀▀▀▀▀ █  │
       │    ▀▀▀▀▀▀    │
       └──────────────┘
  OS:        Myanos Web OS v3.0.0
  Shell:     MMR Shell v1.0.0
  Desktop:   Myanos Desktop Environment
  Theme:     Tokyo Night Dark
  Packages:  .myan (MyanPM)
  Language:  Myanmar Code (127 keywords)
  🇲🇲 Myanos Web OS — Myanmar's First Advanced Web OS`;
    }

    _renderAnsi(text) {
        const colors = {'\\x1b[0;31m':'#f7768e','\\x1b[0;32m':'#9ece6a','\\x1b[1;33m':'#e0af68','\\x1b[0;34m':'#7aa2f7','\\x1b[0;35m':'#bb9af7','\\x1b[0;36m':'#7dcfff','\\x1b[1;37m':'#c0caf5','\\x1b[2m':'#565f89','\\x1b[1m':'','\\x1b[0m':'#a9b1d6'};
        let html=text;
        for(const[ansi,color]of Object.entries(colors)) html=html.split(ansi).join(`</span><span style="color:${color}">`);
        return `<span style="color:#a9b1d6">${html}</span>`;
    }

    _tabComplete(input) {
        const builtins=['help','clear','cd','pwd','ls','cat','mkdir','rm','cp','mv','echo','head','tail','grep','find','which','whoami','hostname','uname','date','neofetch','df','du','free','ps','kill','chmod','env','export','alias','history','wget','curl','python3','pip','git','npm','node','mmr','myan','mmc','exit','touch'];
        const val=input.value.trim(); if(!val)return;
        const parts=val.split(/\s+/);
        if(parts.length===1){const m=builtins.filter(c=>c.startsWith(parts[0]));if(m.length===1)input.value=m[0]+' ';}
    }

    // ══════════════════════════════════════════════════════════
    //  APP: Code Editor (Full Featured)
    // ══════════════════════════════════════════════════════════
    renderCodeEditor(body, winId, filePath) {
        let content = '';
        let filename = filePath ? this.vfs.basename(filePath) : 'untitled.py';
        let currentPath = filePath || null;
        let isModified = false;

        if (filePath && this.vfs.isFile(filePath)) content = this.vfs.read(filePath) || '';

        const render = () => {
            body.innerHTML = `
            <div class="code-editor">
                <div class="code-editor-toolbar">
                    <button class="ce-btn" id="ce-new-${winId}">📄 New</button>
                    <button class="ce-btn" id="ce-open-${winId}">📂 Open</button>
                    <button class="ce-btn" id="ce-save-${winId}">💾 Save</button>
                    <button class="ce-btn" id="ce-saveas-${winId}">💾 Save As</button>
                    <div class="ce-filename" id="ce-filename-${winId}" title="${currentPath || 'New file'}">${isModified ? '● ' : ''}${filename}</div>
                    <button class="ce-btn ce-run" id="ce-run-${winId}">▶ Run</button>
                </div>
                <div class="code-editor-statusbar">
                    <span id="ce-pos-${winId}">Ln 1, Col 1</span>
                    <span id="ce-encoding-${winId}">UTF-8</span>
                    <span id="ce-lang-${winId}">${this._getLanguage(filename)}</span>
                </div>
                <div class="code-editor-body">
                    <div class="code-line-numbers" id="ce-lines-${winId}">1</div>
                    <textarea class="code-textarea" id="ce-code-${winId}" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off">${this._escapeHtml(content)}</textarea>
                </div>
            </div>`;

            const textarea = document.getElementById(`ce-code-${winId}`);
            const lineNums = document.getElementById(`ce-lines-${winId}`);
            const posEl = document.getElementById(`ce-pos-${winId}`);

            const updateLines = () => {
                const lines = textarea.value.split('\n').length;
                lineNums.innerHTML = Array.from({length:lines},(_,i)=>i+1).join('\n');
            };
            const updatePos = () => {
                const val = textarea.value.substring(0, textarea.selectionStart);
                const lines = val.split('\n');
                posEl.textContent = `Ln ${lines.length}, Col ${lines[lines.length-1].length + 1}`;
            };
            const markModified = () => {
                isModified = true;
                const fnEl = document.getElementById(`ce-filename-${winId}`);
                if (fnEl) fnEl.textContent = '● ' + filename;
            };

            textarea.addEventListener('input', () => { updateLines(); updatePos(); markModified(); });
            textarea.addEventListener('scroll', () => { lineNums.scrollTop = textarea.scrollTop; });
            textarea.addEventListener('click', updatePos);
            textarea.addEventListener('keyup', updatePos);
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const s = textarea.selectionStart;
                    textarea.value = textarea.value.substring(0,s) + '    ' + textarea.value.substring(textarea.selectionEnd);
                    textarea.selectionStart = textarea.selectionEnd = s + 4;
                    updateLines(); markModified();
                }
                // Auto-indent
                if (e.key === 'Enter') {
                    const before = textarea.value.substring(0, textarea.selectionStart);
                    const lastLine = before.split('\n').pop();
                    const indent = lastLine.match(/^\s*/)[0];
                    if (indent) {
                        e.preventDefault();
                        const s = textarea.selectionStart;
                        textarea.value = textarea.value.substring(0,s) + '\n' + indent + textarea.value.substring(textarea.selectionEnd);
                        textarea.selectionStart = textarea.selectionEnd = s + 1 + indent.length;
                        updateLines(); markModified();
                    }
                }
                // Ctrl+S to save
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    saveFile();
                }
            });
            updateLines();
            updatePos();

            const saveFile = () => {
                if (currentPath && this.vfs.exists(currentPath)) {
                    this.vfs.write(currentPath, textarea.value);
                    isModified = false;
                    const fnEl = document.getElementById(`ce-filename-${winId}`);
                    if (fnEl) fnEl.textContent = filename;
                    this.renderDesktopIcons();
                    this.notif.show(`Saved: ${filename}`, 'success', 1500);
                } else {
                    saveAsFile();
                }
            };

            const saveAsFile = () => {
                this._showInputDialog('💾 Save As', filename, filename, (newName) => {
                    if (!newName) return;
                    const path = '/Desktop/' + newName;
                    this.vfs.write(path, textarea.value);
                    currentPath = path;
                    filename = newName;
                    isModified = false;
                    const fnEl = document.getElementById(`ce-filename-${winId}`);
                    if (fnEl) { fnEl.textContent = filename; fnEl.title = path; }
                    document.getElementById(`ce-lang-${winId}`).textContent = this._getLanguage(filename);
                    this.renderDesktopIcons();
                    this.notif.show(`Saved: ${filename}`, 'success', 1500);
                });
            };

            const openFile = () => {
                // Show file list dialog
                const files = this.vfs.list('/Desktop');
                const textFiles = files.filter(f => f.type === 'file');
                const allTextContent = textFiles.map(f => {
                    const name = this.vfs.basename(f.path);
                    const icon = this._getFileIcon(f.path);
                    const size = this.vfs.formatSize(new Blob([f.content || '']).size);
                    return `<div class="open-file-item" data-path="${f.path}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;cursor:pointer;transition:background 0.12s;">
                        <span style="font-size:20px;">${icon}</span>
                        <div style="flex:1;"><div style="font-size:13px;color:#c0caf5;">${name}</div><div style="font-size:11px;color:#565f89;">${size}</div></div>
                    </div>`;
                }).join('');

                if (textFiles.length === 0) {
                    this.notif.show('No files found on Desktop', 'info', 2000);
                    return;
                }

                // Open as a dialog-like window
                const dlgApp = { id:'dlg-'+Date.now(), name:'Open File', icon:'📂', desc:'Select a file', category:'system' };
                const dlgId = ++this.windowIdCounter;
                const dlgEl = this.createWindowElement(dlgId, dlgApp);
                document.getElementById('desktop').appendChild(dlgEl);
                this.windows.set(dlgId, { id:dlgId, app:dlgApp, arg:null, element:dlgEl, minimized:false, maximized:false, x:250, y:120, width:400, height:400 });
                this.positionWindow(dlgId);
                this.focusWindow(dlgId);
                this.updateTaskbarApps();
                const dlgBody = document.getElementById(`win-body-${dlgId}`);
                dlgBody.innerHTML = `<div style="padding:12px;height:100%;overflow-y:auto;" id="open-file-list-${dlgId}">${allTextContent}</div>`;

                dlgBody.querySelectorAll('.open-file-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const p = item.dataset.path;
                        const fileContent = this.vfs.read(p) || '';
                        currentPath = p;
                        filename = this.vfs.basename(p);
                        content = fileContent;
                        isModified = false;
                        textarea.value = fileContent;
                        updateLines(); updatePos();
                        const fnEl = document.getElementById(`ce-filename-${winId}`);
                        if (fnEl) { fnEl.textContent = filename; fnEl.title = p; }
                        document.getElementById(`ce-lang-${winId}`).textContent = this._getLanguage(filename);
                        this.closeWindow(dlgId);
                        this.notif.show(`Opened: ${filename}`, 'info', 1500);
                    });
                    item.addEventListener('mouseenter', () => item.style.background = 'rgba(122,162,247,0.15)');
                    item.addEventListener('mouseleave', () => item.style.background = 'transparent');
                });
            };

            document.getElementById(`ce-new-${winId}`).onclick = () => {
                content = '';
                currentPath = null;
                filename = 'untitled.py';
                isModified = false;
                textarea.value = '';
                updateLines();
                const fnEl = document.getElementById(`ce-filename-${winId}`);
                if (fnEl) { fnEl.textContent = filename; fnEl.title = 'New file'; }
                document.getElementById(`ce-lang-${winId}`).textContent = 'Python';
            };
            document.getElementById(`ce-open-${winId}`).onclick = openFile;
            document.getElementById(`ce-save-${winId}`).onclick = saveFile;
            document.getElementById(`ce-saveas-${winId}`).onclick = saveAsFile;
            document.getElementById(`ce-run-${winId}`).onclick = () => {
                if (currentPath || filename !== 'untitled.py') {
                    saveFile();
                    this.openApp('terminal');
                }
            };
        };
        render();
    }

    _getLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const langs = { py:'Python', js:'JavaScript', html:'HTML', css:'CSS', sh:'Shell', json:'JSON', md:'Markdown', yaml:'YAML', yml:'YAML', sql:'SQL', xml:'XML', toml:'TOML', txt:'Text', myan:'Myanmar Code' };
        return langs[ext] || 'Plain Text';
    }

    // ══════════════════════════════════════════════════════════
    //  APP: Notepad (Full Featured)
    // ══════════════════════════════════════════════════════════
    renderNotepad(body, winId, filePath) {
        let content = '';
        let filename = filePath ? this.vfs.basename(filePath) : 'untitled.txt';
        let currentPath = filePath || null;
        let isModified = false;
        let wordWrap = true;

        if (filePath && this.vfs.isFile(filePath)) content = this.vfs.read(filePath) || '';

        const render = () => {
            body.innerHTML = `
            <div class="notepad">
                <div class="notepad-toolbar">
                    <button class="np-btn" id="np-new-${winId}">📄 New</button>
                    <button class="np-btn" id="np-open-${winId}">📂 Open</button>
                    <button class="np-btn" id="np-save-${winId}">💾 Save</button>
                    <button class="np-btn" id="np-saveas-${winId}">Save As</button>
                    <button class="np-btn" id="np-wrap-${winId}">${wordWrap ? '🔀 Wrap On' : '⬜ Wrap Off'}</button>
                    <div class="np-filename" id="np-filename-${winId}">${isModified ? '● ' : ''}${filename}</div>
                </div>
                <div class="notepad-body">
                    <textarea class="notepad-textarea" id="np-text-${winId}" placeholder="Type here..." spellcheck="false" style="${wordWrap ? '' : 'white-space:pre;overflow-x:auto;'}">${this._escapeHtml(content)}</textarea>
                </div>
                <div class="notepad-statusbar">
                    <span id="np-count-${winId}">Lines: 1 | Chars: 0</span>
                    <span>${wordWrap ? 'Word Wrap: On' : 'Word Wrap: Off'} | UTF-8 | Myanos Notepad</span>
                </div>
            </div>`;

            const textarea = document.getElementById(`np-text-${winId}`);
            const countEl = document.getElementById(`np-count-${winId}`);
            const updateCount = () => {
                const text = textarea.value;
                const lines = text.split('\n').length;
                countEl.textContent = `Lines: ${lines} | Chars: ${text.length}`;
                if (!isModified) {
                    isModified = true;
                    const fnEl = document.getElementById(`np-filename-${winId}`);
                    if (fnEl) fnEl.textContent = '● ' + filename;
                }
            };
            textarea.addEventListener('input', updateCount);
            textarea.addEventListener('keydown', (e) => {
                if (e.ctrlKey && e.key === 's') { e.preventDefault(); saveFile(); }
            });
            updateCount();

            const saveFile = () => {
                if (currentPath && this.vfs.exists(currentPath)) {
                    this.vfs.write(currentPath, textarea.value);
                    isModified = false;
                    const fnEl = document.getElementById(`np-filename-${winId}`);
                    if (fnEl) fnEl.textContent = filename;
                    this.renderDesktopIcons();
                    this.notif.show(`Saved: ${filename}`, 'success', 1500);
                } else {
                    saveAsFile();
                }
            };

            const saveAsFile = () => {
                this._showInputDialog('💾 Save As', filename, filename, (newName) => {
                    if (!newName) return;
                    const path = '/Desktop/' + newName;
                    this.vfs.write(path, textarea.value);
                    currentPath = path;
                    filename = newName;
                    isModified = false;
                    const fnEl = document.getElementById(`np-filename-${winId}`);
                    if (fnEl) fnEl.textContent = filename;
                    this.renderDesktopIcons();
                    this.notif.show(`Saved: ${filename}`, 'success', 1500);
                });
            };

            const openFile = () => {
                const files = this.vfs.list('/Desktop');
                const textFiles = files.filter(f => f.type === 'file');
                if (textFiles.length === 0) { this.notif.show('No files on Desktop', 'info', 2000); return; }
                const items = textFiles.map(f => {
                    const name = this.vfs.basename(f.path);
                    const icon = this._getFileIcon(f.path);
                    return `<div class="open-file-item" data-path="${f.path}" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;cursor:pointer;transition:background 0.12s;">
                        <span style="font-size:20px;">${icon}</span>
                        <div style="flex:1;"><div style="font-size:13px;color:#c0caf5;">${name}</div></div>
                    </div>`;
                }).join('');
                const dlgApp = { id:'dlg-'+Date.now(), name:'Open File', icon:'📂', desc:'', category:'system' };
                const dlgId = ++this.windowIdCounter;
                const dlgEl = this.createWindowElement(dlgId, dlgApp);
                document.getElementById('desktop').appendChild(dlgEl);
                this.windows.set(dlgId, { id:dlgId, app:dlgApp, arg:null, element:dlgEl, minimized:false, maximized:false, x:250, y:120, width:400, height:400 });
                this.positionWindow(dlgId);
                this.focusWindow(dlgId);
                this.updateTaskbarApps();
                const dlgBody = document.getElementById(`win-body-${dlgId}`);
                dlgBody.innerHTML = `<div style="padding:12px;height:100%;overflow-y:auto;">${items}</div>`;
                dlgBody.querySelectorAll('.open-file-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const p = item.dataset.path;
                        currentPath = p;
                        filename = this.vfs.basename(p);
                        content = this.vfs.read(p) || '';
                        isModified = false;
                        textarea.value = content;
                        updateCount();
                        const fnEl = document.getElementById(`np-filename-${winId}`);
                        if (fnEl) fnEl.textContent = filename;
                        this.closeWindow(dlgId);
                        this.notif.show(`Opened: ${filename}`, 'info', 1500);
                    });
                    item.addEventListener('mouseenter', () => item.style.background = 'rgba(122,162,247,0.15)');
                    item.addEventListener('mouseleave', () => item.style.background = 'transparent');
                });
            };

            document.getElementById(`np-new-${winId}`).onclick = () => {
                content = ''; currentPath = null; filename = 'untitled.txt'; isModified = false;
                textarea.value = ''; updateCount();
                const fnEl = document.getElementById(`np-filename-${winId}`);
                if (fnEl) fnEl.textContent = filename;
            };
            document.getElementById(`np-open-${winId}`).onclick = openFile;
            document.getElementById(`np-save-${winId}`).onclick = saveFile;
            document.getElementById(`np-saveas-${winId}`).onclick = saveAsFile;
            document.getElementById(`np-wrap-${winId}`).onclick = () => {
                wordWrap = !wordWrap;
                render();
            };
        };
        render();
    }

    // ══════════════════════════════════════════════════════════
    //  APP: File Manager (Full Navigation)
    // ══════════════════════════════════════════════════════════
    renderFileManager(body, winId, startPath) {
        let currentPath = startPath || '/Desktop';
        const self = this;
        let selectedFiles = new Set();
        let dragSourcePath = null;

        const render = () => {
            const files = this.vfs.list(currentPath);
            const pathParts = currentPath.split('/').filter(Boolean);
            const breadcrumb = '<span style="cursor:pointer;color:#7aa2f7;" data-path="/">/</span>' +
                pathParts.map((part, i) => {
                    const p = '/' + pathParts.slice(0, i + 1).join('/');
                    return ` <span style="color:#565f89;">/</span> <span style="cursor:pointer;color:#a9b1d6;" data-path="${p}">${part}</span>`;
                }).join('');

            const gridHtml = files.length === 0
                ? '<div style="padding:60px;text-align:center;color:#565f89;font-size:14px;">📁 Empty folder<br><span style="font-size:12px;margin-top:8px;display:block;">Use toolbar to create files and folders, or drag items here</span></div>'
                : files.map(f => {
                    const icon = f.type === 'folder' ? '📁' : this._getFileIcon(f.path);
                    const name = this.vfs.basename(f.path);
                    const size = f.type === 'file' ? this.vfs.formatSize(new Blob([f.content || '']).size) : `${(f.children || []).length} items`;
                    const isSelected = selectedFiles.has(f.path);
                    return `<div class="fm-item${isSelected ? ' fm-selected' : ''}" data-path="${f.path}" data-type="${f.type}" draggable="true" style="${isSelected ? 'background:rgba(122,162,247,0.12);border:1px solid rgba(122,162,247,0.3);border-radius:8px;' : ''}">
                        <div class="fm-icon">${icon}</div>
                        <div class="fm-name" title="${name}">${name}</div>
                        <div class="fm-size">${size}</div>
                    </div>`;
                }).join('');

            body.innerHTML = `
            <div class="app-filemanager">
                <div class="fm-sidebar">
                    <div class="fm-sidebar-item${currentPath === '/Desktop' ? ' active' : ''}" data-path="/Desktop">🖥️ Desktop</div>
                    <div class="fm-sidebar-item${currentPath === '/Documents' ? ' active' : ''}" data-path="/Documents">📄 Documents</div>
                    <div class="fm-sidebar-item${currentPath === '/Downloads' ? ' active' : ''}" data-path="/Downloads">⬇️ Downloads</div>
                    <div class="fm-sidebar-item${currentPath === '/myan-os' ? ' active' : ''}" data-path="/myan-os">📦 myan-os</div>
                    <div class="fm-sidebar-item${currentPath === '/' ? ' active' : ''}" data-path="/">📂 Root</div>
                </div>
                <div style="flex:1;display:flex;flex-direction:column;">
                    <div class="fm-toolbar" style="display:flex;align-items:center;gap:4px;padding:6px 8px;background:rgba(30,32,50,0.5);border-bottom:1px solid rgba(255,255,255,0.06);">
                        <button class="fm-nav-btn" id="fm-back-${winId}" style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">←</button>
                        <button class="fm-nav-btn" id="fm-up-${winId}" style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">↑</button>
                        <div class="fm-path" id="fm-path-${winId}" style="flex:1;padding:0 6px;font-size:12px;color:#a9b1d6;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${breadcrumb}</div>
                        <button class="fm-nav-btn" id="fm-newfile-${winId}" style="padding:4px 8px;background:rgba(158,206,106,0.12);border:1px solid rgba(158,206,106,0.25);color:#9ece6a;border-radius:4px;cursor:pointer;font-size:11px;">+📄</button>
                        <button class="fm-nav-btn" id="fm-newfolder-${winId}" style="padding:4px 8px;background:rgba(158,206,106,0.12);border:1px solid rgba(158,206,106,0.25);color:#9ece6a;border-radius:4px;cursor:pointer;font-size:11px;">+📁</button>
                        <button class="fm-nav-btn" id="fm-refresh-${winId}" style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">⟳</button>
                    </div>
                    <div class="fm-grid" id="fm-grid-${winId}" style="flex:1;overflow-y:auto;padding:8px;">${gridHtml}</div>
                    <div class="fm-statusbar" id="fm-status-${winId}">${files.length} items | ${currentPath}${selectedFiles.size > 0 ? ' | ' + selectedFiles.size + ' selected' : ''}</div>
                </div>
            </div>`;

            // Add drag-drop CSS dynamically
            if (!document.getElementById('fm-dragdrop-style')) {
                const style = document.createElement('style');
                style.id = 'fm-dragdrop-style';
                style.textContent = `
                    .fm-item { transition: background 0.12s, border 0.12s; cursor: default; }
                    .fm-item:hover { background: rgba(255,255,255,0.04); }
                    .fm-item.fm-selected { background: rgba(122,162,247,0.12) !important; border: 1px solid rgba(122,162,247,0.3); border-radius: 8px; }
                    .fm-item.fm-drop-target { background: rgba(122,162,247,0.2) !important; border: 2px dashed #7aa2f7 !important; border-radius: 8px; }
                    .fm-item[draggable="true"] { cursor: grab; }
                    .fm-item[draggable="true"]:active { cursor: grabbing; }
                `;
                document.head.appendChild(style);
            }

            // Sidebar navigation
            body.querySelectorAll('.fm-sidebar-item').forEach(item => {
                item.addEventListener('click', () => {
                    currentPath = item.dataset.path;
                    selectedFiles.clear();
                    render();
                });
            });

            // Breadcrumb navigation
            body.querySelectorAll('#fm-path-' + winId + ' span[data-path]').forEach(span => {
                span.addEventListener('click', () => {
                    currentPath = span.dataset.path;
                    selectedFiles.clear();
                    render();
                });
            });

            // Navigation buttons
            document.getElementById(`fm-up-${winId}`).onclick = () => {
                if (currentPath !== '/') {
                    currentPath = this.vfs.parent(currentPath);
                    selectedFiles.clear();
                    render();
                }
            };
            document.getElementById(`fm-back-${winId}`).onclick = () => {
                currentPath = '/Desktop';
                selectedFiles.clear();
                render();
            };
            document.getElementById(`fm-refresh-${winId}`).onclick = () => { selectedFiles.clear(); render(); };

            // New File button
            document.getElementById(`fm-newfile-${winId}`).onclick = () => {
                self._showInputDialog('📄 New File', 'untitled.txt', 'untitled.txt', (name) => {
                    if (!name) return;
                    const path = currentPath === '/' ? '/' + name : currentPath + '/' + name;
                    if (self.vfs.exists(path)) {
                        self.notif.show('File already exists: ' + name, 'error', 2000);
                        return;
                    }
                    self.vfs.createFile(path, '');
                    self.notif.show('Created: ' + name, 'success', 1500);
                    self.renderDesktopIcons();
                    render();
                });
            };

            // New Folder button
            document.getElementById(`fm-newfolder-${winId}`).onclick = () => {
                self._showInputDialog('📁 New Folder', 'New Folder', 'New Folder', (name) => {
                    if (!name) return;
                    const path = currentPath === '/' ? '/' + name : currentPath + '/' + name;
                    if (self.vfs.exists(path)) {
                        self.notif.show('Folder already exists: ' + name, 'error', 2000);
                        return;
                    }
                    self.vfs.createFolder(path);
                    self.notif.show('Created folder: ' + name, 'success', 1500);
                    self.renderDesktopIcons();
                    render();
                });
            };

            // File/Folder items - double click, right click, click select, drag-drop
            body.querySelectorAll('.fm-item').forEach(item => {
                // Ctrl+Click for multi-select
                item.addEventListener('click', (e) => {
                    if (e.ctrlKey || e.metaKey) {
                        const p = item.dataset.path;
                        if (selectedFiles.has(p)) {
                            selectedFiles.delete(p);
                        } else {
                            selectedFiles.add(p);
                        }
                        // Update visual without full re-render
                        body.querySelectorAll('.fm-item').forEach(el => {
                            const ep = el.dataset.path;
                            if (selectedFiles.has(ep)) {
                                el.classList.add('fm-selected');
                                el.style.background = 'rgba(122,162,247,0.12)';
                                el.style.border = '1px solid rgba(122,162,247,0.3)';
                                el.style.borderRadius = '8px';
                            } else {
                                el.classList.remove('fm-selected');
                                el.style.background = '';
                                el.style.border = '';
                                el.style.borderRadius = '';
                            }
                        });
                        // Update status bar
                        const statusEl = document.getElementById(`fm-status-${winId}`);
                        if (statusEl) {
                            statusEl.textContent = files.length + ' items | ' + currentPath + (selectedFiles.size > 0 ? ' | ' + selectedFiles.size + ' selected' : '');
                        }
                    } else if (!e.ctrlKey && !e.metaKey) {
                        // Single click without ctrl deselects all
                        if (selectedFiles.size > 0) {
                            selectedFiles.clear();
                            body.querySelectorAll('.fm-item').forEach(el => {
                                el.classList.remove('fm-selected');
                                el.style.background = '';
                                el.style.border = '';
                                el.style.borderRadius = '';
                            });
                            const statusEl = document.getElementById(`fm-status-${winId}`);
                            if (statusEl) statusEl.textContent = files.length + ' items | ' + currentPath;
                        }
                    }
                });

                item.addEventListener('dblclick', () => {
                    const p = item.dataset.path;
                    const type = item.dataset.type;
                    if (type === 'folder') { currentPath = p; selectedFiles.clear(); render(); }
                    else { this._openVfsFile(p); }
                });

                item.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectedVfsFile = item.dataset.path;
                    this._showFileContextMenu(e.clientX, e.clientY);
                });

                // Drag start
                item.addEventListener('dragstart', (e) => {
                    dragSourcePath = item.dataset.path;
                    e.dataTransfer.effectAllowed = 'move';
                    e.dataTransfer.setData('text/plain', dragSourcePath);
                    item.style.opacity = '0.5';
                    setTimeout(() => { item.style.opacity = ''; }, 200);
                });

                item.addEventListener('dragend', (e) => {
                    item.style.opacity = '';
                    // Remove all drop target highlights
                    body.querySelectorAll('.fm-drop-target').forEach(el => el.classList.remove('fm-drop-target'));
                });

                // Drag over - highlight folders
                item.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'move';
                    if (item.dataset.type === 'folder' && item.dataset.path !== dragSourcePath) {
                        item.classList.add('fm-drop-target');
                    }
                });

                item.addEventListener('dragleave', (e) => {
                    item.classList.remove('fm-drop-target');
                });

                // Drop on folder
                item.addEventListener('drop', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    item.classList.remove('fm-drop-target');

                    const srcPath = e.dataTransfer.getData('text/plain');
                    const destFolder = item.dataset.path;

                    if (!srcPath || srcPath === destFolder) return;
                    if (item.dataset.type !== 'folder') return;

                    // Prevent dropping a folder into itself or its descendant
                    if (destFolder.startsWith(srcPath + '/')) {
                        self.notif.show('Cannot move folder into itself', 'error', 2000);
                        return;
                    }

                    const srcName = self.vfs.basename(srcPath);
                    const destPath = destFolder === '/' ? '/' + srcName : destFolder + '/' + srcName;

                    if (self.vfs.exists(destPath)) {
                        self.notif.show('An item with that name already exists', 'error', 2000);
                        return;
                    }

                    if (self.vfs.move(srcPath, destPath)) {
                        self.notif.show(`Moved: ${srcName} → ${self.vfs.basename(destFolder)}/`, 'success', 2000);
                        selectedFiles.clear();
                        self.renderDesktopIcons();
                        render();
                    } else {
                        self.notif.show('Failed to move: ' + srcName, 'error', 2000);
                    }
                });
            });

            // Drop on grid (empty space) - do nothing
            const grid = document.getElementById(`fm-grid-${winId}`);
            if (grid) {
                grid.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    e.dataTransfer.dropEffect = 'none';
                });
                grid.addEventListener('drop', (e) => {
                    e.preventDefault();
                    body.querySelectorAll('.fm-drop-target').forEach(el => el.classList.remove('fm-drop-target'));
                });
            }
        };
        render();
    }

    // ══════════════════════════════════════════════════════════
    //  APP: Other Renderers
    // ══════════════════════════════════════════════════════════
    renderMonitor(body) {
        const cpu = 25 + Math.floor(Math.random() * 30);
        const mem = 40 + Math.floor(Math.random() * 25);
        const disk = 55 + Math.floor(Math.random() * 20);
        const temp = 35 + Math.floor(Math.random() * 20);
        body.innerHTML = `<div class="app-monitor">
            <div class="monitor-card"><h4>⚡ CPU Usage</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-cpu" style="width:0%" data-target="${cpu}%"></div></div><div class="monitor-stats"><span>${cpu}%</span><span>4 cores @ 3.2GHz</span></div></div>
            <div class="monitor-card"><h4>🧠 Memory Usage</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-mem" style="width:0%" data-target="${mem}%"></div></div><div class="monitor-stats"><span>${(mem/100*8).toFixed(1)} GB / 8 GB</span><span>${mem}%</span></div></div>
            <div class="monitor-card"><h4>💾 Disk Usage</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-disk" style="width:0%" data-target="${disk}%"></div></div><div class="monitor-stats"><span>${Math.round(disk/100*200)} GB / 200 GB</span><span>${disk}%</span></div></div>
            <div class="monitor-card"><h4>🌡️ Temperature</h4><div style="font-size:28px;text-align:center;padding:8px;color:${temp>60?'#f7768e':temp>45?'#e0af68':'#9ece6a'};">${temp}°C</div></div>
            <div class="monitor-card"><h4>⏱️ Uptime</h4><div style="font-size:14px;text-align:center;padding:8px;color:#a9b1d6;" id="uptime-display">0h 0m 0s</div></div>
            <div class="monitor-card"><h4>📡 Network</h4><div style="font-size:14px;text-align:center;padding:8px;"><span style="color:#9ece6a;">● Connected</span><br><span style="color:#565f89;font-size:12px;">Wi-Fi | 867 Mbps</span></div></div>
        </div>`;
        // Animate bars
        setTimeout(() => {
            body.querySelectorAll('.monitor-bar-fill').forEach(b => { b.style.width = b.dataset.target; });
        }, 100);
        // Uptime counter
        let uptimeSec = 0;
        const uptimeInterval = setInterval(() => {
            uptimeSec++;
            const h = Math.floor(uptimeSec / 3600);
            const m = Math.floor((uptimeSec % 3600) / 60);
            const s = uptimeSec % 60;
            const el = document.getElementById('uptime-display');
            if (el) el.textContent = `${h}h ${m}m ${s}s`;
            else clearInterval(uptimeInterval);
        }, 1000);
    }

    renderSettings(body) {
        const s = this._settings;
        const self = this;
        const wpList = Object.entries(WALLPAPERS);
        const accentColors = [
            {n:'Blue',c:'#7aa2f7'},{n:'Green',c:'#9ece6a'},{n:'Purple',c:'#bb9af7'},
            {n:'Orange',c:'#ff9e64'},{n:'Red',c:'#f7768e'},{n:'Cyan',c:'#7dcfff'}
        ];
        const saveSetting = (key, val) => { self._settings[key]=val; localStorage.setItem('myanos_settings', JSON.stringify(self._settings)); };
        const renderTab = (tab) => {
            const content = document.getElementById('settings-content');
            if (!content) return;
            if (tab === 'display') {
                content.innerHTML = `<div class="settings-section">
                    <h3>🖥️ Display Settings</h3>
                    <div class="settings-row"><label>Wallpaper</label>
                        <div style="display:flex;gap:6px;">${wpList.map(([id,wp]) => `<div onclick="window.myanos._changeWallpaper('${id}');document.querySelectorAll('.settings-wp-thumb').forEach(e=>e.style.outline='none');this.style.outline='2px solid #7aa2f7';" class="settings-wp-thumb" style="width:40px;height:28px;border-radius:4px;cursor:pointer;background:${wp.css};${self.vfs.getWallpaper()===id?'outline:2px solid #7aa2f7;':''}" title="${wp.name}"></div>`).join('')}</div>
                    </div>
                    <div class="settings-row"><label>Font Size</label>
                        <div style="display:flex;align-items:center;gap:10px;">
                            <input type="range" min="12" max="20" value="${s.fontSize||14}" oninput="this.nextElementSibling.textContent=this.value+'px';window.myanos._settings.fontSize=+this.value;localStorage.setItem('myanos_settings',JSON.stringify(window.myanos._settings));document.body.style.fontSize=this.value+'px';" style="width:120px;accent-color:#7aa2f7;">
                            <span class="value">${s.fontSize||14}px</span>
                        </div>
                    </div>
                    <div class="settings-row"><label>Dark Mode</label>
                        <div class="toggle ${s.darkMode!==false?'on':''}" onclick="this.classList.toggle('on');const v=this.classList.contains('on');window.myanos._settings.darkMode=v;localStorage.setItem('myanos_settings',JSON.stringify(window.myanos._settings));"></div></div>
                    <div class="settings-row"><label>Blur Effects</label>
                        <div class="toggle ${s.blur!==false?'on':''}" onclick="this.classList.toggle('on');const v=this.classList.contains('on');window.myanos._settings.blur=v;localStorage.setItem('myanos_settings',JSON.stringify(window.myanos._settings));document.querySelectorAll('.myanos-window').forEach(w=>w.style.backdropFilter=v?'blur(20px)':'none');"></div></div>
                    <div class="settings-row"><label>Animations</label>
                        <div class="toggle ${s.animations!==false?'on':''}" onclick="this.classList.toggle('on');const v=this.classList.contains('on');window.myanos._settings.animations=v;localStorage.setItem('myanos_settings',JSON.stringify(window.myanos._settings));document.body.style.setProperty('--anim-speed',v?'':'0s');"></div></div>
                </div>`;
            } else if (tab === 'appearance') {
                content.innerHTML = `<div class="settings-section">
                    <h3>🎨 Appearance</h3>
                    <div class="settings-row"><label>Accent Color</label>
                        <div style="display:flex;gap:8px;">${accentColors.map(ac => `<div onclick="document.querySelectorAll('.accent-dot').forEach(e=>e.style.outline='none');this.style.outline='2px solid #fff';document.documentElement.style.setProperty('--accent','${ac.c}');window.myanos._settings.accentColor='${ac.c}';localStorage.setItem('myanos_settings',JSON.stringify(window.myanos._settings));" class="accent-dot" style="width:24px;height:24px;border-radius:50%;cursor:pointer;background:${ac.c};${(s.accentColor||'#7aa2f7')===ac.c?'outline:2px solid #fff;':''}" title="${ac.n}"></div>`).join('')}</div>
                    </div>
                    <div class="settings-row"><label>Show Seconds in Clock</label>
                        <div class="toggle ${s.showSeconds?'on':''}" onclick="this.classList.toggle('on');window.myanos._settings.showSeconds=this.classList.contains('on');localStorage.setItem('myanos_settings',JSON.stringify(window.myanos._settings));"></div></div>
                    <div class="settings-row"><label>Lock Screen on Boot</label>
                        <div class="toggle ${s.lockOnBoot?'on':''}" onclick="this.classList.toggle('on');window.myanos._settings.lockOnBoot=this.classList.contains('on');localStorage.setItem('myanos_settings',JSON.stringify(window.myanos._settings));"></div></div>
                </div>`;
            } else if (tab === 'about') {
                content.innerHTML = `<div class="settings-section">
                    <h3>ℹ️ About Myanos</h3>
                    <div style="text-align:center;padding:20px 0;">
                        <div style="font-size:64px;margin-bottom:12px;">🇲🇲</div>
                        <div style="font-size:20px;color:#c0caf5;font-weight:600;">Myanos Web OS</div>
                        <div style="font-size:13px;color:#565f89;margin-top:4px;">Version 3.1.0</div>
                    </div>
                    <table style="width:100%;border-collapse:collapse;">
                        <tr class="settings-row"><td style="color:#565f89;">Developer</td><td style="color:#a9b1d6;text-align:right;">Meonnmi-ops (Boss)</td></tr>
                        <tr class="settings-row"><td style="color:#565f89;">Shell</td><td style="color:#a9b1d6;text-align:right;">MMR Shell v1.0.0</td></tr>
                        <tr class="settings-row"><td style="color:#565f89;">Package Manager</td><td style="color:#a9b1d6;text-align:right;">MyanPM (.myan)</td></tr>
                        <tr class="settings-row"><td style="color:#565f89;">Language</td><td style="color:#a9b1d6;text-align:right;">Myanmar Code</td></tr>
                        <tr class="settings-row"><td style="color:#565f89;">License</td><td style="color:#a9b1d6;text-align:right;">MIT</td></tr>
                        <tr class="settings-row"><td style="color:#565f89;">GitHub</td><td style="color:#7aa2f7;text-align:right;cursor:pointer;" onclick="window.myanos.openApp('browser')">meonnmi-ops/Myanos</td></tr>
                    </table>
                </div>`;
            } else {
                const tabNames = {sound:'🔊 Sound',network:'📶 Network',security:'🔒 Security',language:'🌐 Language',packages:'📦 Packages'};
                content.innerHTML = `<div class="settings-section"><h3>${tabNames[tab]||tab}</h3><div style="padding:40px;text-align:center;color:#565f89;"><div style="font-size:36px;margin-bottom:12px;">🚧</div><p>Coming in next update</p></div></div>`;
            }
        };
        body.innerHTML = `<div class="app-settings">
            <div class="settings-sidebar">
                <div class="settings-item active" data-tab="display">🖥️ Display</div>
                <div class="settings-item" data-tab="appearance">🎨 Appearance</div>
                <div class="settings-item" data-tab="sound">🔊 Sound</div>
                <div class="settings-item" data-tab="network">📶 Network</div>
                <div class="settings-item" data-tab="security">🔒 Security</div>
                <div class="settings-item" data-tab="language">🌐 Language</div>
                <div class="settings-item" data-tab="packages">📦 Packages</div>
                <div class="settings-item" data-tab="about">ℹ️ About</div>
            </div>
            <div class="settings-content" id="settings-content"></div>
        </div>`;
        renderTab('display');
        body.querySelectorAll('.settings-item').forEach(item => {
            item.addEventListener('click', () => {
                body.querySelectorAll('.settings-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                renderTab(item.dataset.tab);
            });
        });
    }

    renderNeofetch(body) {
        body.innerHTML = `<div class="app-neofetch"><pre class="logo">       ┌──────────────┐
       │   Myanos OS   │
       │  ████████████  │
       │  █▀▀▀▀▀▀▀▀█  │
       │  █ ▀▀▀▀▀▀ █  │
       │    ▀▀▀▀▀▀    │
       └──────────────┘</pre><div class="title">meonnmi@myanos</div><div style="color:#565f89;">──────────────────────────────────</div><div><span class="label">  OS:        </span><span class="info">Myanos Web OS v3.0.0</span></div><div><span class="label">  Shell:     </span><span class="info">MMR Shell v1.0.0</span></div><div><span class="label">  Desktop:   </span><span class="info">Myanos Desktop Environment</span></div><div><span class="label">  Theme:     </span><span class="info">Tokyo Night Dark</span></div><div><span class="label">  Packages:  </span><span class="info">.myan (MyanPM)</span></div><div><span class="label">  Language:  </span><span class="info">Myanmar Code (127 keywords)</span></div><div><span class="label">  Wallpaper: </span><span class="info">${(WALLPAPERS[this.vfs.getWallpaper()] || WALLPAPERS.default).name}</span></div><div style="color:#565f89;">──────────────────────────────────</div><div class="highlight">  🇲🇲 Myanos Web OS — Myanmar's First Advanced Web OS</div></div>`;
    }

    renderMyanmarCode(body, winId) {
        const self = this;
        const MYAN_KEYWORDS = [
            { myan: 'ပုံနှိပ်', en: 'print', color: '#9ece6a', cat: 'I/O' },
            { myan: 'ဖြည့်သွင်း', en: 'input', color: '#9ece6a', cat: 'I/O' },
            { myan: 'တိုက်', en: 'if', color: '#e0af68', cat: 'Control' },
            { myan: 'တိုက်ရွေး', en: 'else', color: '#f7768e', cat: 'Control' },
            { myan: 'တိုက်ရွေးသည်', en: 'elif', color: '#f7768e', cat: 'Control' },
            { myan: 'ကြာအောင်', en: 'while', color: '#e0af68', cat: 'Control' },
            { myan: 'အတိုင်း', en: 'for', color: '#e0af68', cat: 'Control' },
            { myan: 'ပျက်', en: 'break', color: '#bb9af7', cat: 'Control' },
            { myan: 'ဆက်လုပ်', en: 'continue', color: '#7dcfff', cat: 'Control' },
            { myan: 'ပြန်လည်', en: 'loop', color: '#e0af68', cat: 'Control' },
            { myan: 'လုပ်', en: 'function', color: '#ff9e64', cat: 'Function' },
            { myan: 'ဖြင့်', en: 'def', color: '#ff9e64', cat: 'Function' },
            { myan: 'ခန့်', en: 'return', color: '#ff9e64', cat: 'Function' },
            { myan: 'အုပ်စု', en: 'class', color: '#bb9af7', cat: 'OOP' },
            { myan: 'ချိုး', en: 'self', color: '#c0caf5', cat: 'OOP' },
            { myan: 'ညွှန်ပါ', en: 'init', color: '#bb9af7', cat: 'OOP' },
            { myan: 'ခေါ်ယူ', en: 'import', color: '#7dcfff', cat: 'Module' },
            { myan: 'မှ', en: 'from', color: '#7dcfff', cat: 'Module' },
            { myan: 'ထုတ်ယူ', en: 'export', color: '#7dcfff', cat: 'Module' },
            { myan: 'တွက်ချက်', en: 'try', color: '#e0af68', cat: 'Error' },
            { myan: 'မှားယွင်း', en: 'except', color: '#f7768e', cat: 'Error' },
            { myan: 'အုတ်မွေး', en: 'finally', color: '#f7768e', cat: 'Error' },
            { myan: 'အပြုအမူ', en: 'raise', color: '#f7768e', cat: 'Error' },
            { myan: 'သတ်မှတ်', en: 'let', color: '#bb9af7', cat: 'Variable' },
            { myan: 'ခံနှံ', en: 'const', color: '#bb9af7', cat: 'Variable' },
            { myan: 'မဟုတ်', en: 'not', color: '#c0caf5', cat: 'Operator' },
            { myan: 'နှင့်', en: 'and', color: '#c0caf5', cat: 'Operator' },
            { myan: 'သည်နှင့်', en: 'or', color: '#c0caf5', cat: 'Operator' },
            { myan: 'နေပါ', en: 'in', color: '#c0caf5', cat: 'Operator' },
            { myan: 'တိုင်း', en: 'is', color: '#c0caf5', cat: 'Operator' },
            { myan: 'ညီမျှ', en: 'as', color: '#c0caf5', cat: 'Operator' },
            { myan: 'မျက်မှန်', en: 'True', color: '#ff9e64', cat: 'Literal' },
            { myan: 'မမျက်နှာ', en: 'False', color: '#ff9e64', cat: 'Literal' },
            { myan: 'ဘောက်', en: 'None', color: '#ff9e64', cat: 'Literal' },
        ];

        let content = '';
        let filename = 'untitled.myan';
        let currentPath = null;
        let isModified = false;
        let keywordPanelOpen = true;

        const defaultCode = '# \U0001f1f2\U0001f1f2 Myanmar Code Example\n# မြန်မာဘာသာစကားဖြင့် ရေးသားပါ\n\nလုပ် အမျိုးအားဖြင့်(အမှတ်):\n    တိုက် အမှတ် < 10:\n        ပုံနှိပ်("Number is small")\n    တိုက်ရွေး:\n        ပုံနှိပ်("Number is big")\n\nပုံနှိပ်(အမျိုးအားဖြင့်(5))';
        content = defaultCode;

        const render = () => {
            const kwPanelWidth = keywordPanelOpen ? '220px' : '0px';
            const categories = [...new Set(MYAN_KEYWORDS.map(k => k.cat))];
            const kwPanelHtml = categories.map(cat => {
                const items = MYAN_KEYWORDS.filter(k => k.cat === cat);
                return '<div style="margin-bottom:10px;"><div style="font-size:10px;color:#565f89;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">' + cat + '</div>' + items.map(k => '<div class="myan-kw-item" data-kw="' + k.myan + '" style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:4px;cursor:pointer;font-size:12px;transition:background 0.1s;" onmouseenter="this.style.background=\'rgba(122,162,247,0.1)\'" onmouseleave="this.style.background=\'transparent\'"><span style="color:' + k.color + ';font-weight:600;min-width:70px;">' + k.myan + '</span><span style="color:#565f89;font-size:10px;">' + k.en + '</span></div>').join('') + '</div>';
            }).join('');

            body.innerHTML = `
            <div style="display:flex;flex-direction:column;height:100%;">
                <div style="display:flex;align-items:center;gap:4px;padding:6px 10px;background:rgba(30,32,50,0.5);border-bottom:1px solid rgba(255,255,255,0.06);">
                    <button class="myan-btn" id="myan-new-${winId}" style="padding:4px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#a9b1d6;font-size:12px;cursor:pointer;">\U0001f4c4 New</button>
                    <button class="myan-btn" id="myan-open-${winId}" style="padding:4px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#a9b1d6;font-size:12px;cursor:pointer;">\U0001f4c2 Open</button>
                    <button class="myan-btn" id="myan-save-${winId}" style="padding:4px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#a9b1d6;font-size:12px;cursor:pointer;">\U0001f4be Save</button>
                    <button class="myan-btn" id="myan-run-${winId}" style="padding:4px 10px;background:rgba(158,206,106,0.15);border:1px solid rgba(158,206,106,0.3);border-radius:4px;color:#9ece6a;font-size:12px;cursor:pointer;">\u25b6 Run</button>
                    <div style="flex:1;"></div>
                    <button class="myan-btn" id="myan-kw-toggle-${winId}" style="padding:4px 10px;background:${keywordPanelOpen?'rgba(122,162,247,0.15)':'rgba(255,255,255,0.06)'};border:1px solid ${keywordPanelOpen?'rgba(122,162,247,0.3)':'rgba(255,255,255,0.08)'};border-radius:4px;color:${keywordPanelOpen?'#7aa2f7':'#a9b1d6'};font-size:12px;cursor:pointer;">\U0001f4cb Keywords</button>
                    <div id="myan-filename-${winId}" style="font-size:12px;color:#a9b1d6;padding:0 8px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" title="${currentPath || 'New file'}">${isModified ? '\u25cf ' : ''}${filename}</div>
                </div>
                <div style="display:flex;flex:1;overflow:hidden;">
                    <div id="myan-kw-panel-${winId}" style="width:${kwPanelWidth};min-width:${kwPanelWidth};background:rgba(20,21,37,0.8);border-right:1px solid rgba(255,255,255,0.06);overflow-y:auto;padding:10px;transition:width 0.2s;${keywordPanelOpen?'':'overflow:hidden;'}">
                        <div style="font-size:11px;color:#7aa2f7;font-weight:600;margin-bottom:8px;">\U0001f1f2\U0001f1f2 Myanmar Code Keywords</div>
                        ${kwPanelHtml}
                    </div>
                    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
                        <div class="code-editor-statusbar" style="padding:2px 10px;">
                            <span id="myan-pos-${winId}">Ln 1, Col 1</span>
                            <span style="color:#565f89;">|</span>
                            <span>Myanmar Code (.myan)</span>
                            <span style="color:#565f89;">|</span>
                            <span>UTF-8</span>
                        </div>
                        <div class="code-editor-body" style="flex:1;">
                            <div class="code-line-numbers" id="myan-lines-${winId}">1</div>
                            <textarea class="code-textarea" id="myan-code-${winId}" spellcheck="false" autocomplete="off" autocorrect="off" autocapitalize="off" style="font-family:'JetBrains Mono','Noto Sans Myanmar',monospace;">${self._escapeHtml(content)}</textarea>
                        </div>
                    </div>
                </div>
            </div>`;

            const textarea = document.getElementById(`myan-code-${winId}`);
            const lineNums = document.getElementById(`myan-lines-${winId}`);
            const posEl = document.getElementById(`myan-pos-${winId}`);

            const updateLines = () => {
                const lines = textarea.value.split('\n').length;
                lineNums.innerHTML = Array.from({length:lines},(_,i)=>i+1).join('\n');
            };
            const updatePos = () => {
                const val = textarea.value.substring(0, textarea.selectionStart);
                const lines = val.split('\n');
                posEl.textContent = `Ln ${lines.length}, Col ${lines[lines.length-1].length + 1}`;
            };
            const markModified = () => {
                isModified = true;
                const fnEl = document.getElementById(`myan-filename-${winId}`);
                if (fnEl) fnEl.textContent = '\u25cf ' + filename;
            };

            textarea.addEventListener('input', () => { updateLines(); updatePos(); markModified(); });
            textarea.addEventListener('scroll', () => { lineNums.scrollTop = textarea.scrollTop; });
            textarea.addEventListener('click', updatePos);
            textarea.addEventListener('keyup', updatePos);
            textarea.addEventListener('keydown', (e) => {
                if (e.key === 'Tab') {
                    e.preventDefault();
                    const s = textarea.selectionStart;
                    textarea.value = textarea.value.substring(0,s) + '    ' + textarea.value.substring(textarea.selectionEnd);
                    textarea.selectionStart = textarea.selectionEnd = s + 4;
                    updateLines(); markModified();
                }
                if (e.key === 'Enter') {
                    const before = textarea.value.substring(0, textarea.selectionStart);
                    const lastLine = before.split('\n').pop();
                    const indent = lastLine.match(/^\s*/)[0];
                    if (indent) {
                        e.preventDefault();
                        const s = textarea.selectionStart;
                        textarea.value = textarea.value.substring(0,s) + '\n' + indent + textarea.value.substring(textarea.selectionEnd);
                        textarea.selectionStart = textarea.selectionEnd = s + 1 + indent.length;
                        updateLines(); markModified();
                    }
                }
                if (e.ctrlKey && e.key === 's') {
                    e.preventDefault();
                    saveFile();
                }
            });
            updateLines();
            updatePos();

            // Keyword panel click - insert keyword at cursor
            body.querySelectorAll('.myan-kw-item').forEach(item => {
                item.addEventListener('click', () => {
                    const kw = item.dataset.kw;
                    const s = textarea.selectionStart;
                    textarea.value = textarea.value.substring(0,s) + kw + ' ' + textarea.value.substring(textarea.selectionEnd);
                    textarea.selectionStart = textarea.selectionEnd = s + kw.length + 1;
                    textarea.focus();
                    updatePos(); markModified();
                });
            });

            const saveFile = () => {
                if (currentPath && self.vfs.exists(currentPath)) {
                    self.vfs.write(currentPath, textarea.value);
                    isModified = false;
                    const fnEl = document.getElementById(`myan-filename-${winId}`);
                    if (fnEl) fnEl.textContent = filename;
                    self.renderDesktopIcons();
                    self.notif.show(`Saved: ${filename}`, 'success', 1500);
                } else {
                    saveAsFile();
                }
            };

            const saveAsFile = () => {
                self._showInputDialog('\U0001f4be Save As (.myan)', filename, filename, (newName) => {
                    if (!newName) return;
                    if (!newName.endsWith('.myan')) newName += '.myan';
                    const path = '/Desktop/' + newName;
                    self.vfs.write(path, textarea.value);
                    currentPath = path;
                    filename = newName;
                    isModified = false;
                    const fnEl = document.getElementById(`myan-filename-${winId}`);
                    if (fnEl) { fnEl.textContent = filename; fnEl.title = path; }
                    self.renderDesktopIcons();
                    self.notif.show(`Saved: ${filename}`, 'success', 1500);
                });
            };

            const openFile = () => {
                const searchPaths = ['/Desktop', '/Documents', '/myan-os'];
                let allFiles = [];
                searchPaths.forEach(p => {
                    try { self.vfs.list(p).forEach(f => { if (f.type === 'file') allFiles.push(f); }); } catch(e) {}
                });
                const myanFiles = allFiles.filter(f => f.path.endsWith('.myan'));
                const otherFiles = allFiles.filter(f => !f.path.endsWith('.myan'));
                const displayFiles = [...myanFiles, ...otherFiles];
                if (displayFiles.length === 0) {
                    self.notif.show('No files found', 'info', 2000);
                    return;
                }
                const dlgApp = { id:'dlg-'+Date.now(), name:'Open File', icon:'\U0001f4c2', desc:'Select a .myan file', category:'system' };
                const dlgId = ++self.windowIdCounter;
                const dlgEl = self.createWindowElement(dlgId, dlgApp);
                document.getElementById('desktop').appendChild(dlgEl);
                self.windows.set(dlgId, { id:dlgId, app:dlgApp, arg:null, element:dlgEl, minimized:false, maximized:false, x:250, y:120, width:400, height:400 });
                self.positionWindow(dlgId);
                self.focusWindow(dlgId);
                self.updateTaskbarApps();
                const dlgBody = document.getElementById(`win-body-${dlgId}`);
                dlgBody.innerHTML = '<div style="padding:12px;height:100%;overflow-y:auto;">' + displayFiles.map(f => {
                    const name = self.vfs.basename(f.path);
                    const icon = f.path.endsWith('.myan') ? '\U0001f1f2\U0001f1f2' : self._getFileIcon(f.path);
                    const highlight = f.path.endsWith('.myan') ? 'background:rgba(122,162,247,0.08);border:1px solid rgba(122,162,247,0.15);' : '';
                    return '<div class="open-file-item" data-path="' + f.path + '" style="display:flex;align-items:center;gap:10px;padding:8px 12px;border-radius:6px;cursor:pointer;margin-bottom:4px;transition:background 0.12s;' + highlight + '"><span style="font-size:20px;">' + icon + '</span><div style="flex:1;"><div style="font-size:13px;color:#c0caf5;">' + name + '</div><div style="font-size:11px;color:#565f89;">' + f.path + '</div></div></div>';
                }).join('') + '</div>';
                dlgBody.querySelectorAll('.open-file-item').forEach(item => {
                    item.addEventListener('click', () => {
                        const p = item.dataset.path;
                        currentPath = p;
                        filename = self.vfs.basename(p);
                        content = self.vfs.read(p) || '';
                        isModified = false;
                        textarea.value = content;
                        updateLines(); updatePos();
                        const fnEl = document.getElementById(`myan-filename-${winId}`);
                        if (fnEl) { fnEl.textContent = filename; fnEl.title = p; }
                        self.closeWindow(dlgId);
                        self.notif.show(`Opened: ${filename}`, 'info', 1500);
                    });
                    item.addEventListener('mouseenter', () => item.style.background = 'rgba(122,162,247,0.15)');
                    item.addEventListener('mouseleave', () => item.style.background = 'transparent');
                });
            };

            document.getElementById(`myan-new-${winId}`).onclick = () => {
                content = '';
                currentPath = null;
                filename = 'untitled.myan';
                isModified = false;
                textarea.value = '';
                updateLines();
                const fnEl = document.getElementById(`myan-filename-${winId}`);
                if (fnEl) { fnEl.textContent = filename; fnEl.title = 'New file'; }
            };
            document.getElementById(`myan-open-${winId}`).onclick = openFile;
            document.getElementById(`myan-save-${winId}`).onclick = saveFile;
            document.getElementById(`myan-run-${winId}`).onclick = () => {
                if (!currentPath) { saveAsFile(); } else { saveFile(); }
                setTimeout(() => {
                    self.openApp('terminal');
                    self.notif.show('Run your code in Terminal: myan run ' + filename, 'info', 3000);
                }, 300);
            };
            document.getElementById(`myan-kw-toggle-${winId}`).onclick = () => {
                keywordPanelOpen = !keywordPanelOpen;
                render();
            };
        };
        render();
    }

    renderPackageManager(body, winId) {
        const self = this;
        let searchQuery = '';
        let packages = [
            { n:'myanmar-code', v:'2.0.1', ic:'\U0001f1f2\U0001f1f2', au:'MWD', desc:'Myanmar programming language', inst:true },
            { n:'myanos-terminal', v:'1.0.0', ic:'\u2b1b', au:'Meonnmi-ops', desc:'Full terminal emulator', inst:true },
            { n:'myanos-display-engine', v:'1.0.0', ic:'\U0001f5a5\ufe0f', au:'Meonnmi-ops', desc:'Display rendering engine', inst:true },
            { n:'myanos-ps2-layer', v:'1.0.0', ic:'\U0001f3ae', au:'Meonnmi-ops', desc:'PS2 emulation layer', inst:false },
            { n:'myanos-android-layer', v:'1.0.0', ic:'\U0001f4f1', au:'Meonnmi-ops', desc:'Android compatibility layer', inst:false },
            { n:'myanos-toolbox', v:'1.0.0', ic:'\U0001f527', au:'Meonnmi-ops', desc:'System utilities toolbox', inst:true },
            { n:'myanos-ai-assistant', v:'0.5.0', ic:'\U0001f916', au:'Meonnmi-ops', desc:'AI-powered assistant', inst:false },
            { n:'myanos-web-browser', v:'1.0.0', ic:'\U0001f310', au:'Meonnmi-ops', desc:'Embedded web browser', inst:true },
        ];

        const render = () => {
            const filtered = searchQuery
                ? packages.filter(p => p.n.toLowerCase().includes(searchQuery.toLowerCase()) || p.desc.toLowerCase().includes(searchQuery.toLowerCase()))
                : packages;
            const instCount = packages.filter(p => p.inst).length;

            body.innerHTML = `
            <div style="display:flex;flex-direction:column;height:100%;">
                <div style="padding:12px 16px;background:rgba(30,32,50,0.5);border-bottom:1px solid rgba(255,255,255,0.06);">
                    <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
                        <span style="font-size:20px;">\U0001f4e6</span>
                        <div style="font-size:15px;color:#c0caf5;font-weight:600;">MyanPM</div>
                        <span style="font-size:11px;color:#565f89;">Package Manager</span>
                        <div style="flex:1;"></div>
                        <span style="font-size:11px;color:#565f89;">${instCount}/${packages.length} installed</span>
                        <button id="pkg-refresh-${winId}" style="padding:4px 10px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:4px;color:#a9b1d6;font-size:12px;cursor:pointer;">\u27f3 Refresh</button>
                    </div>
                    <div style="position:relative;">
                        <input id="pkg-search-${winId}" type="text" placeholder="Search packages..." value="${searchQuery}" style="width:100%;padding:8px 12px;padding-left:32px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#c0caf5;font-size:13px;outline:none;box-sizing:border-box;" />
                        <span style="position:absolute;left:10px;top:50%;transform:translateY(-50%);color:#565f89;font-size:13px;">\U0001f50d</span>
                    </div>
                </div>
                <div style="flex:1;overflow-y:auto;padding:12px;">
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        ${filtered.map(p => `
                        <div id="pkg-card-${winId}-${p.n}" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;transition:border-color 0.2s;">
                            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                                <span style="font-size:22px;">${p.ic}</span>
                                <div style="flex:1;min-width:0;">
                                    <div style="font-size:13px;color:#c0caf5;font-weight:500;">${p.n}</div>
                                    <div style="font-size:11px;color:#565f89;">v${p.v} \u00b7 ${p.au}</div>
                                </div>
                            </div>
                            <div style="font-size:11px;color:#565f89;margin-bottom:8px;line-height:1.4;">${p.desc}</div>
                            <div style="display:flex;align-items:center;justify-content:space-between;">
                                <span class="pkg-badge-${p.inst?'inst':'avail'}" style="font-size:10px;padding:2px 8px;border-radius:10px;font-weight:500;${p.inst?'background:rgba(158,206,106,0.15);color:#9ece6a;':'background:rgba(255,255,255,0.06);color:#565f89;'}">${p.inst?'\u2705 Installed':'\u2b1c Available'}</span>
                                <button class="pkg-action-btn" data-pkg="${p.n}" data-action="${p.inst?'remove':'install'}" style="padding:4px 12px;border-radius:4px;font-size:11px;cursor:pointer;transition:background 0.15s;${p.inst?'background:rgba(247,118,142,0.12);border:1px solid rgba(247,118,142,0.25);color:#f7768e;':'background:rgba(158,206,106,0.12);border:1px solid rgba(158,206,106,0.25);color:#9ece6a;'}">${p.inst?'Remove':'Install'}</button>
                            </div>
                        </div>`).join('')}
                    </div>
                    ${filtered.length === 0 ? '<div style="text-align:center;padding:40px;color:#565f89;">No packages found matching "' + searchQuery + '"</div>' : ''}
                </div>
            </div>`;

            // Search
            document.getElementById(`pkg-search-${winId}`).addEventListener('input', (e) => {
                searchQuery = e.target.value;
                render();
            });

            // Refresh
            document.getElementById(`pkg-refresh-${winId}`).onclick = () => {
                self.notif.show('Package list refreshed', 'info', 1500);
                render();
            };

            // Install/Remove buttons
            body.querySelectorAll('.pkg-action-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const pkgName = btn.dataset.pkg;
                    const action = btn.dataset.action;
                    const card = document.getElementById(`pkg-card-${winId}-${pkgName}`);
                    if (!card) return;

                    // Loading state
                    btn.disabled = true;
                    btn.textContent = action === 'install' ? 'Installing...' : 'Removing...';
                    btn.style.opacity = '0.6';

                    try {
                        const res = await fetch('/api/myan', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ action: action, package: pkgName })
                        });
                        if (res.ok) {
                            const pkg = packages.find(p => p.n === pkgName);
                            if (pkg) pkg.inst = action === 'install';
                            self.notif.show(`${action === 'install' ? 'Installed' : 'Removed'}: ${pkgName}`, 'success', 2000);
                            render();
                        } else {
                            self.notif.show(`Failed to ${action} ${pkgName}`, 'error', 2000);
                            btn.disabled = false;
                            btn.textContent = action === 'install' ? 'Install' : 'Remove';
                            btn.style.opacity = '1';
                        }
                    } catch(e) {
                        // Fallback: simulate locally
                        const pkg = packages.find(p => p.n === pkgName);
                        if (pkg) {
                            pkg.inst = action === 'install';
                            self.notif.show(`${action === 'install' ? 'Installed' : 'Removed'}: ${pkgName} (local)`, action === 'install' ? 'success' : 'warning', 2000);
                            render();
                        } else {
                            self.notif.show(`Failed to ${action} ${pkgName}: API unavailable`, 'error', 2000);
                            btn.disabled = false;
                            btn.textContent = action === 'install' ? 'Install' : 'Remove';
                            btn.style.opacity = '1';
                        }
                    }
                });
            });
        };
        render();
    }

    renderToolbox(body) {
        const self = this;
        body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;">
            <div style="display:flex;gap:4px;padding:8px;background:rgba(30,32,50,0.5);border-bottom:1px solid rgba(255,255,255,0.06);">
                <button class="tb-tab active" data-tool="calc" style="padding:6px 14px;background:rgba(122,162,247,0.15);border:1px solid rgba(122,162,247,0.3);border-radius:6px;color:#7aa2f7;font-size:12px;cursor:pointer;">🧮 Calculator</button>
                <button class="tb-tab" data-tool="stopwatch" style="padding:6px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#a9b1d6;font-size:12px;cursor:pointer;">⏱️ Stopwatch</button>
                <button class="tb-tab" data-tool="timer" style="padding:6px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#a9b1d6;font-size:12px;cursor:pointer;">⏲️ Timer</button>
                <button class="tb-tab" data-tool="color" style="padding:6px 14px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:6px;color:#a9b1d6;font-size:12px;cursor:pointer;">🎨 Color Picker</button>
            </div>
            <div id="toolbox-content" style="flex:1;overflow-y:auto;"></div>
        </div>`;
        const renderTool = (tool) => {
            const c = document.getElementById('toolbox-content');
            body.querySelectorAll('.tb-tab').forEach(t => { t.style.background='rgba(255,255,255,0.06)'; t.style.borderColor='rgba(255,255,255,0.08)'; t.style.color='#a9b1d6'; });
            body.querySelector(`.tb-tab[data-tool="${tool}"]`).style.cssText='padding:6px 14px;background:rgba(122,162,247,0.15);border:1px solid rgba(122,162,247,0.3);border-radius:6px;color:#7aa2f7;font-size:12px;cursor:pointer;';
            if (tool === 'calc') {
                c.innerHTML = `<div style="padding:12px;">
                    <input id="calc-display" readonly value="0" style="width:100%;padding:14px;font-size:24px;text-align:right;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:#c0caf5;font-family:'JetBrains Mono',monospace;margin-bottom:10px;outline:none;">
                    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">
                        ${['C','±','%','÷','7','8','9','×','4','5','6','−','1','2','3','+','0','.','⌫','='].map(b =>
                            `<button onclick="window.myanos._calcBtn('${b}')" style="padding:16px;font-size:18px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#c0caf5;cursor:pointer;transition:background 0.1s;" onmouseenter="this.style.background='rgba(122,162,247,0.15)'" onmouseleave="this.style.background='rgba(255,255,255,0.06)'">${b}</button>`
                        ).join('')}
                    </div>
                </div>`;
            } else if (tool === 'stopwatch') {
                c.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;padding:30px;height:100%;">
                    <div id="sw-display" style="font-size:48px;font-family:'JetBrains Mono',monospace;color:#c0caf5;margin-bottom:24px;">00:00.000</div>
                    <div style="display:flex;gap:10px;margin-bottom:20px;">
                        <button id="sw-start" onclick="window.myanos._swToggle()" style="padding:10px 24px;background:rgba(158,206,106,0.15);border:1px solid rgba(158,206,106,0.3);border-radius:8px;color:#9ece6a;font-size:14px;cursor:pointer;">▶ Start</button>
                        <button onclick="window.myanos._swLap()" style="padding:10px 24px;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#a9b1d6;font-size:14px;cursor:pointer;">🏁 Lap</button>
                        <button onclick="window.myanos._swReset()" style="padding:10px 24px;background:rgba(247,118,142,0.15);border:1px solid rgba(247,118,142,0.3);border-radius:8px;color:#f7768e;font-size:14px;cursor:pointer;">↺ Reset</button>
                    </div>
                    <div id="sw-laps" style="width:100%;max-height:200px;overflow-y:auto;font-family:'JetBrains Mono',monospace;font-size:13px;color:#a9b1d6;"></div>
                </div>`;
            } else if (tool === 'timer') {
                c.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;padding:30px;height:100%;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:20px;">
                        <input id="timer-min" type="number" value="5" min="0" max="99" style="width:60px;padding:10px;text-align:center;font-size:24px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:#c0caf5;font-family:'JetBrains Mono',monospace;outline:none;">
                        <span style="font-size:24px;color:#565f89;">:</span>
                        <input id="timer-sec" type="number" value="0" min="0" max="59" style="width:60px;padding:10px;text-align:center;font-size:24px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:8px;color:#c0caf5;font-family:'JetBrains Mono',monospace;outline:none;">
                    </div>
                    <div id="timer-display" style="font-size:48px;font-family:'JetBrains Mono',monospace;color:#c0caf5;margin-bottom:20px;">05:00</div>
                    <div style="display:flex;gap:10px;">
                        <button id="timer-start" onclick="window.myanos._timerToggle()" style="padding:10px 24px;background:rgba(158,206,106,0.15);border:1px solid rgba(158,206,106,0.3);border-radius:8px;color:#9ece6a;font-size:14px;cursor:pointer;">▶ Start</button>
                        <button onclick="window.myanos._timerReset()" style="padding:10px 24px;background:rgba(247,118,142,0.15);border:1px solid rgba(247,118,142,0.3);border-radius:8px;color:#f7768e;font-size:14px;cursor:pointer;">↺ Reset</button>
                    </div>
                </div>`;
            } else if (tool === 'color') {
                c.innerHTML = `<div style="padding:20px;">
                    <div style="display:flex;gap:20px;">
                        <div>
                            <canvas id="color-canvas" width="200" height="200" style="border-radius:8px;cursor:crosshair;border:1px solid rgba(255,255,255,0.06);"></canvas>
                            <div style="margin-top:8px;height:20px;border-radius:4px;" id="color-preview"></div>
                        </div>
                        <div style="flex:1;">
                            <div style="margin-bottom:10px;"><label style="color:#565f89;font-size:12px;">HEX</label><input id="color-hex" readonly style="width:100%;padding:8px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:6px;color:#c0caf5;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;"></div>
                            <div style="margin-bottom:10px;"><label style="color:#565f89;font-size:12px;">RGB</label><input id="color-rgb" readonly style="width:100%;padding:8px;background:rgba(0,0,0,0.3);border:1px solid rgba(255,255,255,0.06);border-radius:6px;color:#c0caf5;font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;"></div>
                            <button onclick="navigator.clipboard.writeText(document.getElementById('color-hex').value);window.myanos.notif.show('Color copied!','success',1500)" style="padding:8px 16px;background:rgba(122,162,247,0.15);border:1px solid rgba(122,162,247,0.3);border-radius:6px;color:#7aa2f7;font-size:12px;cursor:pointer;width:100%;">📋 Copy HEX</button>
                        </div>
                    </div>
                </div>`;
                setTimeout(() => self._initColorPicker(), 50);
            }
        };
        renderTool('calc');
        body.querySelectorAll('.tb-tab').forEach(t => t.addEventListener('click', () => renderTool(t.dataset.tool)));
    }

    // ── Calculator Logic ──
    _calcVal = '0'; _calcOp = ''; _calcPrev = 0; _calcReset = false;
    _calcBtn(b) {
        const d = document.getElementById('calc-display');
        if (!d) return;
        if (b === 'C') { this._calcVal='0'; this._calcOp=''; this._calcPrev=0; this._calcReset=false; d.value='0'; return; }
        if (b === '⌫') { this._calcVal = this._calcVal.length>1 ? this._calcVal.slice(0,-1) : '0'; d.value=this._calcVal; return; }
        if (b === '±') { this._calcVal = String(-parseFloat(this._calcVal)); d.value=this._calcVal; return; }
        if (b === '%') { this._calcVal = String(parseFloat(this._calcVal)/100); d.value=this._calcVal; return; }
        if ('0123456789.'.includes(b)) {
            if (this._calcReset) { this._calcVal=''; this._calcReset=false; }
            if (b==='.' && this._calcVal.includes('.')) return;
            this._calcVal += b; d.value = this._calcVal;
            return;
        }
        if ('+-×÷'.includes(b)) {
            this._calcPrev = parseFloat(this._calcVal);
            this._calcOp = b; this._calcReset = true;
            return;
        }
        if (b === '=') {
            const cur = parseFloat(this._calcVal);
            let r = 0;
            if (this._calcOp === '+') r = this._calcPrev + cur;
            else if (this._calcOp === '−') r = this._calcPrev - cur;
            else if (this._calcOp === '×') r = this._calcPrev * cur;
            else if (this._calcOp === '÷') r = cur !== 0 ? this._calcPrev / cur : 'Error';
            this._calcVal = String(r); this._calcOp = ''; this._calcReset = true;
            d.value = this._calcVal;
        }
    }

    // ── Stopwatch Logic ──
    _swRunning = false; _swStart = 0; _swElapsed = 0; _swInterval = null; _swLaps = [];
    _swToggle() {
        const btn = document.getElementById('sw-start');
        if (this._swRunning) {
            clearInterval(this._swInterval); this._swElapsed += Date.now()-this._swStart; this._swRunning=false;
            if (btn) { btn.textContent='▶ Start'; btn.style.color='#9ece6a'; }
        } else {
            this._swStart=Date.now(); this._swRunning=true;
            this._swInterval = setInterval(() => {
                const t = this._swElapsed + (Date.now()-this._swStart);
                const ms = t%1000, s = Math.floor(t/1000)%60, m = Math.floor(t/60000)%60, h = Math.floor(t/3600000);
                const el = document.getElementById('sw-display');
                if (el) el.textContent = `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`;
            }, 10);
            if (btn) { btn.textContent='⏸ Pause'; btn.style.color='#e0af68'; }
        }
    }
    _swLap() {
        if (!this._swRunning) return;
        const t = this._swElapsed+(Date.now()-this._swStart);
        const ms=t%1000,s=Math.floor(t/1000)%60,m=Math.floor(t/60000)%60;
        this._swLaps.push(`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${String(ms).padStart(3,'0')}`);
        const el = document.getElementById('sw-laps');
        if (el) el.innerHTML = this._swLaps.map((l,i) => `<div style="padding:4px 8px;border-bottom:1px solid rgba(255,255,255,0.04);">Lap ${i+1}: ${l}</div>`).reverse().join('');
    }
    _swReset() {
        clearInterval(this._swInterval); this._swRunning=false; this._swElapsed=0; this._swLaps=[];
        const d=document.getElementById('sw-display'),b=document.getElementById('sw-start'),l=document.getElementById('sw-laps');
        if(d)d.textContent='00:00.000'; if(b){b.textContent='▶ Start';b.style.color='#9ece6a';} if(l)l.innerHTML='';
    }

    // ── Timer Logic ──
    _tmRunning=false; _tmInterval=null; _tmRemaining=0;
    _timerToggle() {
        const btn = document.getElementById('timer-start');
        if (this._tmRunning) {
            clearInterval(this._tmInterval); this._tmRunning=false;
            if(btn){btn.textContent='▶ Start';btn.style.color='#9ece6a';}
        } else {
            if (this._tmRemaining<=0) {
                const m=parseInt(document.getElementById('timer-min')?.value||5)*60;
                const s=parseInt(document.getElementById('timer-sec')?.value||0);
                this._tmRemaining=(m+s)*1000;
            }
            this._tmRunning=true;
            if(btn){btn.textContent='⏸ Pause';btn.style.color='#e0af68';}
            this._tmInterval = setInterval(() => {
                this._tmRemaining -= 100;
                if (this._tmRemaining<=0) {
                    clearInterval(this._tmInterval); this._tmRunning=false; this._tmRemaining=0;
                    if(btn){btn.textContent='▶ Start';btn.style.color='#9ece6a';}
                    this.notif.show('⏰ Timer done!','warning',5000);
                }
                const t=Math.max(0,this._tmRemaining),m=Math.floor(t/60000),s=Math.floor((t%60000)/1000);
                const el=document.getElementById('timer-display');
                if(el)el.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
            }, 100);
        }
    }
    _timerReset() {
        clearInterval(this._tmInterval); this._tmRunning=false; this._tmRemaining=0;
        const d=document.getElementById('timer-display'),b=document.getElementById('timer-start');
        const m=parseInt(document.getElementById('timer-min')?.value||5);
        const s=parseInt(document.getElementById('timer-sec')?.value||0);
        if(d)d.textContent=`${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
        if(b){b.textContent='▶ Start';b.style.color='#9ece6a';}
    }

    // ── Color Picker ──
    _initColorPicker() {
        const canvas = document.getElementById('color-canvas');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        for (let x=0; x<200; x++) { for (let y=0; y<200; y++) {
            const h=x/200*360, s=100, l=100-y/200*100;
            ctx.fillStyle=`hsl(${h},${s}%,${l}%)`; ctx.fillRect(x,y,1,1);
        }}
        const pick = (e) => {
            const r=canvas.getBoundingClientRect(), x=Math.round(e.clientX-r.left), y=Math.round(e.clientY-r.top);
            if(x<0||x>200||y<0||y>200)return;
            const px=ctx.getImageData(x,y,1,1).data;
            const hex='#'+[px[0],px[1],px[2]].map(v=>v.toString(16).padStart(2,'0')).join('');
            document.getElementById('color-hex').value=hex;
            document.getElementById('color-rgb').value=`rgb(${px[0]}, ${px[1]}, ${px[2]})`;
            document.getElementById('color-preview').style.background=hex;
        };
        canvas.addEventListener('click', pick);
        canvas.addEventListener('mousemove', pick);
        const px=ctx.getImageData(100,100,1,1).data;
        const ih='#'+[px[0],px[1],px[2]].map(v=>v.toString(16).padStart(2,'0')).join('');
        document.getElementById('color-hex').value=ih;
        document.getElementById('color-rgb').value=`rgb(${px[0]}, ${px[1]}, ${px[2]})`;
        document.getElementById('color-preview').style.background=ih;
    }

    renderAndroid(body) {
        body.innerHTML = `<div style="padding:20px;text-align:center;">
            <div style="font-size:48px;">📱</div>
            <h3 style="color:#c0caf5;margin:12px 0;">Android Layer</h3>
            <p style="color:#565f89;">Connect via: <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;">python3 myanos.py display android</code></p>
        </div>`;
    }
    renderPS2(body) {
        body.innerHTML = `<div style="padding:20px;text-align:center;">
            <div style="font-size:48px;">🎮</div>
            <h3 style="color:#c0caf5;margin:12px 0;">PS2 Emulation Layer</h3>
            <p style="color:#565f89;">Place .iso files in ~/PS2/ and run: <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;">python3 myanos.py ps2 list</code></p>
        </div>`;
    }
    renderMyanAi(body) {
        const self = this;
        body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;">
            <div style="padding:10px 14px;background:rgba(30,32,50,0.5);border-bottom:1px solid rgba(255,255,255,0.06);display:flex;align-items:center;gap:10px;">
                <span style="font-size:20px;">🤖</span>
                <div>
                    <div style="font-size:14px;color:#c0caf5;font-weight:600;">MyanAi — Myanmar AI Assistant</div>
                    <div style="font-size:11px;color:#565f89;">Powered by Qwen Myanmar Code (GGUF via Ollama)</div>
                </div>
                <div id="ai-status" style="margin-left:auto;padding:3px 10px;background:rgba(122,162,247,0.1);border-radius:10px;font-size:11px;color:#7aa2f7;">● Connected</div>
            </div>
            <div id="ai-chat" style="flex:1;overflow-y:auto;padding:14px;font-size:13px;line-height:1.6;"></div>
            <div style="padding:10px;border-top:1px solid rgba(255,255,255,0.06);display:flex;gap:8px;">
                <input id="ai-input" placeholder="Type a message... (Myanmar or English)" style="flex:1;padding:10px 14px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:8px;color:#c0caf5;font-size:13px;outline:none;" />
                <button id="ai-send" style="padding:10px 18px;background:rgba(122,162,247,0.15);border:1px solid rgba(122,162,247,0.3);border-radius:8px;color:#7aa2f7;font-size:13px;cursor:pointer;">Send</button>
            </div>
        </div>`;
        const chat = document.getElementById('ai-chat');
        const input = document.getElementById('ai-input');
        const sendBtn = document.getElementById('ai-send');
        let conversationHistory = [{role:'system',content:'You are MyanAi, a helpful Myanmar AI assistant. You can speak both Myanmar and English. Help users with coding, questions, and general assistance. Be friendly and concise.'}];

        const addMsg = (role, text) => {
            const div = document.createElement('div');
            div.style.cssText = `display:flex;gap:10px;margin-bottom:14px;${role==='user'?'flex-direction:row-reverse':''}`;
            const bubble = document.createElement('div');
            bubble.style.cssText = `max-width:75%;padding:10px 14px;border-radius:12px;font-size:13px;line-height:1.6;${role==='user'?'background:rgba(122,162,247,0.15);color:#c0caf5;border-bottom-right-radius:4px;':'background:rgba(255,255,255,0.05);color:#a9b1d6;border-bottom-left-radius:4px;'}`;
            bubble.textContent = text;
            const avatar = document.createElement('div');
            avatar.style.cssText = 'width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;';
            avatar.style.background = role==='user'?'rgba(122,162,247,0.2)':'rgba(187,154,247,0.2)';
            avatar.textContent = role==='user'?'👤':'🤖';
            div.appendChild(avatar); div.appendChild(bubble); chat.appendChild(div);
            chat.scrollTop = chat.scrollHeight;
        };

        addMsg('ai', 'မင်္ဂလာပါ! 🇲🇲\nမင်္ဂလာပါ Boss! MyanAi ကocom တင်ပါတယ်။ မြန်မာဘာသာနှင့် English နှစ်မျိုးလုံး ပြောနိုင်ပါတယ်။\n\nWhat can I help you with?');

        const sendMessage = async () => {
            const msg = input.value.trim();
            if (!msg) return;
            input.value = '';
            addMsg('user', msg);
            conversationHistory.push({role:'user',content:msg});
            const statusEl = document.getElementById('ai-status');
            if (statusEl) { statusEl.textContent='● Thinking...'; statusEl.style.color='#e0af68'; }

            try {
                const res = await fetch('http://localhost:11434/api/chat', {
                    method:'POST',
                    headers:{'Content-Type':'application/json'},
                    body: JSON.stringify({model:'qwen-myanmar-code',messages:conversationHistory,stream:false})
                });
                const data = await res.json();
                const reply = data?.message?.content || data?.response || 'Sorry, I could not generate a response.';
                addMsg('ai', reply);
                conversationHistory.push({role:'assistant',content:reply});
                if (statusEl) { statusEl.textContent='● Connected'; statusEl.style.color='#9ece6a'; }
            } catch(e) {
                addMsg('ai', '⚠️ Ollama server not running.\n\nTo set up:\n1. Install Ollama: curl -fsSL https://ollama.com/install.sh | sh\n2. Create model: ollama create myanmar -f Modelfile\n3. Start: ollama serve\n\nOr use the built-in response system below.\n\nHello! I am MyanAi. I can help with Myanmar programming and general questions. Please start Ollama for full AI capabilities.');
                if (statusEl) { statusEl.textContent='● Offline'; statusEl.style.color='#f7768e'; }
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        input.addEventListener('keydown', (e) => { if (e.key==='Enter') sendMessage(); });
        input.focus();
        // Check Ollama status
        fetch('http://localhost:11434/api/tags').then(r=>r.json()).then(d=>{
            const st=document.getElementById('ai-status');
            if(st){st.textContent=d?.models?.length?'● '+d.models.length+' model(s)':'● Ollama OK';st.style.color='#9ece6a';}
        }).catch(()=>{const st=document.getElementById('ai-status');if(st){st.textContent='● Offline';st.style.color='#f7768e';}});
    }

    renderBrowser(body) {
        body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;">
            <div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(30,32,50,0.5);border-bottom:1px solid rgba(255,255,255,0.06);">
                <button id="br-back" style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">←</button>
                <button id="br-fwd" style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">→</button>
                <button id="br-reload" style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">⟳</button>
                <button id="br-home" style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">🏠</button>
                <input id="br-url" type="text" value="https://github.com/meonnmi-ops/Myanos" style="flex:1;padding:6px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:16px;color:#a9b1d6;font-size:12px;outline:none;" />
            </div>
            <div id="br-bookmarks" style="display:flex;gap:4px;padding:4px 12px;background:rgba(30,32,50,0.3);border-bottom:1px solid rgba(255,255,255,0.04);font-size:11px;">
                <span class="br-bm" data-url="https://github.com/meonnmi-ops/Myanos" style="padding:3px 8px;background:rgba(255,255,255,0.04);border-radius:10px;color:#7aa2f7;cursor:pointer;">GitHub</span>
                <span class="br-bm" data-url="https://www.google.com" style="padding:3px 8px;background:rgba(255,255,255,0.04);border-radius:10px;color:#7aa2f7;cursor:pointer;">Google</span>
                <span class="br-bm" data-url="https://my.wikipedia.org" style="padding:3px 8px;background:rgba(255,255,255,0.04);border-radius:10px;color:#7aa2f7;cursor:pointer;">Wikipedia MM</span>
            </div>
            <div id="br-frame-container" style="flex:1;position:relative;">
                <iframe id="br-iframe" src="https://github.com/meonnmi-ops/Myanos" style="width:100%;height:100%;border:none;background:#fff;" sandbox="allow-same-origin allow-scripts allow-forms allow-popups"></iframe>
                <div id="br-error" style="display:none;position:absolute;inset:0;flex-direction:column;align-items:center;justify-content:center;background:rgba(26,27,46,0.95);color:#565f89;">
                    <div style="font-size:48px;margin-bottom:12px;">🔒</div>
                    <p style="font-size:14px;color:#f7768e;">This site can't be embedded</p>
                    <p style="font-size:12px;margin-top:4px;">X-Frame-Options prevents embedding</p>
                </div>
            </div>
        </div>`;
        const iframe = document.getElementById('br-iframe');
        const urlInput = document.getElementById('br-url');
        const errorEl = document.getElementById('br-error');
        const navigate = (url) => { if(!url.startsWith('http')) url='https://'+url; urlInput.value=url; iframe.src=url; errorEl.style.display='none'; };
        iframe.addEventListener('load', ()=>{ errorEl.style.display='none'; });
        iframe.addEventListener('error', ()=>{ errorEl.style.display='flex'; });
        document.getElementById('br-reload').onclick = ()=>{ iframe.src=iframe.src; };
        document.getElementById('br-home').onclick = ()=>{ navigate('https://github.com/meonnmi-ops/Myanos'); };
        urlInput.addEventListener('keydown', (e)=>{ if(e.key==='Enter') navigate(urlInput.value); });
        document.querySelectorAll('.br-bm').forEach(bm => bm.addEventListener('click', ()=>navigate(bm.dataset.url)));
    }

    // ── Lock Screen ──
    showLockScreen() {
        this._isLocked = true;
        const ls = document.getElementById('lock-screen');
        if (!ls) return;
        ls.style.display = 'flex';
        const updateTime = () => {
            const now = new Date();
            const timeEl = document.getElementById('lock-time');
            const dateEl = document.getElementById('lock-date');
            if (timeEl) timeEl.textContent = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
            if (dateEl) dateEl.textContent = now.toLocaleDateString('en-US', {weekday:'long', month:'long', day:'numeric'});
        };
        updateTime();
        this._lockInterval = setInterval(updateTime, 1000);
        const input = document.getElementById('lock-input');
        if (input) setTimeout(() => input.focus(), 200);
    }
    unlockScreen() {
        this._isLocked = false;
        const ls = document.getElementById('lock-screen');
        if (ls) ls.style.display = 'none';
        clearInterval(this._lockInterval);
    }

    _escapeHtml(text) {
        return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
}

// ── Initialize with Boot ──────────────────────────────────────────────
runBootSequence(() => {
    window.myanos = new MyanosDesktop();
});
