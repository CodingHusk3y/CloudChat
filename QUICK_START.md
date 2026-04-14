# 🚀 CloudChat - Complete MongoDB & Auth Setup

## ✅ What's Been Configured

Your CloudChat application now has:

- ✅ **MongoDB Atlas Integration** - Real database connection with Mongoose
- ✅ **User Authentication** - Sign up/Login with JWT tokens
- ✅ **Password Security** - Bcrypt hashing (12 salt rounds)
- ✅ **Protected Routes** - API endpoints require valid JWT token
- ✅ **Session Management** - Token stored in localStorage, persists across refreshes
- ✅ **Input Validation** - Server & client-side validation
- ✅ **Rate Limiting** - 20 auth attempts per 15 minutes
- ✅ **User Profile** - Display username and email in the app

## 📋 Quick Start (5 Minutes)

### 1. Create MongoDB Atlas Cluster

```bash
# Visit https://www.mongodb.com/products/platform/atlas
# 1. Create free account
# 2. Create new project
# 3. Build a cluster (choose "Shared" tier)
# 4. Wait ~5 minutes for cluster to provision
# 5. Click "Connect" → "Drivers" → Copy connection string
```

**Connection string looks like:**
```
mongodb+srv://username:password@cluster.mongodb.net/database
```

### 2. Configure Environment (.env)

```bash
# In project root, create .env file:
cp .env.example .env

# Edit .env and fill in:
MONGO_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/cloudchat?retryWrites=true&w=majority
JWT_SECRET=your-secret-key-35-chars-or-longer-change-this
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

### 3. Install & Start Backend

```bash
cd backend
npm install
cd ..

# Terminal 1: Start backend
cd backend
npm run dev
# Should show: ✅ MongoDB connected: your-cluster.mongodb.net
```

### 4. Start Frontend

```bash
# Terminal 2: Start frontend (if using live server or similar)
# Open http://localhost:3000/auth.html in browser
```

## 🔐 Authentication Flow

### First Time User: Sign Up
1. Go to `http://localhost:3000/auth.html`
2. Click "Sign Up" tab
3. Fill in:
   - **Username**: 3-30 chars (letters, numbers, dash, underscore)
   - **Email**: Any format (check not required, e.g., "test@example.com")
   - **Password**: Min 8 chars, must have uppercase + number
4. Submit → Auto-login → Redirected to main app

### Returning User: Sign In
1. Go to `http://localhost:3000/auth.html`
2. Click "Sign In" tab
3. Enter email & password
4. Auto-login → Redirected to main app

### Inside Main App
- See username & email in left sidebar
- Click **Logout** to sign out
- Session persists on page refresh (token in localStorage)

## 📂 File Structure

```
frontend/
├── auth.html           # Login/Signup page (NEW)
├── auth.js             # Auth business logic (NEW)
├── auth-utils.js       # Helper utilities for app (NEW)
├── index.html          # Main chat app (UPDATED)
├── app.js              # Chat logic (UPDATED with auth)
└── styles.css

backend/
├── src/
│   ├── config/db.js              # MongoDB connection
│   ├── models/User.js            # User schema with password hashing
│   ├── controllers/authController.js  # register, login, logout, getMe
│   ├── routes/authRoutes.js      # POST /api/auth/register, /login
│   ├── middleware/
│   │   ├── auth.js               # JWT verification
│   │   ├── validate.js           # Input validation
│   │   ├── errorHandler.js
│   │   └── upload.js
│   └── server.js                 # Express server with MongoDB connection
└── package.json

.env.example          # Environment template (NEW)
MONGODB_SETUP.md      # Full setup guide (NEW)
```

## 🔑 Key Endpoints

All requests should include JWT token:
```
Authorization: Bearer <your_jwt_token>
```

### Auth Endpoints
| Method | Path | Body | Response |
|--------|------|------|----------|
| POST | `/api/auth/register` | `{ username, email, password }` | `{ token, user }` |
| POST | `/api/auth/login` | `{ email, password }` | `{ token, user }` |
| POST | `/api/auth/logout` | - | `{ success: true }` |
| GET | `/api/auth/me` | - | `{ user }` |
| PATCH | `/api/auth/me` | `{ username?, avatar? }` | `{ user }` |

### Using in Frontend

```javascript
// Import helpers (already included in index.html)
// <script src="auth-utils.js"></script>

// Get current user
const user = AuthManager.getUser();
console.log(user.username, user.email);

// Get auth token
const token = AuthManager.getToken();

// Make API calls (auto includes token)
const response = await GroupAPI.getAll();

// Logout
await UserAPI.logout();
```

## 🛠️ Troubleshooting

### Problem: "MongoDB connection failed"
**Solution:**
- Check connection string in `.env` is correct
- Verify IP address is whitelisted in MongoDB Atlas:
  - Atlas → Network Access → IP Whitelist → Add IP (or 0.0.0.0/0 for all)

### Problem: "Invalid token" or "401 Unauthorized"
**Solution:**
- Token may have expired (set to 7 days)
- Delete localStorage and sign in again:
  ```js
  localStorage.clear();
  ```

### Problem: "Too many requests"
**Solution:**
- Rate limit hit (20 auth attempts per 15 mins)
- Wait 15 minutes before trying again

### Problem: CORS Error
**Solution:**
- Update `CLIENT_URL` in `.env` to match frontend domain
- Restart backend server

## 💡 Development Tips

### Local Testing Email
- Email doesn't need to be real
- Use any format: `test@example.com`, `user123@test.com`, etc.

### Generate Strong JWT Secret
```bash
# Run this in terminal to generate 32-char random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Clear All Data
```bash
# Delete all users from database (in MongoDB Atlas console):
# db.users.deleteMany({})
```

### Monitor Requests
- Frontend: Open DevTools → Network tab → See API calls
- Backend: Check console logs with timestamps

## 🔒 Security Checklist

- [x] Passwords hashed with bcrypt (12 rounds)
- [x] JWT token expires after 7 days
- [x] Input validation on both client & server
- [x] CORS configured
- [x] Rate limiting on auth endpoints
- [x] Password hidden in user model (`select: false`)
- [ ] **TODO (Production):** Use strong JWT_SECRET (see above)
- [ ] **TODO (Production):** Enable HTTPS
- [ ] **TODO (Production):** Whitelist specific IP in CORS

## 📚 Next Steps

1. **Test Auth Flow** - Sign up, login, logout, refresh page
2. **Create Groups** - Test group creation from main app
3. **Send Messages** - Test real-time messaging with Socket.io
4. **User Profile** - Update username, add avatar upload
5. **Deployment** - Docker, Heroku, or Azure App Service

## 📖 Resources

- [MongoDB Atlas Docs](https://docs.mongodb.com/atlas/)
- [Mongoose Guide](https://mongoosejs.com/)
- [JWT Explanation](https://jwt.io/introduction)
- [Bcrypt Security](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html)

## ❓ Questions?

Refer to `MONGODB_SETUP.md` for detailed setup instructions and API documentation.

---

**Created:** 2024  
**Status:** ✅ Ready for development and testing
