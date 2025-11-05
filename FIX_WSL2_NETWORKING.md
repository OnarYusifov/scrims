# 🔧 Fix WSL2 Networking - Backend Not Accessible from Windows

## ❌ Problem: Backend works in WSL2 but Firefox can't connect

## ✅ Solution Options

---

## **Option 1: Restart Backend (Try First)**

The backend might not have picked up the `0.0.0.0` binding:

```bash
# In WSL2
cd /home/yunar/trayb-customs
# Stop backend (Ctrl+C)
npm run dev
```

Then try Firefox again: `http://localhost:3001/health`

---

## **Option 2: Use Windows Host IP**

If `localhost` doesn't work, use the Windows host IP:

**In Firefox, try:**
```
http://10.255.255.254:3001/health
```

**Update frontend `.env.local`:**
```bash
NEXT_PUBLIC_API_URL=http://10.255.255.254:3001
```

**Restart frontend:**
```bash
npm run dev
```

---

## **Option 3: Remove Windows Port Forwarding (If Active)**

**On Windows PowerShell (as Admin):**
```powershell
# Check if port forwarding is active
netsh interface portproxy show all

# Remove if exists
netsh interface portproxy delete v4tov4 listenport=3001 listenaddress=0.0.0.0
```

---

## **Option 4: Enable WSL2 Localhost Forwarding**

**On Windows PowerShell (as Admin):**
```powershell
# Enable WSL2 localhost forwarding (Windows 11)
wsl --shutdown
# Then restart WSL2
```

Or check Windows Feature:
- Windows Features → "Virtual Machine Platform" → Enable
- Windows Features → "Windows Subsystem for Linux" → Enable

---

## **Option 5: Use WSL2 IP Directly**

Find WSL2 IP:
```bash
# In WSL2
ip addr show eth0 | grep inet
```

Use that IP in Firefox (e.g., `http://172.18.128.2:3001/health`)

---

## 🎯 **Recommended: Try Options 1 & 2**

1. **Restart backend** (Option 1)
2. **If still doesn't work:** Use Windows host IP `10.255.255.254:3001` (Option 2)

---

## 🔍 **Verify Backend is Listening**

```bash
# In WSL2 - Should show 0.0.0.0:3001
ss -tuln | grep 3001
# or
netstat -tuln | grep 3001
```

If it shows `127.0.0.1:3001` instead of `0.0.0.0:3001`, backend needs restart.

