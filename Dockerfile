FROM node:20-alpine

WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm install

# Copy application files
COPY backend ./backend
COPY frontend ./frontend
COPY .env.example ./.env.example

# Install production dependencies only
RUN npm run build --prefix backend 2>/dev/null || true

# Expose ports
EXPOSE 5000

# Set working directory
WORKDIR /app/backend

# Start server
CMD ["npm", "start"]
