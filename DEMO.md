# Planning Poker - Demo Guide

## 🚀 Application is Running!

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:3001

## 📋 Demo Steps

### 1. Authentication
1. Open http://localhost:3000
2. Enter your name: `John Doe`
3. Enter your email: `john@example.com`
4. Click "Send OTP"
5. **Check the terminal console** for the OTP (e.g., `123456`)
6. Enter the OTP and click "Verify OTP"

### 2. Create a Room
1. Click "Create Room"
2. Enter room name: `Sprint Planning Demo`
3. Note the 6-digit room code (e.g., `123456`)

### 3. Test Multiple Users
1. Open a **new incognito/private browser window**
2. Go to http://localhost:3000
3. Enter different name: `Jane Smith`
4. Enter different email: `jane@example.com`
5. Get OTP from console and authenticate
6. Enter the room code from step 2
7. Click "Join Room"

### 4. Test Voting
1. In the admin window (first user), start a vote:
   - Enter vote name: `User Story #1`
   - Click "Start Vote"
2. Both users select their estimates (e.g., 5, 8)
3. Admin clicks "Reveal Votes" to see results

## ✨ Features Tested

✅ **Email OTP Authentication** - Users must authenticate with email and name
✅ **Room Creation/Joining** - 6-digit room codes for easy sharing  
✅ **Admin Controls** - Room creator is admin, can assign other admins
✅ **Real-time Voting** - Live updates of voting status
✅ **Named Votes** - Custom names for each voting session
✅ **Participant Visibility** - See who's in the room and voting status

## 📝 OTP Codes

During development, OTP codes are logged to the server console. Look for lines like:
```
OTP for john@example.com: 123456
```

## 🛠️ Development Notes

- Frontend runs on port 3000
- Backend runs on port 3001
- Database is SQLite (created automatically)
- Real-time updates via Socket.io
- No email configuration needed for demo (uses console logging)

## 🔧 Stopping the Application

To stop the development servers:
```bash
# Press Ctrl+C or kill the process
pkill -f "npm run dev"
``` 