# Agriculture Calculator - Backend Server

## 🚀 Quick Start

### **1. Install Dependencies**
```bash
cd agri-backend
npm install
```

### **2. Start Server (Development)**
```bash
npm run dev
```

You should see:
```
✅ Server running on: http://localhost:3000
📱 SMS Mode: Mock (Development/Testing)
```

### **3. Test It**
Open browser and visit: `http://localhost:3000`

You should see:
```json
{
  "message": "✅ Agriculture Calculator Backend is Running!",
  "version": "1.0.0"
}
```

---

## 🔑 SMS Configuration

### **Option A: Test Mode (Default - No Setup Needed)**
- OTP is logged to **terminal console**
- Returned in response for testing
- Perfect for development

```
📱 [MOCK SMS] OTP sent to +919876543210: 421837
```

### **Option B: Real SMS via Twilio**

**Step 1: Get Twilio Account**
1. Go to https://www.twilio.com/console
2. Sign up (free trial)
3. Copy credentials from dashboard

**Step 2: Update `.env` file**
```
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

**Step 3: Restart Server**
```bash
npm run dev
```

Server will now send **real SMS**:
```
✅ OTP sent via Twilio to +919876543210
```

---

## 📡 API Endpoints

### **GET /** - Health Check
Returns server status
```bash
curl http://localhost:3000
```

Response:
```json
{
  "message": "✅ Agriculture Calculator Backend is Running!",
  "version": "1.0.0",
  "endpoints": ["POST /api/send-otp", "GET /"]
}
```

### **POST /api/send-otp** - Send OTP
Sends OTP to mobile number

**Request:**
```bash
curl -X POST http://localhost:3000/api/send-otp \
  -H "Content-Type: application/json" \
  -d '{"phone":"9876543210","otp":"421837"}'
```

**Response (Mock Mode):**
```json
{
  "success": true,
  "messageId": "mock-1738591234567",
  "message": "OTP sent to +919876543210",
  "mock": true,
  "otp": "421837"
}
```

**Response (Twilio Mode):**
```json
{
  "success": true,
  "messageId": "SM1234567890abcdef",
  "message": "OTP sent to +919876543210"
}
```

**Error Response:**
```json
{
  "error": "Invalid phone number. Must be 10 digits."
}
```

---

## 🛠️ Troubleshooting

### **Problem: "Port 3000 already in use"**
```bash
# Find what's using port 3000
netstat -ano | findstr :3000

# Kill the process (Windows)
taskkill /PID <PID> /F

# Or use different port
PORT=3001 npm run dev
```

### **Problem: "nodemon: command not found"**
```bash
npm install -g nodemon
# OR
npm run dev
```

### **Problem: Dependencies not installed**
```bash
npm install
npm run dev
```

### **Problem: Can't connect from frontend**
1. Ensure backend is running on `http://localhost:3000`
2. Check `API_BASE_URL` in `login.js` matches
3. Check browser console for CORS errors
4. Verify firewall allows port 3000

---

## 📁 Project Structure
```
agri-backend/
├── server.js           # Main server
├── package.json        # Dependencies
├── .env                # Configuration (Twilio credentials)
├── .gitignore          # Git ignore file
└── README.md           # This file
```

---

## 🧪 Testing Checklist

- [ ] Server runs: `npm run dev`
- [ ] Health check works: `http://localhost:3000`
- [ ] OTP logged in terminal
- [ ] Frontend can reach backend
- [ ] Registration sends OTP ✅
- [ ] OTP verification works ✅

---

## 📊 Environment Variables

| Variable | Required | Example | Purpose |
|----------|----------|---------|---------|
| `PORT` | No | `3000` | Server port |
| `NODE_ENV` | No | `development` | Environment mode |
| `TWILIO_ACCOUNT_SID` | Optional | `ACxxxx...` | Twilio account ID |
| `TWILIO_AUTH_TOKEN` | Optional | `xxxx...` | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | Optional | `+1234567890` | Twilio phone number |

---

## 🚀 Production Deployment

### **Deploy to Heroku**
```bash
# Install Heroku CLI
npm install -g heroku

# Login
heroku login

# Create app
heroku create agri-calculator-api

# Set environment variables
heroku config:set TWILIO_ACCOUNT_SID=ACxxxx...
heroku config:set TWILIO_AUTH_TOKEN=xxxx...
heroku config:set TWILIO_PHONE_NUMBER=+1234567890

# Deploy
git push heroku main
```

### **Update Frontend URL**
In `login.js`:
```javascript
const API_BASE_URL = 'https://agri-calculator-api.herokuapp.com';
```

---

## ✅ Next Steps

1. Run `npm install` to install dependencies
2. Run `npm run dev` to start server
3. Test at `http://localhost:3000`
4. Update frontend to point to this backend
5. Try registration - OTP will appear in terminal!

---

**Need help?** Check the terminal output - errors are logged there!
