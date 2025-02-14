// app.js
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { connect } from 'mongoose';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import dotenv from 'dotenv'; // Added to handle environment variables
import Router from './routes/route.js';

dotenv.config(); // Load environment variables from .env file

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // Allow all origins (modify this in production)
  },
});

// Get the current directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to our router
app.use((req, res, next) => {
  req.io = io;
  next();
});

app.use('/', Router);

// Serve index.html for testing frontend (optional)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// MongoDB connection
(async () => {
  try {
    await connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/authentication');
    console.log('Database connected');
  } catch (error) {
    console.error('MongoDB connection failed:', error);
  }
})();

// SOCKET.IO IMPLEMENTATION
io.on('connection', (socket) => {
  console.log(`User Connected: ${socket.id}`);

  socket.on('joinRoom', (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });

  // Listen for friend request notifications
  socket.on('friendRequestSent', (receiverId) => {
    io.to(receiverId).emit('newFriendRequest');
  });

  // Listen for friend request acceptance notifications
  socket.on('friendRequestAccepted', (senderId) => {
    io.to(senderId).emit('friendRequestResponse');
  });

  socket.on('disconnect', () => {
    console.log(`User Disconnected: ${socket.id}`);
  });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on ${PORT}`);
});
