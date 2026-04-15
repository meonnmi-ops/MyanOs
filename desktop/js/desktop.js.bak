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
        this.notif.show('Myanos v3.0.0 — Desktop ready', 'success', 3000);
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
            'myanmar-code': () => this.renderMyanmarCode(body),
            'pkg-manager': () => this.renderPackageManager(body),
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
            if (e.key==='Enter') { const cmd=input.value.trim(); input.disabled=true; if(cmd) await this._execTermCmd(term,cmd,winId); else this._addTermInput(term,winId); }
            if (e.key==='Tab') { e.preventDefault(); this._tabComplete(input); }
            if (e.key==='ArrowUp') { /* History would go here */ }
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

        const render = () => {
            const files = this.vfs.list(currentPath);
            const pathParts = currentPath.split('/').filter(Boolean);
            const breadcrumb = '<span style="cursor:pointer;color:#7aa2f7;" data-path="/">/</span>' +
                pathParts.map((part, i) => {
                    const p = '/' + pathParts.slice(0, i + 1).join('/');
                    return ` <span style="color:#565f89;">/</span> <span style="cursor:pointer;color:#a9b1d6;" data-path="${p}">${part}</span>`;
                }).join('');

            const gridHtml = files.length === 0
                ? '<div style="padding:60px;text-align:center;color:#565f89;font-size:14px;">📁 Empty folder<br><span style="font-size:12px;margin-top:8px;display:block;">Right-click to create files and folders</span></div>'
                : files.map(f => {
                    const icon = f.type === 'folder' ? '📁' : this._getFileIcon(f.path);
                    const name = this.vfs.basename(f.path);
                    const size = f.type === 'file' ? this.vfs.formatSize(new Blob([f.content || '']).size) : `${(f.children || []).length} items`;
                    return `<div class="fm-item" data-path="${f.path}" data-type="${f.type}">
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
                    <div class="fm-toolbar">
                        <button class="fm-nav-btn" id="fm-back-${winId}" style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">←</button>
                        <button class="fm-nav-btn" id="fm-up-${winId}" style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">↑</button>
                        <div class="fm-path" id="fm-path-${winId}">${breadcrumb}</div>
                        <button class="fm-nav-btn" id="fm-refresh-${winId}" style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">⟳</button>
                    </div>
                    <div class="fm-grid" id="fm-grid-${winId}">${gridHtml}</div>
                    <div class="fm-statusbar" id="fm-status-${winId}">${files.length} items | ${currentPath}</div>
                </div>
            </div>`;

            // Sidebar navigation
            body.querySelectorAll('.fm-sidebar-item').forEach(item => {
                item.addEventListener('click', () => {
                    currentPath = item.dataset.path;
                    render();
                });
            });

            // Breadcrumb navigation
            body.querySelectorAll('#fm-path-' + winId + ' span[data-path]').forEach(span => {
                span.addEventListener('click', () => {
                    currentPath = span.dataset.path;
                    render();
                });
            });

            // Navigation buttons
            document.getElementById(`fm-up-${winId}`).onclick = () => {
                if (currentPath !== '/') {
                    currentPath = this.vfs.parent(currentPath);
                    render();
                }
            };
            document.getElementById(`fm-back-${winId}`).onclick = () => {
                currentPath = '/Desktop';
                render();
            };
            document.getElementById(`fm-refresh-${winId}`).onclick = () => render();

            // File/Folder items - double click to open, right click for context
            body.querySelectorAll('.fm-item').forEach(item => {
                item.addEventListener('dblclick', () => {
                    const p = item.dataset.path;
                    const type = item.dataset.type;
                    if (type === 'folder') { currentPath = p; render(); }
                    else { this._openVfsFile(p); }
                });
                item.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectedVfsFile = item.dataset.path;
                    this._showFileContextMenu(e.clientX, e.clientY);
                });
            });
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
            <div class="settings-content" id="settings-content">
                <div class="settings-section"><h3>🖥️ Display Settings</h3>
                    <div class="settings-row"><label>Dark Mode</label><div class="toggle on" onclick="this.classList.toggle('on')"></div></div>
                    <div class="settings-row"><label>Blur Effects</label><div class="toggle on" onclick="this.classList.toggle('on')"></div></div>
                    <div class="settings-row"><label>Animations</label><div class="toggle on" onclick="this.classList.toggle('on')"></div></div>
                    <div class="settings-row"><label>Taskbar Position</label><span class="value">Bottom</span></div>
                    <div class="settings-row"><label>Font Size</label><span class="value">14px</span></div>
                </div>
            </div>
        </div>`;
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

    renderMyanmarCode(body) {
        body.innerHTML = `<div style="padding:20px;"><div style="text-align:center;margin-bottom:20px;"><div style="font-size:40px;">🇲🇲</div><h2 style="color:#c0caf5;">Myanmar Code v2.0.1</h2><p style="color:#565f89;font-size:13px;">မြန်မာဘာသာစကားဖြင့် ရေးသားနိုင်သော ပရိုဂရမ်းမင်းဘာသာစကား</p></div><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;"><h4 style="color:#7aa2f7;">Keywords: 127</h4><div style="font-size:12px;color:#a9b1d6;line-height:2;"><span style="color:#9ece6a;">ပုံနှိပ်</span> (print), <span style="color:#e0af68;">တိုက်</span> (if), <span style="color:#f7768e;">တိုက်ရွေး</span> (else), <span style="color:#bb9af7;">ပျက်</span> (break), <span style="color:#7dcfff;">ဆက်လုပ်</span> (continue), <span style="color:#ff9e64;">ခန့်</span> (return), <span style="color:#73daca;">လုပ်</span> (function)...</div></div><div style="margin-top:16px;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;"><h4 style="color:#9ece6a;">Example Code:</h4><pre style="color:#a9b1d6;font-size:12px;margin-top:8px;font-family:'JetBrains Mono',monospace;line-height:1.6;"><span style="color:#ff9e64;">လုပ်</span> <span style="color:#bb9af7;">အမျိုးအားဖြင့်</span>(အမှတ်):
    <span style="color:#e0af68;">တိုက်</span> အမှတ် < 10:
        <span style="color:#9ece6a;">ပုံနှိပ်</span>(<span style="color:#7dcfff;">"Number is small"</span>)
    <span style="color:#f7768e;">တိုက်ရွေး</span>:
        <span style="color:#9ece6a;">ပုံနှိပ်</span>(<span style="color:#7dcfff;">"Number is big"</span>)

<span style="color:#9ece6a;">ပုံနှိပ်</span>(<span style="color:#bb9af7;">အမျိုးအားဖြင့်</span>(5))</pre></div></div>`;
    }

    renderPackageManager(body) {
        const packages = [
            { n:'myanmar-code', v:'2.0.1', ic:'🇲🇲', au:'MWD', inst:true },
            { n:'myanos-terminal', v:'1.0.0', ic:'⬛', au:'Meonnmi-ops', inst:true },
            { n:'myanos-display-engine', v:'1.0.0', ic:'🖥️', au:'Meonnmi-ops', inst:true },
            { n:'myanos-ps2-layer', v:'1.0.0', ic:'🎮', au:'Meonnmi-ops', inst:true },
            { n:'myanos-android-layer', v:'1.0.0', ic:'📱', au:'Meonnmi-ops', inst:true },
            { n:'myanos-toolbox', v:'1.0.0', ic:'🔧', au:'Meonnmi-ops', inst:true },
        ];
        body.innerHTML = `<div style="padding:20px;height:100%;overflow-y:auto;">
            <h3 style="color:#c0caf5;margin-bottom:16px;">📦 MyanPM — Package Manager</h3>
            <div style="margin-bottom:16px;padding:12px;background:rgba(122,162,247,0.08);border:1px solid rgba(122,162,247,0.15);border-radius:8px;">
                <div style="font-size:12px;color:#7aa2f7;">Run in terminal: <code style="background:rgba(0,0,0,0.3);padding:2px 8px;border-radius:4px;">myan install &lt;package&gt;</code></div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                ${packages.map(p => `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;">
                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
                        <span style="font-size:20px;">${p.ic}</span>
                        <div><div style="font-size:13px;color:#c0caf5;">${p.n}</div><div style="font-size:11px;color:#565f89;">${p.v}</div></div>
                    </div>
                    <div style="font-size:11px;color:#565f89;">${p.au}</div>
                    <div style="margin-top:6px;font-size:11px;color:${p.inst?'#9ece6a':'#565f89'}">${p.inst?'✅ Installed':'⬜ Available'}</div>
                </div>`).join('')}
            </div></div>`;
    }

    renderToolbox(body) {
        const tools = [
            { ic:'💾', name:'Storage', desc:'Manage disk space' },
            { ic:'🌐', name:'Network', desc:'Network tools' },
            { ic:'📊', name:'Monitor', desc:'System monitor' },
            { ic:'📱', name:'Flash', desc:'Firmware tools' },
            { ic:'🔐', name:'Security', desc:'Security settings' },
            { ic:'📜', name:'Logs', desc:'System logs' },
            { ic:'⚙️', name:'System', desc:'System config' },
            { ic:'📥', name:'Download', desc:'Download manager' },
            { ic:'🔍', name:'Search', desc:'File search' },
        ];
        body.innerHTML = `<div style="padding:20px;">
            <h3 style="color:#c0caf5;margin-bottom:16px;">🔧 Myanos Professional Toolbox</h3>
            <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">
                ${tools.map(t => `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px;text-align:center;cursor:pointer;transition:background 0.12s;" onmouseenter="this.style.background='rgba(122,162,247,0.1)'" onmouseleave="this.style.background='rgba(255,255,255,0.03)'">
                    <div style="font-size:28px;margin-bottom:6px;">${t.ic}</div>
                    <div style="font-size:13px;color:#c0caf5;">${t.name}</div>
                    <div style="font-size:11px;color:#565f89;margin-top:2px;">${t.desc}</div>
                </div>`).join('')}
            </div></div>`;
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
        body.innerHTML = `<div style="padding:20px;text-align:center;">
            <div style="font-size:48px;">🤖</div>
            <h3 style="color:#c0caf5;margin:12px 0;">MyanAi — AI Agent Builder</h3>
            <p style="color:#a9b1d6;">Low-Code AI Agent Builder</p>
            <code style="background:rgba(255,255,255,0.06);padding:8px 12px;border-radius:6px;color:#bb9af7;font-size:12px;">python3 myanai.py create --name "My Agent"</code>
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
            <div style="flex:1;display:flex;align-items:center;justify-content:center;color:#565f89;">
                <div style="text-align:center;">
                    <div style="font-size:48px;">🌐</div>
                    <p style="margin-top:8px;">Web Browser Frame</p>
                    <p style="font-size:12px;margin-top:4px;">Embed via iframe in production mode</p>
                </div>
            </div></div>`;
    }

    _escapeHtml(text) {
        return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
}

// ── Initialize with Boot ──────────────────────────────────────────────
runBootSequence(() => {
    window.myanos = new MyanosDesktop();
});
