# Kitcho AI - iPhone Testing Guide

## 🎯 Goal
Get Kitcho AI running on your iPhone for a week of real-world testing.

---

## ✅ **Option 1: Expo Go (Fastest - 5 min setup)**

**Pros**: No build needed, instant updates
**Cons**: Requires Mac and iPhone on same WiFi, backend must be accessible

### Setup Steps:

1. **Install Expo Go on iPhone**
   - Open App Store
   - Search "Expo Go"
   - Install the official Expo Go app

2. **Start the Frontend** (on your Mac)
   ```bash
   cd /Users/tommypritchett/MyMobileApp/ChefMate/frontend
   npx expo start --clear
   ```

3. **Start the Backend** (on your Mac)
   ```bash
   cd /Users/tommypritchett/MyMobileApp/ChefMate/backend
   npm run dev
   ```

4. **Connect iPhone**
   - Open Expo Go app on iPhone
   - Tap "Scan QR code"
   - Scan the QR code from your terminal
   - App will load on your phone!

5. **Make Backend Accessible**

   The frontend needs to reach your backend. Two options:

   **A) Same WiFi (Simplest)**
   - Get your Mac's local IP: `ifconfig | grep "inet " | grep -v 127.0.0.1`
   - Update `frontend/src/services/api.ts`:
     ```typescript
     const API_URL = 'http://YOUR_MAC_IP:3001/api';
     // Example: 'http://192.168.1.100:3001/api'
     ```

   **B) Use ngrok (Works anywhere)**
   ```bash
   # Install ngrok
   brew install ngrok

   # Expose backend
   ngrok http 3001

   # Update frontend/src/services/api.ts with ngrok URL
   # const API_URL = 'https://abc123.ngrok.io/api';
   ```

---

## 🏗️ **Option 2: Development Build (Best for full testing)**

**Pros**: Standalone app, works offline, all features
**Cons**: Takes 15-20 min to build

### Setup Steps:

1. **Install EAS CLI**
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**
   ```bash
   eas login
   # Or create account: eas register
   ```

3. **Configure EAS**
   ```bash
   cd /Users/tommypritchett/MyMobileApp/ChefMate/frontend
   eas build:configure
   ```

4. **Update API URL for Production**

   Create `frontend/.env.production`:
   ```
   EXPO_PUBLIC_API_URL=https://your-backend-url.com/api
   ```

   Or use ngrok for testing:
   ```
   EXPO_PUBLIC_API_URL=https://abc123.ngrok.io/api
   ```

5. **Build for iOS**
   ```bash
   eas build --platform ios --profile development
   ```

   This will:
   - Build the app in the cloud (15-20 min)
   - Provide a download link
   - You can install via QR code or download link

6. **Install on iPhone**
   - Scan QR code from build output
   - Or go to the Expo dashboard link
   - Tap "Install" on your iPhone

---

## 📱 **Option 3: TestFlight (Production-like testing)**

**Pros**: Most realistic, sharable with others
**Cons**: Requires Apple Developer Account ($99/year), longer setup

### Prerequisites:
- Apple Developer Account ($99/year)
- App Store Connect access

### Steps:

1. **Create App Bundle Identifier**
   - Go to developer.apple.com
   - Create identifier: `com.yourname.kitchoai`

2. **Update app.json**
   ```json
   {
     "expo": {
       "ios": {
         "bundleIdentifier": "com.yourname.kitchoai"
       }
     }
   }
   ```

3. **Build for TestFlight**
   ```bash
   eas build --platform ios --profile production
   ```

4. **Submit to TestFlight**
   ```bash
   eas submit --platform ios
   ```

5. **Invite Yourself as Tester**
   - Go to App Store Connect
   - TestFlight → Internal Testing
   - Add yourself as tester
   - Install from TestFlight app on iPhone

---

## 🔧 **Backend Options for Testing**

### Option A: Keep Running on Mac
```bash
# Terminal 1
cd backend
npm run dev

# Terminal 2 - Expose with ngrok
ngrok http 3001
```

**Pros**: Easy, no deployment
**Cons**: Mac must stay on and connected

---

### Option B: Deploy Backend to Railway/Render
```bash
# 1. Push to GitHub
git add .
git commit -m "Prepare for deployment"
git push

# 2. Go to railway.app or render.com
# 3. Connect GitHub repo
# 4. Deploy backend folder
# 5. Get production URL
# 6. Update frontend API_URL
```

**Pros**: Backend always accessible
**Cons**: May need to set up production database

---

## 📋 **Recommended Setup for 1-Week Testing**

**For minimal setup (Today):**
1. ✅ Use **Expo Go** (Option 1)
2. ✅ Keep backend on Mac with **ngrok**
3. ✅ Test on same WiFi network

**For serious testing (This week):**
1. ✅ Create **Development Build** (Option 2)
2. ✅ Deploy backend to **Railway** (free tier)
3. ✅ Update database to PostgreSQL on Railway
4. ✅ Test anywhere, anytime

**For production-ready (Future):**
1. ✅ Build for **TestFlight** (Option 3)
2. ✅ Deploy backend to production
3. ✅ Share with beta testers

---

## 🚨 **Important Checklist**

Before testing on iPhone:

- [ ] Backend running and accessible
- [ ] Frontend API_URL points to correct backend
- [ ] Database has recipes seeded (100 recipes)
- [ ] Test registration works
- [ ] Test login works
- [ ] Test on Mac first via http://localhost:8081

---

## 🐛 **Troubleshooting**

**"Cannot connect to server"**
- Check backend is running: `curl http://localhost:3001/health`
- Check API_URL in `frontend/src/services/api.ts`
- If using ngrok, check tunnel is active: `ngrok http 3001`

**"Unable to load from Metro"**
- Clear cache: `npx expo start --clear`
- Check Mac and iPhone on same WiFi
- Check firewall isn't blocking port 8081

**"App crashes on launch"**
- Check Expo Go app is latest version
- Try clearing app data in Expo Go
- Rebuild with `npx expo start --clear`

---

## 📊 **What to Test During the Week**

- [ ] Daily meal logging (breakfast, lunch, dinner)
- [ ] Recipe searching and saving
- [ ] Grocery shopping list creation
- [ ] AI chat conversations
- [ ] Kroger price comparison
- [ ] Health goal tracking
- [ ] Meal plan calendar
- [ ] Inventory management
- [ ] Voice input for meals
- [ ] Photo upload for meals
- [ ] Offline functionality
- [ ] Battery usage
- [ ] App performance
- [ ] Notification timing

---

## 💡 **Pro Tips**

1. **Keep backend running**: Use `screen` or `tmux` to keep backend running even when terminal closes
2. **ngrok persistent domain**: Upgrade to ngrok paid ($8/mo) for static URL (no need to update frontend)
3. **Logging**: Check backend logs for API errors
4. **Screenshots**: Take screenshots of any bugs or UX issues
5. **Notes app**: Keep running list of improvements

---

## 🎉 **Ready to Start?**

Run these commands to start testing NOW:

```bash
# Terminal 1 - Backend
cd /Users/tommypritchett/MyMobileApp/ChefMate/backend
npm run dev

# Terminal 2 - Frontend
cd /Users/tommypritchett/MyMobileApp/ChefMate/frontend
npx expo start --clear

# Terminal 3 - Expose backend (if needed)
ngrok http 3001
```

Then:
1. Open Expo Go on iPhone
2. Scan QR code
3. Start testing! 🚀
