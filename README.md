# CloudChat

CloudChat is a cloud-ready group chat system for teams and distributed users who need a single place for fast, real-time communication across devices. The project is designed around a shared chat room model so members can create or join rooms, exchange messages instantly, and review past conversation history from laptops, phones, or other connected clients.

## Project Goals

- Create and join chat rooms
- Support real-time messaging
- Persist and view past messages
- Allow multiple users to communicate simultaneously
- Prepare the app for container-based deployment and basic cloud scalability

## Chosen Stack

I recommend the following stack for this project:

- Backend: Node.js with Express
- Real-time communication: Socket.IO over WebSockets
- Database: MongoDB
- Containerization: Docker and Docker Compose
- Client: Vanilla HTML, CSS, and JavaScript
- Deployment: Cloud VM such as AWS EC2 or Google Compute Engine

This stack keeps the system simple to build, easy to run locally, and a good fit for real-time messaging with document-based message storage.

## Frontend

The current frontend is a simple browser-based chat interface in [frontend/index.html](frontend/index.html) with matching styles and logic in [frontend/styles.css](frontend/styles.css) and [frontend/app.js](frontend/app.js). It supports:

- Creating and deleting chat groups
- Sending and deleting messages
- Switching between rooms
- Persisting the chat state in browser localStorage for a working demo experience

Open the frontend file directly in a browser, or serve the folder with any static file server.

## Methodology

1. Design the chat system around three main parts: client, server, and database.
2. Build the backend server for room and message handling.
3. Use WebSockets for real-time updates between connected users.
4. Store chat rooms and message history in MongoDB.
5. Containerize the application with Docker for repeatable deployment.
6. Test with multiple users and deploy to a cloud VM.

## Repository Structure

```text
CloudChat/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── controllers/
│   │   ├── models/
│   │   ├── routes/
│   │   ├── sockets/
│   │   ├── app.js
│   │   └── server.js
│   ├── tests/
│   └── package.json
├── frontend/
│   ├── index.html
│   ├── styles.css
│   └── app.js
├── docs/
├── Dockerfile
├── docker-compose.yml
└── README.md
```

## Architecture Notes

- The backend exposes REST endpoints for room and message history operations.
- Socket events handle live message delivery.
- MongoDB stores chat rooms and message records.
- Docker Compose starts the API and a local MongoDB instance for development.

## Next Steps

- Add a frontend client for room browsing and chat UI.
- Implement message persistence in the controllers.
- Add authentication if the chat should be restricted to known users.
- Add automated tests for room and message flows.