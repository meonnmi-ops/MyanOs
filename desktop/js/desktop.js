/* ═══════════════════════════════════════════════════════
   Myanos Desktop Environment v2.1.0
   Boot + VFS + Window Manager + Context Menu + Code Editor + Notepad
   ═══════════════════════════════════════════════════════ */

// ── Virtual File System (localStorage) ────────────────────────────────
class VFS {
    constructor() {
        this.STORAGE_KEY = 'myanos_vfs';
        this.CLIPBOARD_KEY = 'myanos_clipboard';
        this.load();
    }
    load() {
        try {
            const data = localStorage.getItem(this.STORAGE_KEY);
            this.files = data ? JSON.parse(data) : {};
        } catch { this.files = {}; }
        // Ensure Desktop folder
        if (!this.files['/Desktop']) this.files['/Desktop'] = { type:'folder', children:[], created: Date.now() };
    }
    save() {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.files));
    }
    resolve(path) {
        return path.replace(/\/+/g, '/').replace(/\/$/, '') || '/';
    }
    parent(path) {
        const p = this.resolve(path);
        const parts = p.split('/');
        parts.pop();
        return this.resolve(parts.join('/'));
    }
    basename(path) {
        const parts = this.resolve(path).split('/');
        return parts[parts.length - 1];
    }
    exists(path) { return !!this.files[this.resolve(path)]; }
    isDir(path) { const f = this.files[this.resolve(path)]; return f && f.type === 'folder'; }
    isFile(path) { const f = this.files[this.resolve(path)]; return f && f.type === 'file'; }
    createFile(path, content='') {
        const p = this.resolve(path);
        if (this.exists(p)) return false;
        this.files[p] = { type:'file', content, created: Date.now(), modified: Date.now() };
        // Add to parent folder
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
        if (!this.isFile(p)) return false;
        this.files[p].content = content;
        this.files[p].modified = Date.now();
        this.save();
        return true;
    }
    delete(path) {
        const p = this.resolve(path);
        if (!this.exists(p)) return false;
        // Remove from parent
        const parent = this.files[this.parent(p)];
        if (parent && parent.children) parent.children = parent.children.filter(c => c !== p);
        // Recursively delete children
        if (this.isDir(p)) {
            const f = this.files[p];
            if (f.children) {
                for (const child of [...f.children]) this.delete(child);
            }
        }
        delete this.files[p];
        this.save();
        return true;
    }
    list(path) {
        const p = this.resolve(path);
        const f = this.files[p];
        if (f && f.type === 'folder' && f.children) return f.children.map(c => ({ path: c, ...this.files[c] }));
        return [];
    }
    copy(src, dst) {
        const s = this.files[this.resolve(src)];
        if (!s) return false;
        this.files[this.resolve(dst)] = JSON.parse(JSON.stringify(s));
        this.files[this.resolve(dst)].created = Date.now();
        this.files[this.resolve(dst)].modified = Date.now();
        this.save();
        return true;
    }
    rename(oldPath, newPath) {
        oldPath = this.resolve(oldPath);
        newPath = this.resolve(newPath);
        if (!this.exists(oldPath) || this.exists(newPath)) return false;
        this.files[newPath] = this.files[oldPath];
        delete this.files[oldPath];
        // Update parent references
        const parent = this.files[this.parent(oldPath)];
        if (parent && parent.children) parent.children = parent.children.map(c => c === oldPath ? newPath : c);
        // Update children paths
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
    setClipboard(action, path) {
        localStorage.setItem(this.CLIPBOARD_KEY, JSON.stringify({ action, path, time: Date.now() }));
    }
    getClipboard() {
        try { return JSON.parse(localStorage.getItem(this.CLIPBOARD_KEY)); } catch { return null; }
    }
}

// ── Boot Sequence ────────────────────────────────────────────────────
function runBootSequence(callback) {
    const biosEl = document.getElementById('boot-bios');
    const grubEl = document.getElementById('boot-grub');
    const loadEl = document.getElementById('boot-loading');
    const fillEl = document.getElementById('loading-fill');
    const statusEl = document.getElementById('loading-status');

    // Phase 1: BIOS POST
    const biosText = `Myanos BIOS v2.1.0 — POST (Power On Self Test)

CPU: AMD64 Compatible Processor ......... OK
Memory Test: 8192 MB ...................... OK
Storage: VFS (Virtual File System) ....... OK
Display: Web Runtime ..................... OK
Network: Online .......................... OK
Security: Secure Boot ................... OK

Detecting boot device...
  HDD-0: Myanos OS v2.1.0 ............... Found

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

    // Phase 2: GRUB
    function showGrub() {
        biosEl.classList.remove('active');
        grubEl.classList.add('active');

        const grubItems = [
            '*Myanos Web OS v2.1.0',
            ' Myanos Web OS (Recovery Mode)',
            ' Myanos Web OS (Safe Mode)',
        ];
        const menu = document.getElementById('grub-menu');
        menu.innerHTML = grubItems.map((item, i) =>
            `<div class="grub-item${i === 0 ? ' selected' : ''}">${item}</div>`
        ).join('');

        // Auto-select after 2 seconds
        setTimeout(() => showLoading(), 2000);

        // Click to select
        menu.querySelectorAll('.grub-item').forEach((item, i) => {
            item.addEventListener('click', () => {
                menu.querySelectorAll('.grub-item').forEach(el => el.classList.remove('selected'));
                item.classList.add('selected');
                setTimeout(() => showLoading(), 500);
            });
        });
    }

    // Phase 3: Loading
    function showLoading() {
        grubEl.classList.remove('active');
        loadEl.classList.add('active');

        const steps = [
            [15, 'Loading kernel modules...'],
            [35, 'Starting MMR Shell v1.0.0...'],
            [55, 'Mounting virtual filesystem...'],
            [70, 'Loading Myan Package Manager...'],
            [85, 'Starting desktop environment...'],
            [95, 'Loading user preferences...'],
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
        }, 350);
    }
}

// ── Main Desktop Class ───────────────────────────────────────────────
class MyanosDesktop {
    constructor() {
        this.vfs = new VFS();
        this.windows = new Map();
        this.windowIdCounter = 0;
        this.activeWindowId = null;
        this.zIndexCounter = 100;
        this.dragState = null;
        this.resizeState = null;
        this.selectedVfsFile = null;
        this.clipboard = null; // {action:'copy'|'cut', path:string}

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
        this.renderDesktopIcons();
        this.renderTaskbar();
        this.setupStartMenu();
        this.setupContextMenu();
        this.setupEventListeners();
        this.startClock();
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
            el.innerHTML = `<div class="icon">${icon}</div><div class="label">${name}</div>`;
            el.addEventListener('dblclick', () => this._openVfsFile(f.path));
            el.addEventListener('click', (e) => {
                document.querySelectorAll('.desktop-icon').forEach(i => i.classList.remove('selected'));
                el.classList.add('selected');
                this.selectedVfsFile = f.path;
            });
            // File right-click
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
        };
        return icons[ext] || '📄';
    }

    _openVfsFile(path) {
        if (this.vfs.isDir(path)) {
            this.openApp('files');
            return;
        }
        const ext = path.split('.').pop().toLowerCase();
        if (['py','js','html','css','sh','json','md','myan'].includes(ext)) {
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
            const h = String(now.getHours()).padStart(2,'0');
            const m = String(now.getMinutes()).padStart(2,'0');
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
            el.addEventListener('click', () => { this.openApp(app.id); menu.classList.remove('open'); });
            container.appendChild(el);
        });
    }

    // ── Context Menus ──
    setupContextMenu() {
        const desktop = document.getElementById('desktop');
        if (!desktop) return;

        // Desktop right-click
        desktop.addEventListener('contextmenu', (e) => {
            if (e.target.closest('.desktop-icon') || e.target.closest('.myanos-window')) return;
            e.preventDefault();
            this._showDesktopContextMenu(e.clientX, e.clientY);
        });

        // Close all menus on click
        document.addEventListener('click', () => {
            document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('open'));
        });
    }

    _showDesktopContextMenu(x, y) {
        const menu = document.getElementById('context-menu');
        if (!menu) return;
        menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
        menu.style.top = Math.min(y, window.innerHeight - 350) + 'px';
        document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('open'));
        menu.classList.add('open');

        // Bind actions
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
                    case 'download-file': this.openApp('terminal'); break;
                    case 'refresh': this.renderDesktopIcons(); break;
                    case 'open-settings': this.openApp('settings'); break;
                    case 'about': this.openApp('neofetch'); break;
                }
            };
        });
    }

    _showFileContextMenu(x, y) {
        const menu = document.getElementById('file-context-menu');
        if (!menu) return;
        menu.style.left = Math.min(x, window.innerWidth - 220) + 'px';
        menu.style.top = Math.min(y, window.innerHeight - 280) + 'px';
        document.querySelectorAll('.context-menu').forEach(m => m.classList.remove('open'));
        menu.classList.add('open');

        menu.querySelectorAll('.ctx-item').forEach(item => {
            item.onclick = () => {
                const action = item.dataset.action;
                const path = this.selectedVfsFile;
                if (!path) return;
                switch(action) {
                    case 'open-file': this._openVfsFile(path); break;
                    case 'edit-file': this.openApp('code-editor', path); break;
                    case 'copy-file': this.clipboard = {action:'copy', path}; break;
                    case 'cut-file': this.clipboard = {action:'cut', path}; break;
                    case 'rename-file': this._promptRename(path); break;
                    case 'delete-file': this.vfs.delete(path); this.renderDesktopIcons(); break;
                    case 'file-properties': this._showProperties(path); break;
                }
            };
        });
    }

    // ── Input Dialog ──
    _showInputDialog(title, placeholder, callback) {
        const dialog = document.getElementById('input-dialog');
        const titleEl = document.getElementById('input-dialog-title');
        const input = document.getElementById('input-dialog-input');
        if (!dialog) return;
        titleEl.textContent = title;
        input.value = '';
        input.placeholder = placeholder;
        dialog.classList.add('open');
        setTimeout(() => input.focus(), 100);

        const okBtn = document.getElementById('input-dialog-ok');
        const cancelBtn = document.getElementById('input-dialog-cancel');

        const close = (val) => {
            dialog.classList.remove('open');
            okBtn.onclick = null;
            cancelBtn.onclick = null;
            input.onkeydown = null;
            if (val) callback(val);
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
        this._showInputDialog(title, placeholder, (name) => {
            if (!name) return;
            const path = '/Desktop/' + name;
            if (type === 'file') this.vfs.createFile(path, '');
            else this.vfs.createFolder(path);
            this.renderDesktopIcons();
        });
    }

    _promptRename(oldPath) {
        const oldName = this.vfs.basename(oldPath);
        this._showInputDialog('✏️ Rename', oldName, (newName) => {
            if (!newName || newName === oldName) return;
            const newPath = this.vfs.parent(oldPath) + '/' + newName;
            this.vfs.rename(oldPath, newPath);
            this.renderDesktopIcons();
        });
    }

    _doPaste() {
        const clip = this.clipboard;
        if (!clip) return;
        const name = this.vfs.basename(clip.path);
        const newPath = '/Desktop/' + name;
        if (clip.action === 'copy') {
            this.vfs.copy(clip.path, newPath);
        } else if (clip.action === 'cut') {
            this.vfs.copy(clip.path, newPath);
            this.vfs.delete(clip.path);
            this.clipboard = null;
        }
        this.renderDesktopIcons();
    }

    _showProperties(path) {
        const f = this.vfs.files[this.vfs.resolve(path)];
        if (!f) return;
        const name = this.vfs.basename(path);
        const type = f.type === 'folder' ? 'Folder' : 'File';
        const created = new Date(f.created).toLocaleString();
        const modified = new Date(f.modified).toLocaleString();
        const size = f.content ? (new Blob([f.content]).size) + ' bytes' : '-';
        alert(`${name}\nType: ${type}\nPath: ${path}\nSize: ${size}\nCreated: ${created}\nModified: ${modified}`);
    }

    // ── Window Management ──
    openApp(appId, arg) {
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

    // ── Terminal (Real API) ──
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
            term.innerHTML = `<div class="term-line" style="color:#f7768e;">⚠ MMR Shell API not available</div><div class="term-line" style="color:#565f89;">Run: python3 server.py (in myanos-build directory)</div><div class="term-line">&nbsp;</div>`;
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
        });
        term.addEventListener('click', () => input.focus());
    }

    async _execTermCmd(term, cmd, winId) {
        const out = document.createElement('div');
        out.className = 'term-line'; out.style.whiteSpace='pre-wrap'; out.style.fontFamily='"JetBrains Mono","Fira Code",monospace'; out.style.fontSize='13px'; out.style.lineHeight='1.4';
        const localCmds = { 'exit':() => { this.closeWindow(winId); return null; }, 'clear':() => { term.innerHTML=''; return '__CLEAR__'; } };
        if (cmd in localCmds) { const r=localCmds[cmd](); if(r==='__CLEAR__')return; if(r)out.textContent=r; if(out.textContent)term.appendChild(out); this._addTermInput(term,winId); return; }
        if (this._termApiMode) {
            try {
                const res = await fetch('/api/exec', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({cmd,session:winId}) });
                const data = await res.json();
                if (data.output==='__CLEAR__') { term.innerHTML=''; }
                else if (data.output==='exit') { this.closeWindow(winId); return; }
                else if (data.output) { out.innerHTML=this._renderAnsi(data.output); }
            } catch(e) { out.textContent=`[ERR] API error: ${e.message}`; out.style.color='#f7768e'; }
        } else { out.textContent='[API unavailable] Run: python3 server.py'; out.style.color='#f7768e'; }
        if (out.textContent||out.innerHTML) term.appendChild(out);
        this._addTermInput(term, winId);
    }

    _renderAnsi(text) {
        const colors = {'\\x1b[0;31m':'#f7768e','\\x1b[0;32m':'#9ece6a','\\x1b[1;33m':'#e0af68','\\x1b[0;34m':'#7aa2f7','\\x1b[0;35m':'#bb9af7','\\x1b[0;36m':'#7dcfff','\\x1b[1;37m':'#c0caf5','\\x1b[2m':'#565f89','\\x1b[1m':'','\\x1b[0m':'#a9b1d6'};
        let html=text;
        for(const[ansi,color]of Object.entries(colors)) html=html.split(ansi).join(`</span><span style="color:${color}">`);
        return `<span style="color:#a9b1d6">${html}</span>`;
    }

    _tabComplete(input) {
        const builtins=['help','clear','cd','pwd','ls','cat','mkdir','rm','cp','mv','echo','head','tail','grep','find','which','whoami','hostname','uname','date','neofetch','df','du','free','ps','kill','chmod','env','export','alias','history','wget','curl','python3','pip','git','npm','node','mmr','myan','mmc','exit'];
        const val=input.value.trim(); if(!val)return;
        const parts=val.split(/\s+/);
        if(parts.length===1){const m=builtins.filter(c=>c.startsWith(parts[0]));if(m.length===1)input.value=m[0]+' ';}
    }

    // ── Code Editor ──
    renderCodeEditor(body, winId, filePath) {
        let content = '';
        let filename = filePath ? this.vfs.basename(filePath) : 'untitled.py';
        if (filePath && this.vfs.isFile(filePath)) content = this.vfs.read(filePath) || '';

        body.innerHTML = `
        <div class="code-editor">
            <div class="code-editor-toolbar">
                <button class="ce-btn" id="ce-new-${winId}">📄 New</button>
                <button class="ce-btn" id="ce-open-${winId}">📂 Open</button>
                <button class="ce-btn" id="ce-save-${winId}">💾 Save</button>
                <div class="ce-filename" id="ce-filename-${winId}">${filename}</div>
                <button class="ce-btn ce-run" id="ce-run-${winId}">▶ Run</button>
            </div>
            <div class="code-editor-body">
                <div class="code-line-numbers" id="ce-lines-${winId}">1</div>
                <textarea class="code-textarea" id="ce-code-${winId}" spellcheck="false">${this._escapeHtml(content)}</textarea>
            </div>
        </div>`;

        const textarea = document.getElementById(`ce-code-${winId}`);
        const lineNums = document.getElementById(`ce-lines-${winId}`);

        const updateLines = () => {
            const lines = textarea.value.split('\n').length;
            lineNums.innerHTML = Array.from({length:lines},(_,i)=>i+1).join('\n');
        };
        textarea.addEventListener('input', updateLines);
        textarea.addEventListener('scroll', () => { lineNums.scrollTop = textarea.scrollTop; });
        textarea.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') { e.preventDefault(); const s=textarea.selectionStart; textarea.value=textarea.value.substring(0,s)+'    '+textarea.value.substring(textarea.selectionEnd); textarea.selectionStart=textarea.selectionEnd=s+4; updateLines(); }
        });
        updateLines();

        // Save
        document.getElementById(`ce-save-${winId}`).onclick = () => {
            const name = filename;
            const path = '/Desktop/' + name;
            if (this.vfs.exists(path)) this.vfs.write(path, textarea.value);
            else this.vfs.createFile(path, textarea.value);
            this.renderDesktopIcons();
            document.getElementById(`ce-filename-${winId}`).textContent = name;
            document.getElementById(`ce-filename-${winId}`).style.color = '#9ece6a';
            setTimeout(() => { document.getElementById(`ce-filename-${winId}`).style.color = '#7aa2f7'; }, 1000);
        };

        // Run (via terminal)
        document.getElementById(`ce-run-${winId}`).onclick = () => {
            // Save first
            const path = '/Desktop/' + filename;
            if (this.vfs.exists(path)) this.vfs.write(path, textarea.value);
            else this.vfs.createFile(path, textarea.value);
            this.renderDesktopIcons();
            // Open terminal and run
            this.openApp('terminal');
            // Could auto-send command via API but for now just open terminal
        };
    }

    // ── Notepad ──
    renderNotepad(body, winId, filePath) {
        let content = '';
        let filename = filePath ? this.vfs.basename(filePath) : 'untitled.txt';
        if (filePath && this.vfs.isFile(filePath)) content = this.vfs.read(filePath) || '';

        body.innerHTML = `
        <div class="notepad">
            <div class="notepad-toolbar">
                <button class="np-btn" id="np-new-${winId}">📄 New</button>
                <button class="np-btn" id="np-save-${winId}">💾 Save</button>
                <div class="np-filename" id="np-filename-${winId}">${filename}</div>
            </div>
            <div class="notepad-body">
                <textarea class="notepad-textarea" id="np-text-${winId}" placeholder="Type here..." spellcheck="false">${this._escapeHtml(content)}</textarea>
            </div>
            <div class="notepad-statusbar">
                <span id="np-count-${winId}">Lines: 1 | Chars: 0</span>
                <span>UTF-8 | Myanos Notepad</span>
            </div>
        </div>`;

        const textarea = document.getElementById(`np-text-${winId}`);
        const countEl = document.getElementById(`np-count-${winId}`);
        const updateCount = () => {
            const text = textarea.value;
            const lines = text.split('\n').length;
            countEl.textContent = `Lines: ${lines} | Chars: ${text.length}`;
        };
        textarea.addEventListener('input', updateCount);
        updateCount();

        document.getElementById(`np-save-${winId}`).onclick = () => {
            const path = '/Desktop/' + filename;
            if (this.vfs.exists(path)) this.vfs.write(path, textarea.value);
            else this.vfs.createFile(path, textarea.value);
            this.renderDesktopIcons();
        };
    }

    _escapeHtml(text) {
        return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ── Other App Renderers (kept from original) ──
    renderFileManager(body) {
        body.innerHTML = `<div class="app-filemanager"><div class="fm-sidebar"><div class="fm-sidebar-item active">📁 Home</div><div class="fm-sidebar-item">🖥️ Desktop</div><div class="fm-sidebar-item">📄 Documents</div><div class="fm-sidebar-item">⬇️ Downloads</div><div class="fm-sidebar-item">📦 myan-os</div></div><div style="flex:1;display:flex;flex-direction:column;"><div class="fm-toolbar"><button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">←</button><button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">→</button><div class="fm-path">/home/meonnmi</div></div><div class="fm-content"><div class="fm-grid">${this._renderVfsGrid()}</div></div></div></div>`;
    }

    _renderVfsGrid() {
        let html = '';
        const files = this.vfs.list('/Desktop');
        if (files.length === 0) html = '<div style="padding:40px;text-align:center;color:#565f89;">No files on desktop.<br>Right-click to create files.</div>';
        files.forEach(f => {
            const icon = f.type === 'folder' ? '📁' : this._getFileIcon(f.path);
            const name = this.vfs.basename(f.path);
            html += `<div class="fm-item"><div class="fm-icon">${icon}</div><div class="fm-name">${name}</div></div>`;
        });
        return html;
    }

    renderMonitor(body) {
        body.innerHTML = `<div class="app-monitor"><div class="monitor-card"><h4>⚡ CPU Usage</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-cpu" style="width:35%"></div></div><div class="monitor-stats"><span>35%</span><span>4 cores</span></div></div><div class="monitor-card"><h4>🧠 Memory Usage</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-mem" style="width:52%"></div></div><div class="monitor-stats"><span>4.2 GB / 8 GB</span><span>52%</span></div></div><div class="monitor-card"><h4>💾 Disk Usage</h4><div class="monitor-bar"><div class="monitor-bar-fill fill-disk" style="width:67%"></div></div><div class="monitor-stats"><span>134 GB / 200 GB</span><span>67%</span></div></div><div class="monitor-card"><h4>🌡️ Temperature</h4><div style="font-size:28px;text-align:center;padding:8px;color:#9ece6a;">42°C</div></div><div class="monitor-card"><h4>⏱️ Uptime</h4><div style="font-size:14px;text-align:center;padding:8px;color:#a9b1d6;">3h 42m</div></div></div>`;
        setTimeout(()=>{body.querySelectorAll('.monitor-bar-fill').forEach(b=>{const w=parseInt(b.style.width);b.style.width='0%';setTimeout(()=>b.style.width=w+'%',100);});},50);
    }

    renderSettings(body) {
        body.innerHTML = `<div class="app-settings"><div class="settings-sidebar"><div class="settings-item active">🖥️ Display</div><div class="settings-item">🎨 Appearance</div><div class="settings-item">🔊 Sound</div><div class="settings-item">📶 Network</div><div class="settings-item">🔒 Security</div><div class="settings-item">🌐 Language</div><div class="settings-item">📦 Packages</div><div class="settings-item">ℹ️ About</div></div><div class="settings-content"><div class="settings-section"><h3>🖥️ Display Settings</h3><div class="settings-row"><label>Dark Mode</label><div class="toggle on" onclick="this.classList.toggle('on')"></div></div><div class="settings-row"><label>Blur Effects</label><div class="toggle on" onclick="this.classList.toggle('on')"></div></div><div class="settings-row"><label>Animations</label><div class="toggle on" onclick="this.classList.toggle('on')"></div></div><div class="settings-row"><label>Taskbar Position</label><span class="value">Bottom</span></div><div class="settings-row"><label>Font Size</label><span class="value">14px</span></div></div></div></div>`;
    }

    renderNeofetch(body) {
        body.innerHTML = `<div class="app-neofetch"><pre class="logo">       ┌──────────────┐\n       │   Myanos OS   │\n       │  ████████████  │\n       │  █▀▀▀▀▀▀▀▀█  │\n       │  █ ▀▀▀▀▀▀ █  │\n       │    ▀▀▀▀▀▀    │\n       └──────────────┘</pre><div class="title">meonnmi@myanos</div><div style="color:#565f89;">──────────────────────────────────</div><div><span class="label">  OS:        </span><span class="info">Myanos Web OS v2.1.0</span></div><div><span class="label">  Shell:     </span><span class="info">MMR Shell v1.0.0</span></div><div><span class="label">  Desktop:   </span><span class="info">Myanos Desktop Environment</span></div><div><span class="label">  Theme:     </span><span class="info">Tokyo Night Dark</span></div><div><span class="label">  Packages:  </span><span class="info">.myan (MyanPM)</span></div><div><span class="label">  Language:  </span><span class="info">Myanmar Code (127 keywords)</span></div><div style="color:#565f89;">──────────────────────────────────</div><div class="highlight">  🇲🇲 Myanos Web OS — Myanmar's First Advanced Web OS</div></div>`;
    }

    renderMyanmarCode(body) {
        body.innerHTML = `<div style="padding:20px;"><div style="text-align:center;margin-bottom:20px;"><div style="font-size:40px;">🇲🇲</div><h2 style="color:#c0caf5;">Myanmar Code v2.0.1</h2><p style="color:#565f89;font-size:13px;">မြန်မာဘာသာစကားဖြင့် ရေးသားနိုင်သော ပရိုဂရမ်းမင်းဘာသာစကား</p></div><div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:16px;"><h4 style="color:#7aa2f7;">Keywords: 127</h4><div style="font-size:12px;color:#a9b1d6;line-height:2;"><span style="color:#9ece6a;">ပုံနှိပ်</span> (print), <span style="color:#e0af68;">တိုက်</span> (if), <span style="color:#f7768e;">တိုက်ရွေး</span> (else), <span style="color:#bb9af7;">ပျက်</span> (break), <span style="color:#7dcfff;">ဆက်လုပ်</span> (continue), <span style="color:#ff9e64;">ခန့်</span> (return), <span style="color:#73daca;">လုပ်</span> (function)...</div></div></div>`;
    }

    renderPackageManager(body) {
        body.innerHTML = `<div style="padding:20px;height:100%;overflow-y:auto;"><h3 style="color:#c0caf5;margin-bottom:16px;">📦 MyanPM — Package Manager</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${this._pkgCard('myanmar-code','2.0.1','🇲🇲','MWD',true)}${this._pkgCard('myanos-terminal','1.0.0','⬛','Meonnmi-ops',true)}${this._pkgCard('myanos-display-engine','1.0.0','🖥️','Meonnmi-ops',true)}${this._pkgCard('myanos-ps2-layer','1.0.0','🎮','Meonnmi-ops',true)}${this._pkgCard('myanos-android-layer','1.0.0','📱','Meonnmi-ops',true)}${this._pkgCard('myanos-toolbox','1.0.0','🔧','Meonnmi-ops',true)}</div></div>`;
    }

    _pkgCard(n,v,ic,au,inst) {
        return `<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:12px;"><div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><span style="font-size:20px;">${ic}</span><div><div style="font-size:13px;color:#c0caf5;">${n}</div><div style="font-size:11px;color:#565f89;">${v}</div></div></div><div style="font-size:11px;color:#565f89;">${au}</div><div style="margin-top:6px;font-size:11px;color:${inst?'#9ece6a':'#565f89'}">${inst?'✅ Installed':'⬜ Available'}</div></div>`;
    }

    renderToolbox(body) {
        body.innerHTML = `<div style="padding:20px;"><h3 style="color:#c0caf5;margin-bottom:16px;">🔧 Myanos Professional Toolbox</h3><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;">${['💾 Storage','🌐 Network','📊 Monitor','📱 Flash','🔐 Security','📜 Logs','⚙️ System','📥 Download','🔍 Search'].map(t=>`<div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:8px;padding:14px;text-align:center;cursor:pointer;"><div style="font-size:28px;margin-bottom:6px;">${t.split(' ')[0]}</div><div style="font-size:13px;color:#c0caf5;">${t.split(' ')[1]}</div></div>`).join('')}</div></div>`;
    }

    renderAndroid(body) { body.innerHTML = `<div style="padding:20px;text-align:center;"><div style="font-size:48px;">📱</div><h3 style="color:#c0caf5;margin:12px 0;">Android Layer</h3><p style="color:#565f89;">Connect via: <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;">python3 myanos.py display android</code></p></div>`; }
    renderPS2(body) { body.innerHTML = `<div style="padding:20px;text-align:center;"><div style="font-size:48px;">🎮</div><h3 style="color:#c0caf5;margin:12px 0;">PS2 Emulation Layer</h3><p style="color:#565f89;">Place .iso files in ~/PS2/ and run: <code style="background:rgba(255,255,255,0.06);padding:2px 6px;border-radius:3px;">python3 myanos.py ps2 list</code></p></div>`; }
    renderMyanAi(body) { body.innerHTML = `<div style="padding:20px;text-align:center;"><div style="font-size:48px;">🤖</div><h3 style="color:#c0caf5;margin:12px 0;">MyanAi — AI Agent Builder</h3><p style="color:#a9b1d6;">Low-Code AI Agent Builder</p><code style="background:rgba(255,255,255,0.06);padding:8px 12px;border-radius:6px;color:#bb9af7;font-size:12px;">python3 myanai.py create --name "My Agent"</code></div>`; }
    renderBrowser(body) { body.innerHTML = `<div style="display:flex;flex-direction:column;height:100%;"><div style="display:flex;align-items:center;gap:6px;padding:8px 12px;background:rgba(30,32,50,0.5);border-bottom:1px solid rgba(255,255,255,0.06);"><button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">←</button><button style="padding:4px 8px;background:rgba(255,255,255,0.06);border:none;color:#a9b1d6;border-radius:4px;cursor:pointer;">→</button><input type="text" value="https://github.com/meonnmi-ops/Myanos" style="flex:1;padding:6px 10px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.06);border-radius:16px;color:#a9b1d6;font-size:12px;outline:none;" /></div><div style="flex:1;display:flex;align-items:center;justify-content:center;color:#565f89;"><div style="text-align:center;"><div style="font-size:48px;">🌐</div><p>Web Browser Frame</p></div></div></div>`; }
}

// ── Initialize with Boot ──────────────────────────────────────────────
runBootSequence(() => {
    window.myanos = new MyanosDesktop();
});
