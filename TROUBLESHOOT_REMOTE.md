# 🔧 Troubleshooting Remote Access

## ❌ Problem: Friend can't access `http://10.255.255.254:3000`

### **Step 1: Find ALL Possible IPs**

Run these commands in WSL2:

```bash
# WSL2 Gateway IP (usually the correct one)
ip route show | grep default | awk '{print $3}'

# DNS Server IP (alternative)
cat /etc/resolv.conf | grep nameserver | awk '{print $2}'

# Windows hostname
hostname.exe
```

**Try these IPs:**
- `http://172.18.128.1:3000` (from ip route)
- `http://10.255.255.254:3000` (from resolv.conf)
- Your actual Windows IP (see Step 2)

---

### **Step 2: Find Your Windows IP Address**

**On Windows (PowerShell or CMD):**
```powershell
ipconfig
```

Look for:
- **Ethernet adapter:** `IPv4 Address: 192.168.x.x` or `10.x.x.x`
- **Wi-Fi adapter:** `IPv4 Address: 192.168.x.x` or `10.x.x.x`

**Use this IP** (not the WSL IPs)

---

### **Step 3: Windows Firewall - Add Rules**

**Option A: Quick Test (Temporarily Disable)**
1. Open Windows Defender Firewall
2. Click "Turn Windows Defender Firewall on or off"
3. Turn OFF for Private networks (temporarily)
4. Test if friend can access
5. **Turn it back ON** after testing

**Option B: Add Firewall Rules (Recommended)**

1. Open PowerShell as Administrator
2. Run:
```powershell
# Allow port 3000 (Frontend)
New-NetFirewallRule -DisplayName "WSL2 Frontend" -Direction Inbound -LocalPort 3000 -Protocol TCP -Action Allow

# Allow port 3001 (Backend)
New-NetFirewallRule -DisplayName "WSL2 Backend" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

Or manually:
1. Windows Defender Firewall → Advanced Settings
2. Inbound Rules → New Rule
3. Port → TCP → Specific ports: `3000, 3001`
4. Allow connection → All profiles → Name: "WSL2 Ports"

---

### **Step 4: Test from Your Windows Machine**

**On Windows (PowerShell):**
```powershell
# Test if servers are accessible from Windows
curl http://localhost:3000
curl http://localhost:3001/health
```

If this doesn't work, WSL2 port forwarding might be broken.

---

### **Step 5: Fix WSL2 Port Forwarding**

**On Windows (PowerShell as Admin):**
```powershell
# Forward port 3000 from WSL2 to Windows
netsh interface portproxy add v4tov4 listenport=3000 listenaddress=0.0.0.0 connectport=3000 connectaddress=172.18.128.1

# Forward port 3001 from WSL2 to Windows
netsh interface portproxy add v4tov4 listenport=3001 listenaddress=0.0.0.0 connectport=3001 connectaddress=172.18.128.1
```

**Check if forwarding works:**
```powershell
netsh interface portproxy show all
```

**If it still doesn't work, try connecting to WSL2 IP directly:**
- Find WSL2 IP: `ip addr show eth0 | grep inet`
- Use that IP instead

---

### **Step 6: Use Cursor Port Forwarding (Easiest Solution)**

This bypasses all firewall/networking issues:

1. **In Cursor:** Press `F1` → `Forward a Port`
2. Enter `3000` → Right-click → Copy Address
3. Enter `3001` → Right-click → Copy Address
4. Share the forwarded URLs with your friend
5. They'll look like: `https://xxx-xxx-xxx-xxx.vscode-ssh.cloud`

**Advantages:**
- ✅ Works through any firewall
- ✅ Works through NAT/VPN
- ✅ Secure HTTPS tunnel
- ✅ No configuration needed

---

### **Step 7: Alternative - Use ngrok (Tunnel Service)**

If nothing else works:

```bash
# Install ngrok (one-time)
# Download from https://ngrok.com/download

# Forward frontend
ngrok http 3000

# In another terminal, forward backend
ngrok http 3001
```

Share the ngrok URLs with your friend.

---

## ✅ **Quick Checklist**

- [ ] Servers are running (`npm run dev`)
- [ ] Servers listening on `0.0.0.0` (not `127.0.0.1`)
- [ ] Windows Firewall allows ports 3000, 3001
- [ ] Friend is on same network (or using port forwarding)
- [ ] Using correct IP address (Windows IP, not WSL IP)
- [ ] Tested from Windows machine first (`curl localhost:3000`)

---

## 🎯 **Recommended Solution**

**Use Cursor Port Forwarding** - It's the easiest and most reliable:
1. `F1` → `Forward a Port`
2. Forward `3000` and `3001`
3. Share the forwarded URLs
4. Done! ✅

