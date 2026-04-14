# 🐳 Docker Quick Reference

## Local Development with Docker

### Start Everything (1 Command)
```bash
docker-compose up --build
```

Then visit:
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

### Stop Everything
```bash
docker-compose down
```

---

## What Happens

```
docker-compose up --build
    ↓
1. Reads .env file for MongoDB credentials
2. Builds Docker image from Dockerfile
3. Starts container with Node.js backend on port 5000
4. Starts container with frontend on port 3000 (served by backend)
5. Both use your MongoDB Atlas cluster
```

---

## Current Setup

✅ Backend on port 5000  
✅ Frontend served from port 3000  
✅ MongoDB Atlas connection (from .env)  
✅ Health check enabled  
✅ Auto-restart on failure  

---

## Deploy to Cloud (Pick One)

### Render.com (Easiest, Free)
1. Push to GitHub
2. Go to https://render.com
3. Click "New Web Service"
4. Select your GitHub repo
5. Add environment variables from `.env`
6. Click "Deploy"

**Live URL**: `https://your-app-name.onrender.com`

### Railway.app (Very Easy, Free)
1. Push to GitHub
2. Go to https://railway.app
3. Create new project from GitHub
4. Add same env variables
5. Deploy (auto on every push)

### Azure/AWS/DigitalOcean (Advanced)
See `DOCKER_DEPLOYMENT.md` for detailed instructions

---

## Debugging

```bash
# View logs
docker-compose logs -f backend

# Access container shell
docker-compose exec backend sh

# Check which containers are running
docker-compose ps

# Restart just the backend
docker-compose restart backend
```

---

## Common Problems

| Problem | Solution |
|---------|----------|
| Port 5000 already in use | `docker-compose down` then try again |
| Can't connect to MongoDB | Check MONGO_URI in .env |
| Image build fails | Delete containers: `docker-compose down -v` |
| "Connection refused" on localhost:3000 | Wait 5-10 seconds for container to start |

---

For full details, see `DOCKER_DEPLOYMENT.md`
