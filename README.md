# CloudChat

CloudChat is a deployed real-time group chat application with room-based conversations, live message delivery, and persisted chat history.

## Live Website

- Production URL: https://cloudchat-r8d7.onrender.com

Replace the URL above with your actual deployed website link.

## Deployment Overview

This project is deployed as a containerized Node.js application with horizontal scaling and load balancing.

### What is deployed

- Frontend static files served by the backend service
- REST API for authentication, groups, rooms, and messages
- Socket.IO server for real-time communication
- Redis-backed Socket.IO adapter for multi-instance event sync
- MongoDB as the persistent data store

### Deployment architecture

- Two backend containers run the same app image for redundancy and scale.
- Nginx is used as a reverse proxy/load balancer in front of the backend instances.
- Redis is used for cross-instance Socket.IO pub/sub so realtime events work across replicas.
- Environment variables configure service connections and allowed client origins.

### Relevant deployment files

- `Dockerfile` builds the application image.
- `docker-compose.yml` defines the multi-service deployment (backend replicas, nginx, redis).
- `nginx.conf` configures upstream routing and balancing behavior.

## Tech Stack

- Backend: Node.js + Express
- Real-time: Socket.IO
- Database: MongoDB
- Cache/Adapter: Redis
- Reverse Proxy: Nginx
- Containerization: Docker + Docker Compose
- Frontend: HTML, CSS, JavaScript

## Repository Structure

```text
CloudChat/
├── backend/
│   ├── src/
│   ├── tests/
│   └── package.json
├── frontend/
├── docs/
├── Dockerfile
├── docker-compose.yml
├── nginx.conf
└── README.md
```