const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
// SendGrid removed - using simplified authentication
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Database setup
const db = new sqlite3.Database(process.env.DB_PATH || './database.db');

// Initialize database tables
db.serialize(() => {
  // Users table
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // OTP table removed - using simplified authentication

  // Rooms table
  db.run(`CREATE TABLE IF NOT EXISTS rooms (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    creator_id TEXT NOT NULL,
    admin_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users (id),
    FOREIGN KEY (admin_id) REFERENCES users (id)
  )`);

  // Room participants table
  db.run(`CREATE TABLE IF NOT EXISTS room_participants (
    room_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (room_id, user_id),
    FOREIGN KEY (room_id) REFERENCES rooms (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);

  // Votes table
  db.run(`CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    room_id TEXT NOT NULL,
    name TEXT NOT NULL,
    started_by TEXT NOT NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    revealed_at DATETIME,
    is_active BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (room_id) REFERENCES rooms (id),
    FOREIGN KEY (started_by) REFERENCES users (id)
  )`);

  // Vote responses table
  db.run(`CREATE TABLE IF NOT EXISTS vote_responses (
    vote_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    value TEXT NOT NULL,
    submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (vote_id, user_id),
    FOREIGN KEY (vote_id) REFERENCES votes (id),
    FOREIGN KEY (user_id) REFERENCES users (id)
  )`);
});

// SendGrid removed - using simplified authentication without email verification

// Helper functions
// OTP functionality removed - using simplified authentication

function generateRoomCode() {
  // Generate 3-digit room code (100-999)
  return Math.floor(100 + Math.random() * 900).toString();
}

// API Routes

// Create room
app.post('/api/rooms', (req, res) => {
  const { userId, roomName, userName, userEmail } = req.body;
  
  if (!userId || !roomName || !userName || !userEmail) {
    return res.status(400).json({ error: 'User ID, room name, user name, and email are required' });
  }

  const roomId = generateRoomCode();
  
  // First, ensure user exists in database
  db.run(
    'INSERT OR REPLACE INTO users (id, email, name) VALUES (?, ?, ?)',
    [userId, userEmail, userName],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Then create room
      db.run(
        'INSERT INTO rooms (id, name, creator_id, admin_id) VALUES (?, ?, ?, ?)',
        [roomId, roomName, userId, userId],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          // Add creator as participant
          db.run(
            'INSERT INTO room_participants (room_id, user_id) VALUES (?, ?)',
            [roomId, userId],
            (err) => {
              if (err) {
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Database error' });
              }

              res.json({
                message: 'Room created successfully',
                room: { id: roomId, name: roomName, adminId: userId }
              });
            }
          );
        }
      );
    }
  );
});

// Join room
app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { userId, userName, userEmail } = req.body;
  
  if (!userId || !userName || !userEmail) {
    return res.status(400).json({ error: 'User ID, name, and email are required' });
  }

  // First, ensure user exists in database
  db.run(
    'INSERT OR REPLACE INTO users (id, email, name) VALUES (?, ?, ?)',
    [userId, userEmail, userName],
    function(err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Check if room exists
      db.get('SELECT * FROM rooms WHERE id = ?', [roomId], (err, room) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!room) {
          return res.status(404).json({ error: 'Room not found' });
        }

        // Add user to room
        db.run(
          'INSERT OR IGNORE INTO room_participants (room_id, user_id) VALUES (?, ?)',
          [roomId, userId],
          function(err) {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }

            res.json({ message: 'Joined room successfully', room });
          }
        );
      });
    }
  );
});

// Get room details
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  
  db.get(`
    SELECT r.*, u.name as admin_name 
    FROM rooms r 
    JOIN users u ON r.admin_id = u.id 
    WHERE r.id = ?
  `, [roomId], (err, room) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Get participants
    db.all(`
      SELECT u.id, u.name, u.email, rp.joined_at
      FROM room_participants rp
      JOIN users u ON rp.user_id = u.id
      WHERE rp.room_id = ?
      ORDER BY rp.joined_at
    `, [roomId], (err, participants) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      // Get current active vote
      db.get(`
        SELECT v.*, u.name as started_by_name
        FROM votes v
        JOIN users u ON v.started_by = u.id
        WHERE v.room_id = ? AND v.is_active = 1
        ORDER BY v.started_at DESC
        LIMIT 1
      `, [roomId], (err, currentVote) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        let voteResponses = [];
        if (currentVote) {
          db.all(`
            SELECT vr.*, u.name as user_name
            FROM vote_responses vr
            JOIN users u ON vr.user_id = u.id
            WHERE vr.vote_id = ?
          `, [currentVote.id], (err, responses) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Database error' });
            }
            
            voteResponses = responses;
            res.json({
              room,
              participants,
              currentVote,
              voteResponses
            });
          });
        } else {
          res.json({
            room,
            participants,
            currentVote: null,
            voteResponses: []
          });
        }
      });
    });
  });
});

// OTP endpoints removed - using simplified authentication

// Socket.io connections
const activeUsers = new Map(); // socketId -> { userId, roomId, user }

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-room', ({ userId, roomId }) => {
    console.log(`User ${userId} joining room ${roomId}`);
    
    // Get user details
    db.get('SELECT * FROM users WHERE id = ?', [userId], (err, user) => {
      if (err || !user) {
        socket.emit('error', 'User not found');
        return;
      }

      socket.join(roomId);
      activeUsers.set(socket.id, { userId, roomId, user });
      
      // Broadcast user joined
      socket.to(roomId).emit('user-joined', user);
      
      // Send current room state
      socket.emit('room-joined', { roomId });
    });
  });

  socket.on('set-admin', ({ roomId, newAdminId, requesterId }) => {
    // Verify requester is current admin or creator
    db.get('SELECT * FROM rooms WHERE id = ? AND (admin_id = ? OR creator_id = ?)', 
      [roomId, requesterId, requesterId], (err, room) => {
      if (err || !room) {
        socket.emit('error', 'Not authorized to set admin');
        return;
      }

      // Update admin
      db.run('UPDATE rooms SET admin_id = ? WHERE id = ?', [newAdminId, roomId], (err) => {
        if (err) {
          socket.emit('error', 'Failed to update admin');
          return;
        }

        // Broadcast admin change
        io.to(roomId).emit('admin-changed', { newAdminId });
      });
    });
  });

  socket.on('start-vote', ({ roomId, voteName, adminId }) => {
    // Verify admin
    db.get('SELECT * FROM rooms WHERE id = ? AND admin_id = ?', [roomId, adminId], (err, room) => {
      if (err || !room) {
        socket.emit('error', 'Not authorized to start vote');
        return;
      }

      // End any active votes
      db.run('UPDATE votes SET is_active = 0 WHERE room_id = ? AND is_active = 1', [roomId], (err) => {
        if (err) {
          socket.emit('error', 'Database error');
          return;
        }

        // Create new vote
        const voteId = uuidv4();
        db.run(
          'INSERT INTO votes (id, room_id, name, started_by) VALUES (?, ?, ?, ?)',
          [voteId, roomId, voteName, adminId],
          (err) => {
            if (err) {
              socket.emit('error', 'Failed to create vote');
              return;
            }

            // Broadcast vote started
            io.to(roomId).emit('vote-started', {
              id: voteId,
              name: voteName,
              startedBy: adminId
            });
          }
        );
      });
    });
  });

  socket.on('submit-vote', ({ voteId, userId, value }) => {
    db.run(
      'INSERT OR REPLACE INTO vote_responses (vote_id, user_id, value) VALUES (?, ?, ?)',
      [voteId, userId, value],
      (err) => {
        if (err) {
          socket.emit('error', 'Failed to submit vote');
          return;
        }

        const userInfo = activeUsers.get(socket.id);
        if (userInfo) {
          // Broadcast vote submitted (without revealing the value)
          socket.to(userInfo.roomId).emit('vote-submitted', { userId });
        }
      }
    );
  });

  socket.on('reveal-votes', ({ voteId, adminId, roomId }) => {
    // Verify admin
    db.get('SELECT * FROM rooms WHERE id = ? AND admin_id = ?', [roomId, adminId], (err, room) => {
      if (err || !room) {
        socket.emit('error', 'Not authorized to reveal votes');
        return;
      }

      // Update vote as revealed
      db.run('UPDATE votes SET revealed_at = datetime("now") WHERE id = ?', [voteId], (err) => {
        if (err) {
          socket.emit('error', 'Database error');
          return;
        }

        // Get all vote responses
        db.all(`
          SELECT vr.*, u.name as user_name
          FROM vote_responses vr
          JOIN users u ON vr.user_id = u.id
          WHERE vr.vote_id = ?
        `, [voteId], (err, responses) => {
          if (err) {
            socket.emit('error', 'Database error');
            return;
          }

          // Broadcast votes revealed
          io.to(roomId).emit('votes-revealed', { voteId, responses });
        });
      });
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    const userInfo = activeUsers.get(socket.id);
    if (userInfo) {
      // Broadcast user left
      socket.to(userInfo.roomId).emit('user-left', userInfo.user);
      activeUsers.delete(socket.id);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 