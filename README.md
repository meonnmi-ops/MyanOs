<p align="center">
  <img src="https://img.shields.io/badge/MyanOS-1.0.0-emerald?style=for-the-badge&logo=linux&logoColor=white" alt="MyanOS Version"/>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js"/>
  <img src="https://img.shields.io/badge/TypeScript-5-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript"/>
  <img src="https://img.shields.io/badge/License-MIT-green?style=for-the-badge" alt="License"/>
</p>

<h1 align="center">🖥️ MyanOS</h1>
<h3 align="center">မြန်မာ့ ဝဘ် ကွန်ပျူတာစနစ်</h3>
<p align="center"><i>Web-based Operating System for Myanmar</i></p>

---

## 🌟 Features

### 🖥️ Desktop Environment
- **Window Management** - Drag, resize, minimize, maximize windows
- **Start Menu** - Quick access to all applications
- **Taskbar** - Clock, system tray, user menu
- **Desktop Icons** - Launch apps from desktop

### 📱 Applications

| App | Description | Status |
|-----|-------------|--------|
| 🖥️ **Terminal** | Real Linux command execution | ✅ Working |
| 🤖 **AI Agent** | AI-powered assistant using z-ai-web-dev-sdk | ✅ Working |
| 📱 **Phone Repair** | ADB tools for Android device management | ✅ Working |
| 🧮 **Calculator** | Standard calculator | ✅ Working |
| 📝 **Notepad** | Text editor with markdown support | ✅ Working |
| 📁 **File Manager** | Virtual file system browser | ✅ Working |
| ⚙️ **Settings** | System configuration | ✅ Working |
| 🗄️ **Database** | Database management (Admin only) | ✅ Working |

### 🔐 Authentication System
- **User Registration** - New users get 100 free AI credits
- **Admin Panel** - Full system control with AI assistant
- **Role-based Access** - Regular users have restricted access
- **Session Management** - Secure JWT-based authentication

### 🇲🇲 Myanmar Language Support
- Full UI translation in Myanmar language
- Switch between English and Myanmar

---

## 🚀 Quick Start

### Prerequisites

```bash
# Required
- Node.js 18+ or Bun
- npm or bun

# Optional (for Phone Repair)
- Android Tools (ADB)
```

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/myanos.git
cd myanos

# Install dependencies
bun install
# or
npm install

# Setup database
bun run db:push
# or
npm run db:push

# Start development server
bun run dev
# or
npm run dev
```

### Start Mini-Services (Optional)

```bash
# Terminal service (port 3001)
cd mini-services/terminal && bun run dev &

# Database service (port 3002)
cd mini-services/database && bun run dev &
```

---

## 🔑 Default Credentials

### Admin Login
```
Email: admin@myanos.local
Password: myanos-admin-2024
```

> ⚠️ **Important**: Change the admin password after first login!

---

## 📁 Project Structure

```
myanos/
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── api/                # API Routes
│   │   │   ├── ai/             # AI chat API
│   │   │   ├── auth/           # Authentication API
│   │   │   ├── terminal/       # Terminal API
│   │   │   └── admin/          # Admin API
│   │   └── page.tsx            # Main page
│   ├── components/
│   │   ├── myanos/             # MyanOS components
│   │   │   ├── apps/           # Application components
│   │   │   ├── Desktop.tsx     # Desktop icons
│   │   │   ├── Window.tsx      # Window management
│   │   │   ├── Taskbar.tsx     # Taskbar component
│   │   │   ├── AdminPanel.tsx  # Admin dashboard
│   │   │   └── AuthPage.tsx    # Login/Register
│   │   └── ui/                 # shadcn/ui components
│   ├── stores/                 # Zustand stores
│   │   ├── myanos-store.ts     # Main OS state
│   │   └── auth-store.ts       # Authentication state
│   └── lib/                    # Utilities
├── mini-services/              # Backend microservices
│   ├── terminal/               # Terminal execution service
│   └── database/               # Database service
├── prisma/                     # Database schema
└── public/                     # Static assets
```

---

## 🛠️ Technology Stack

| Category | Technology |
|----------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS 4 |
| **UI Components** | shadcn/ui |
| **State Management** | Zustand |
| **Database** | Prisma + SQLite |
| **Authentication** | JWT + bcrypt |
| **AI SDK** | z-ai-web-dev-sdk |
| **Icons** | Lucide React |

---

## 📱 Phone Repair Feature

Connect your Android device via USB:

1. **Enable USB Debugging** on your phone
   - Settings → About Phone → Tap Build Number 7 times
   - Settings → Developer Options → Enable USB Debugging

2. **Install ADB** (Android Debug Bridge)
   ```bash
   # Arch Linux
   sudo pacman -S android-tools
   
   # Ubuntu/Debian
   sudo apt install android-tools-adb
   
   # Fedora
   sudo dnf install android-tools
   ```

3. **Connect your phone** and authorize the connection

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```env
# Database
DATABASE_URL="file:./db/custom.db"

# JWT Secret
JWT_SECRET="your-secret-key-here"

# Admin Registration Key
MYANOS_ADMIN_KEY="your-admin-key-here"
```

### AI Configuration

The AI Agent uses z-ai-web-dev-sdk. Configure your API key in the Settings app.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - The React Framework
- [shadcn/ui](https://ui.shadcn.com/) - Beautiful UI Components
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [z-ai-web-dev-sdk](https://www.npmjs.com/package/z-ai-web-dev-sdk) - AI SDK
- [Lucide](https://lucide.dev/) - Beautiful Icons

---

<p align="center">
  Made with ❤️ for Myanmar 🇲🇲
</p>
