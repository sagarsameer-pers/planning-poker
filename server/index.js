const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const sgMail = require('@sendgrid/mail');
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

  // OTP table
  db.run(`CREATE TABLE IF NOT EXISTS otps (
    email TEXT PRIMARY KEY,
    otp TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

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

// SendGrid setup
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('SendGrid configured for email sending');
    console.log(`📧 From Email: ${process.env.FROM_EMAIL}`);
    console.log('⚠️  IMPORTANT: Ensure your sender email is verified in SendGrid dashboard');
  } else {
    console.log('SendGrid not configured - using console logging for OTP');
  }

// Helper functions
function generateOTP() {
  return Math.floor(100 + Math.random() * 900).toString();
}

function generateRoomCode() {
  // Generate 3-digit room code (100-999)
  return Math.floor(100 + Math.random() * 900).toString();
}

async function sendOTP(email, otp) {
  if (process.env.SENDGRID_API_KEY && process.env.FROM_EMAIL) {
    try {
      console.log('=== SendGrid Debug Info ===');
      console.log('API Key configured:', process.env.SENDGRID_API_KEY ? 'Yes' : 'No');
      console.log('From Email:', process.env.FROM_EMAIL);
      console.log('To Email:', email);
      console.log('===========================');

      const msg = {
        to: email,
        from: process.env.FROM_EMAIL, // Use the email address you verified with SendGrid
        subject: 'Planning Poker - OTP Verification',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #2563eb; margin-bottom: 10px;">🃏 Planning Poker</h1>
              <h2 style="color: #374151; margin-bottom: 20px;">Email Verification</h2>
            </div>
            
            <div style="background-color: #f8fafc; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
              <p style="color: #6b7280; margin-bottom: 15px; font-size: 16px;">Your verification code is:</p>
              <div style="background-color: #ffffff; padding: 20px; border-radius: 6px; border: 2px solid #e5e7eb;">
                <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #1f2937; font-family: monospace;">
                  ${otp}
                </span>
              </div>
            </div>
            
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p>This code will expire in 2 minutes.</p>
              <p style="margin-top: 20px;">If you didn't request this code, please ignore this email.</p>
            </div>
          </div>
        `,
      };

      await sgMail.send(msg);
      console.log(`✅ Email sent successfully to ${email}`);
    } catch (error) {
      console.error('❌ SendGrid email sending failed:', error.message);
      if (error.response && error.response.body) {
        console.error('SendGrid error details:', JSON.stringify(error.response.body, null, 2));
      }
      // Fallback to console logging for debugging
      console.log(`=== OTP CODE (SendGrid failed) ===`);
      console.log(`Email: ${email}`);
      console.log(`OTP: ${otp}`);
      console.log(`==================================`);
      throw error;
    }
  } else {
    // Fallback to console logging
    console.log(`=== OTP CODE ===`);
    console.log(`Email: ${email}`);
    console.log(`OTP: ${otp}`);
    console.log(`================`);
  }
}

// API Routes

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  const otp = generateOTP();
  const expiresAt = new Date(Date.now() + 2 * 60 * 1000); // 2 minutes

  try {
    // Store OTP in database
    db.run(
      'INSERT OR REPLACE INTO otps (email, otp, expires_at) VALUES (?, ?, ?)',
      [email, otp, expiresAt.toISOString()],
      function(err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Database error' });
        }
      }
    );

    // Send OTP via email
    await sendOTP(email, otp);
    
    res.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// Verify OTP and authenticate
app.post('/api/verify-otp', (req, res) => {
  const { email, otp, name } = req.body;
  
  if (!email || !otp || !name) {
    return res.status(400).json({ error: 'Email, OTP, and name are required' });
  }

  // Check OTP
  db.get(
    'SELECT * FROM otps WHERE email = ? AND otp = ? AND expires_at > datetime("now")',
    [email, otp],
    (err, row) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!row) {
        return res.status(400).json({ error: 'Invalid or expired OTP' });
      }

      // Create or update user
      const userId = uuidv4();
      db.run(
        'INSERT OR REPLACE INTO users (id, email, name) VALUES (?, ?, ?)',
        [userId, email, name],
        function(err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          // Delete used OTP
          db.run('DELETE FROM otps WHERE email = ?', [email]);

          res.json({
            message: 'Authentication successful',
            user: { id: userId, email, name }
          });
        }
      );
    }
  );
});

// Create room
app.post('/api/rooms', (req, res) => {
  const { userId, roomName } = req.body;
  
  if (!userId || !roomName) {
    return res.status(400).json({ error: 'User ID and room name are required' });
  }

  const roomId = generateRoomCode();
  
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
});

// Join room
app.post('/api/rooms/:roomId/join', (req, res) => {
  const { roomId } = req.params;
  const { userId } = req.body;
  
  if (!userId) {
    return res.status(400).json({ error: 'User ID is required' });
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

// Get pending OTPs for room admins
app.get('/api/rooms/:roomId/pending-otps', (req, res) => {
  const { roomId } = req.params;
  const { adminId } = req.query;
  
  if (!adminId) {
    return res.status(400).json({ error: 'Admin ID required' });
  }
  
  // Check if user is admin of this room
  db.get('SELECT * FROM rooms WHERE id = ? AND admin_id = ?', [roomId, adminId], (err, room) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    
    if (!room) {
      return res.status(403).json({ error: 'Access denied - Admin only' });
    }
    
    // Get active OTPs (not expired) - last 20 entries
    db.all(`
      SELECT email, otp, expires_at, created_at
      FROM otps 
      WHERE expires_at > datetime('now')
      ORDER BY created_at DESC
      LIMIT 20
    `, (err, otps) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      
      res.json({ otps });
    });
  });
});

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