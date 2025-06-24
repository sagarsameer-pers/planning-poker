# Planning Poker Tool

A collaborative planning poker tool with email OTP authentication, real-time voting, and room management features.

## Features

- **Email OTP Authentication**: Secure access with SendGrid email verification
- **Room-based Sessions**: Create or join rooms using 3-digit codes  
- **Admin Controls**: Room creators can designate admins and manage voting sessions
- **Real-time Voting**: Live updates showing who has voted and vote reveals
- **Named Voting Sessions**: Add context to each estimation round
- **Admin OTP Helper**: Admins can view pending OTP codes to help users join
- **Email Limit Notification**: Users are informed about daily email sending limits (100/day)
- **Modern UI**: Clean, responsive interface built with React and Tailwind CSS

## Tech Stack

- **Frontend**: React with TypeScript, Tailwind CSS
- **Backend**: Node.js, Express, Socket.io
- **Database**: SQLite
- **Authentication**: Email OTP system with SendGrid
- **Real-time**: WebSocket connections

## Quick Start

1. **Install dependencies**:
   ```bash
   npm run install:all
   ```

2. **Configure SendGrid** (see setup below)

3. **Start the development servers**:
   ```bash
   npm run dev
   ```

4. **Access the application**:
   - Open http://localhost:3000 in your browser
   - Enter your name and email to receive an OTP
   - Check your email for the OTP code

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- SendGrid account (free tier available)

### Installation

1. **Clone the repository**:
   ```bash
   git clone <repository-url>
   cd planning-poker
   ```

2. **Install dependencies**:
   ```bash
   npm run install:all
   ```

3. **Configure SendGrid**:
   
   **a) Create SendGrid Account:**
   - Sign up at https://sendgrid.com/
   - Verify your account

   **b) Get API Key:**
   - Go to https://app.sendgrid.com/settings/api_keys
   - Create a new API key with "Mail Send" permissions
   - Copy the API key

   **c) Verify Sender Email:**
   - Go to https://app.sendgrid.com/settings/sender_auth
   - Add and verify a sender email address

   **d) Create Environment File:**
   ```bash
   cd server
   touch .env
   ```
   
   Add to `server/.env`:
   ```env
   PORT=3001
   DB_PATH=./database.db
   SENDGRID_API_KEY=your_sendgrid_api_key_here
   FROM_EMAIL=your-verified-email@domain.com
   ```

### Development

**Start both frontend and backend**:
```bash
npm run dev
```

**Start individually**:
```bash
# Backend only
npm run server:dev

# Frontend only
npm run client:dev
```

### Production

**Build the frontend**:
```bash
npm run build
```

**Start the production server**:
```bash
npm start
```

## Usage Guide

### Authentication

1. Enter your full name and email address
2. Click "Send OTP" to receive a verification code via email
3. Enter the 6-digit OTP to authenticate

### Creating a Room

1. After authentication, click "Create Room"
2. Enter a room name
3. Share the generated 3-digit room code with participants

### Joining a Room

1. After authentication, enter the 3-digit room code
2. Click "Join Room"

### Admin Functions

**Room creators are automatically admins and can**:
- Designate other participants as admins
- Start new voting sessions with custom names
- Reveal votes when ready
- **Help users join**: View pending OTP codes for users having trouble with email delivery

### Voting Process

1. Admin starts a vote with a descriptive name
2. Participants select their estimates using poker cards
3. Real-time indicators show who has voted
4. Admin reveals votes when all participants are ready
5. Results are displayed with each participant's estimate

## Project Structure

```
planning-poker/
├── client/                 # React frontend
│   ├── public/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── hooks/         # Custom hooks
│   │   ├── types/         # TypeScript definitions
│   │   └── ...
│   └── ...
├── server/                # Node.js backend
│   ├── index.js          # Main server file
│   ├── .env              # Environment variables
│   └── ...
└── package.json          # Root package configuration
```

## API Endpoints

- `POST /api/send-otp` - Send OTP to email via SendGrid
- `POST /api/verify-otp` - Verify OTP and authenticate
- `POST /api/rooms` - Create a new room (3-digit code)
- `POST /api/rooms/:roomId/join` - Join existing room
- `GET /api/rooms/:roomId` - Get room details
- `GET /api/rooms/:roomId/pending-otps` - Get pending OTP codes (admin only)

## Socket Events

**Client to Server**:
- `join-room` - Join room session
- `set-admin` - Change room admin
- `start-vote` - Start new voting session
- `submit-vote` - Submit vote value
- `reveal-votes` - Reveal all votes

**Server to Client**:
- `room-joined` - Confirmation of room join
- `user-joined` - New participant joined
- `user-left` - Participant left
- `admin-changed` - Admin role changed
- `vote-started` - New vote session started
- `vote-submitted` - Someone submitted a vote
- `votes-revealed` - Votes revealed with results

## Configuration

### SendGrid Setup

**Required Environment Variables:**
```env
SENDGRID_API_KEY=your_api_key_here
FROM_EMAIL=your-verified-sender@domain.com
```

**Steps:**
1. **Create SendGrid Account**: Sign up at https://sendgrid.com/
2. **Create API Key**: Generate with "Mail Send" permissions
3. **Verify Sender**: Add your email as a verified sender
4. **Configure Environment**: Add variables to `server/.env`

**Free Tier**: SendGrid offers 100 emails/day free forever

### Database

The application uses SQLite by default. The database file is created automatically at `server/database.db`.

## Troubleshooting

**OTP not received**:
- Check spam/junk folder
- Verify SendGrid configuration
- Ensure sender email is verified with SendGrid
- Check SendGrid activity dashboard for delivery status

**Room code issues**:
- Room codes are now 3 digits (100-999)
- Codes are unique and generated automatically
- Case-sensitive input

**Connection issues**:
- Ensure both frontend (3000) and backend (3001) are running
- Check firewall settings
- Verify WebSocket connections aren't blocked

**SendGrid errors**:
- Verify API key has correct permissions
- Check sender email verification status
- Monitor SendGrid dashboard for errors

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details 