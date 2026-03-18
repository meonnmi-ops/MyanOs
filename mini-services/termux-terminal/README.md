# MyanOS Termux Terminal Setup

## 📱 Android Termux မှာ Terminal Service Run ဖို့

### Step 1: Termux Install လုပ်ပါ
1. F-Droid ကနေ Termux install လုပ်ပါ (Play Store version မဟုတ်ပါ)
2. Termux ကိုဖွင့်ပါ

### Step 2: Required Packages Install လုပ်ပါ
```bash
pkg update
pkg install nodejs cloudflared
```

### Step 3: Terminal Service Download လုပ်ပါ
```bash
# Termux terminal service download
curl -o termux-terminal.js https://raw.githubusercontent.com/meonnmi-ops/MyanOs/main/mini-services/termux-terminal/termux-terminal.js
```

### Step 4: Terminal Service Start လုပ်ပါ
```bash
# Terminal service start
node termux-terminal.js
```

### Step 5: Cloudflare Tunnel Start လုပ်ပါ
Terminal အသစ်တစ်ခုဖွင့်ပြီး:
```bash
cloudflared tunnel --url http://localhost:3001
```

### Step 6: Tunnel URL ကို MyanOS မှာထည့်ပါ
1. MyanOS → Terminal App ဖွင့်ပါ
2. Settings (⚙️) icon ကို click ပါ
3. Cloudflare tunnel URL ကို paste လုပ်ပါ
   - Example: `https://density-analysis-places-whole.trycloudflare.com`
4. Save button နှိပ်ပါ

---

## 🔧 Termux မှာ Root Linux Run ဖို့ (Optional)

### proot-distro Install
```bash
pkg install proot-distro

# Ubuntu install
proot-distro install ubuntu

# Ubuntu ထဲဝင်ပါ
proot-distro login ubuntu

# Root user အဖြစ် login လုပ်ပါ
proot-distro login ubuntu --user root
```

### Auto-login Root အတွက်
```bash
# .bashrc မှာ ထည့်ပါ
echo 'proot-distro login ubuntu --user root' >> ~/.bashrc
```

---

## 📡 Tailscale နဲ့ Connect လုပ်ဖို့ (Alternative)

### Tailscale Install
```bash
pkg install tailscale
tailscaled &
tailscale up
```

### IP Address ကို MyanOS မှာထည့်ပါ
```
http://100.xxx.xxx.xxx:3001
```

---

## 🧪 Test Commands

Terminal service run ပြီးရင် browser မှာ test လုပ်ပါ:
```
https://your-tunnel.trycloudflare.com/
```

ဒီလိုမြင်ရမယ်:
```json
{
  "status": "online",
  "service": "MyanOS Termux Terminal",
  "version": "1.0.0",
  "platform": "Android/Termux"
}
```

---

## ⚠️ Troubleshooting

### "Connection refused"
- Terminal service run နေကြောင်း သေချာပါ
- `node termux-terminal.js` command run ထားပါ

### "Cloudflare tunnel expired"
- Tunnel အသစ်တစ်ခုပြန်ဆောက်ပါ
- `cloudflared tunnel --url http://localhost:3001`

### Commands အလုပ်မလုပ်
- Node.js version check လုပ်ပါ: `node --version`
- PATH check လုပ်ပါ: `echo $PATH`

---

Made with ❤️ for Myanmar 🇲🇲
