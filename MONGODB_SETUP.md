# CloudChat - MongoDB Atlas Setup & Authentication Guide

## 🚀 Quick Start

### Step 1: Get MongoDB Atlas Connection String

1. Go to [MongoDB Atlas](https://www.mongodb.com/products/platform/atlas)
2. Create a free account or log in
3. Create a new project and cluster
4. Once cluster is created, click **Connect**
5. Choose **Drivers** and select **Node.js**
6. Copy your connection string (it will look like):
```
mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority
```

### Step 2: Configure Environment Variables

1. In the project root, create a `.env` file (copy from `.env.example`):
```bash
cp .env.example .env
```

2. Edit `.env` and replace the placeholder:
```env
# Replace <username>, <password>, and <database> with your actual values
MONGO_URI=mongodb+srv://your_username:your_password@your_cluster.mongodb.net/cloudchat?retryWrites=true&w=majority

# Generate a secure JWT secret
JWT_SECRET=your-super-secret-key-at-least-32-characters-long-change-this
JWT_EXPIRES_IN=7d

PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:3000
```

### Step 3: Install Dependencies

```bash
cd backend
npm install
cd ..
```

### Step 4: Start the Backend Server

```bash
cd backend
npm run dev
```

You should see:
```
✅ MongoDB connected: your_cluster.mongodb.net
🚀 Server running on http://localhost:5000
```

### Step 5: Access the Application

- **Authentication Page**: http://localhost:3000/auth.html
- **Main Chat App**: http://localhost:3000/

## 🔐 Authentication Flow

### Sign Up
1. Go to `/auth.html`
2. Click "Sign Up" tab
3. Enter:
   - **Username** (3-30 characters, letters/numbers/dash/underscore)
   - **Email** (any valid email format, no real verification)
   - **Password** (min 8 chars, 1 uppercase, 1 number)
4. Submit and you'll be logged in automatically
5. Redirected to main app

### Login
1. Go to `/auth.html`
2. Click "Sign In" tab
3. Enter your email and password
4. You'll be logged in and redirected to main app

### Token Storage
- Auth token is stored in `localStorage` with key: `authToken`
- User data is stored with key: `user`
- Session persists across page refreshes
- Clear localStorage to log out (or use the logout API)

## 🛠️ Using in Your Main App

### 1. Protect Routes
Add this to your main `index.html` before other scripts:
```html
<script src="auth-utils.js"></script>
<script>
    // Redirect to login if not authenticated
    checkAuthentication();
</script>
```

### 2. Get Current User
```javascript
const user = AuthManager.getUser();
console.log(user.username, user.email);
```

### 3. Make API Calls
```javascript
// Get all groups
GroupAPI.getAll()
    .then(response => console.log(response.groups))
    .catch(error => console.error(error));

// Send a message
MessageAPI.send(groupId, {
    content: 'Hello everyone!',
    attachments: []
})
    .then(message => console.log('Message sent:', message))
    .catch(error => console.error(error));

// Logout
UserAPI.logout();
```

### 4. Add Authorization Headers
All API calls automatically include the JWT token:
```javascript
// This is automatically done by apiCall()
const headers = {
    'Authorization': `Bearer ${AuthManager.getToken()}`,
    'Content-Type': 'application/json'
};
```

## 📡 API Endpoints

### Authentication
- `POST /api/auth/register` - Create new user
- `POST /api/auth/login` - Sign in user
- `POST /api/auth/logout` - Sign out user
- `GET /api/auth/me` - Get current user (requires auth)
- `PATCH /api/auth/me` - Update user profile (requires auth)

### Groups
- `GET /api/groups` - Get all groups
- `POST /api/groups` - Create group (requires auth)
- `GET /api/groups/:id` - Get group details
- `PATCH /api/groups/:id` - Update group (requires auth)
- `DELETE /api/groups/:id` - Delete group (requires auth)
- `POST /api/groups/:id/join` - Join group (requires auth)
- `POST /api/groups/:id/leave` - Leave group (requires auth)

### Messages
- `GET /api/groups/:groupId/messages` - Get messages (requires auth)
- `POST /api/groups/:groupId/messages` - Send message (requires auth)
- `DELETE /api/groups/:groupId/messages/:messageId` - Delete message (requires auth)

## 🔒 Security Features

✅ **Bcrypt Password Hashing** - Passwords are hashed with 12 salt rounds
✅ **JWT Authentication** - Stateless token-based auth
✅ **CORS Protection** - Configured for your frontend domain
✅ **Rate Limiting** - 20 attempts per 15 mins for auth endpoints
✅ **Input Validation** - Express-validator on server
✅ **Helmet.js** - HTTP header security
✅ **Password Requirements** - Min 8 chars, uppercase + number

## 🐛 Troubleshooting

### Connection Error: `ECONNREFUSED`
- Check if MongoDB Atlas cluster is up and running
- Verify IP address is whitelisted in Atlas security settings
- Check connection string for typos

### Auth Token Expired
- The token expires after 7 days (configurable)
- User will be automatically redirected to login
- New login generates a fresh token

### CORS Error
- Update `CLIENT_URL` in `.env` to match your frontend domain
- Default is `http://localhost:3000`

### Rate Limit Hit
- Too many login/signup attempts
- Wait 15 minutes before trying again

## 📦 Project Structure
```
backend/
├── src/
│   ├── config/db.js           # MongoDB connection
│   ├── models/User.js         # User schema with password hashing
│   ├── controllers/authController.js
│   ├── routes/authRoutes.js
│   ├── middleware/
│   │   ├── auth.js            # protect middleware
│   │   ├── validate.js        # input validation
│   │   └── errorHandler.js
│   └── server.js
└── package.json

frontend/
├── auth.html                   # Login/Signup page
├── auth.js                     # Auth logic
├── auth-utils.js              # Helper utilities
├── index.html                  # Main chat app
└── styles.css

.env.example                    # Environment template
```

## 🚀 Next Steps

1. **Database Backup** - Set up automatic backups in MongoDB Atlas
2. **Custom Domain** - Update `CLIENT_URL` for production
3. **JWT Secret** - Use a strong, random secret in production
4. **Rate Limiting** - Adjust limits based on your needs
5. **Error Logging** - Integrate with Sentry or similar service

## 📚 MongoDB Atlas Resources

- [MongoDB Atlas Quick Start](https://docs.mongodb.com/manual/tutorial/atlas-connection-string-setup/)
- [Connection String URI](https://docs.mongodb.com/manual/reference/connection-string/)
- [Security Best Practices](https://docs.mongodb.com/manual/security/)
- [Free Tier Limits](https://docs.mongodb.com/atlas/reference/free-tier-limitations/)

## 💡 Tips

- Always use environment variables for secrets
- Never commit `.env` file to version control
- Test auth flow before deploying
- Monitor MongoDB usage in Atlas dashboard
- Keep JWT secret secure and unique per environment
