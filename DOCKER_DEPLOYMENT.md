# CloudChat - Docker Deployment Guide

## 🐳 Local Docker Deployment

### Prerequisites
- Docker installed ([download here](https://www.docker.com/products/docker-desktop))
- Your `.env` file configured with MongoDB Atlas connection

### Quick Start (3 Steps)

```bash
# 1. Make sure your .env file exists with MongoDB credentials
cat .env

# 2. Build and start containers
docker-compose up --build

# 3. Open browser
# Backend API: http://localhost:5000
# Frontend:   http://localhost:3000
```

---

## 📦 What Gets Deployed

```
Docker Container:
├── Node.js Backend (Port 5000)
│   ├── Express API
│   ├── Socket.io
│   └── MongoDB Atlas Connection
└── Frontend (Port 3000)
    ├── Auth pages (auth.html)
    └── Chat app (index.html)
```

---

## 🔧 Docker Commands

### Build and Start
```bash
# Build image and start container
docker-compose up --build

# Start in background (detached mode)
docker-compose up -d --build

# View logs
docker-compose logs -f backend

# Stop containers
docker-compose down

# Remove containers and volumes
docker-compose down -v
```

### Debug & Troubleshoot
```bash
# List running containers
docker-compose ps

# Access container shell
docker-compose exec backend sh

# View detailed logs
docker-compose logs backend --tail 100

# Restart container
docker-compose restart backend

# Stop and remove everything
docker-compose down --remove-orphans
```

---

## 🌐 Cloud Deployment

### Deploy to Render (Free)

1. **Push to GitHub**
```bash
git add .
git commit -m "Docker setup for deployment"
git push origin main
```

2. **Go to [Render.com](https://render.com)**
   - Create account → Click "New +" → "Web Service"
   - Connect GitHub repository
   - Configure:
     - **Name**: `cloudchat`
     - **Environment**: `Docker`
     - **Port**: `5000`
     - **Instance**: `Free` ($0/month)

3. **Add Environment Variables**
   - In Render dashboard, go to "Environment"
   - Add from your `.env`:
     ```
     MONGO_URI=mongodb+srv://username:password@cluster...
     JWT_SECRET=your-secret-key
     NODE_ENV=production
     CLIENT_URL=https://your-app-name.onrender.com
     ```

4. **Deploy**
   - Click "Create Web Service"
   - Live at: `https://your-app-name.onrender.com`

---

### Deploy to Railway (Recommended)

1. **Go to [Railway.app](https://railway.app)**
   - Create account → "Create New Project"
   - Select "Deploy from GitHub repo"
   - Connect your CloudChat repository

2. **Configure Build Settings**
   - Build command: `docker build .`
   - Start command: `npm start` (from backend)

3. **Add Environment Variables**
   - In Railway dashboard, click "Variables"
   - Add same variables from `.env`

4. **Deploy**
   - Railway auto-deploys on every push
   - Get public URL from Railway dashboard

---

### Deploy to Azure Container Instances

```bash
# Login to Azure
az login

# Create resource group
az group create --name cloudchat --location eastus

# Create container instance
az container create \
  --resource-group cloudchat \
  --name cloudchat-app \
  --image myregistry.azurecr.io/cloudchat:latest \
  --ports 5000 \
  --environment-variables \
    MONGO_URI="mongodb+srv://..." \
    JWT_SECRET="your-secret" \
  --restart-policy Always
```

---

## 🔒 Production Checklist

Before deploying to production:

- [ ] Generate secure JWT_SECRET (32+ random characters)
- [ ] Use strong MongoDB Atlas password
- [ ] Set `NODE_ENV=production`
- [ ] Update `CLIENT_URL` to production domain
- [ ] Enable HTTPS (most platforms do this automatically)
- [ ] Set up MongoDB Atlas whitelist for server IP
- [ ] Enable automatic backups in MongoDB Atlas
- [ ] Add error tracking (Sentry, LogRocket)
- [ ] Set up monitoring and alerts

---

## 📊 Monitoring

### View Container Stats
```bash
docker stats
```

### Check Health Status
```bash
docker-compose ps
```

Look for `STATUS: Up (healthy)` for backend container.

---

## 🆘 Common Issues

### Port Already in Use
```bash
# Kill process on port 5000
lsof -i :5000
kill -9 <PID>

# Or use different port
docker run -p 5001:5000 ...
```

### MongoDB Connection Failed
- Check `MONGO_URI` in `.env` or environment variables
- Verify MongoDB Atlas IP whitelist
- Test connection: `mongodb+srv://user:pass@cluster.mongodb.net/`

### Cannot Access Frontend
- Check if port 3000 is exposed
- Try `http://localhost:5000` (backend serves frontend)
- Check Docker logs: `docker-compose logs`

### Container Keeps Restarting
```bash
# View error logs
docker-compose logs backend

# Check if port is already in use
docker-compose down
docker-compose up --build
```

---

## 📈 Performance Tips

### Reduce Image Size
```bash
# Use alpine Linux versions
FROM node:20-alpine

# Add .dockerignore file
node_modules
.git
.env
```

### Cache Dependencies
```dockerfile
# Copy only package files first (better caching)
COPY backend/package*.json ./backend/
RUN cd backend && npm install --production

# Then copy application code
COPY backend ./backend
```

### Multi-stage Build (Advanced)
```dockerfile
# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY backend ./backend
COPY frontend ./frontend
CMD ["npm", "start"]
```

---

## 🔄 CI/CD Pipeline (GitHub Actions)

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Docker

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Build Docker image
        run: docker build -t cloudchat:latest .
      
      - name: Push to registry
        run: |
          docker tag cloudchat:latest ${{ secrets.DOCKER_REGISTRY }}/cloudchat:latest
          docker push ${{ secrets.DOCKER_REGISTRY }}/cloudchat:latest
      
      - name: Deploy
        run: echo "Deploy to production"
```

---

## 📚 Docker Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Reference](https://docs.docker.com/compose/compose-file/)
- [Best Practices](https://docs.docker.com/develop/dev-best-practices/)
- [Node.js Docker Examples](https://github.com/nodejs/examples/tree/main/dockerfile)

---

**Ready to deploy? Start with `docker-compose up --build` locally first!** 🚀
