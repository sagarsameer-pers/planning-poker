# 🎲 Planning Poker Application

A real-time planning poker tool for agile teams with email OTP authentication, admin controls, and a beautiful poker table interface.

## ✨ Features

- **3-digit OTP Email Authentication** with SendGrid integration
- **Real-time Poker Table UI** with participants positioned around a circular table
- **Room Creation & Sharing** with prominent room code display
- **Admin Controls** including OTP helper for troubleshooting
- **Live Voting & Reveal** with comprehensive participant tracking
- **"Not Voted" Status** clearly shown for non-participants
- **2-minute OTP Expiration** with automatic resend functionality
- **Modern Responsive Design** built with Tailwind CSS

## 🛠 Tech Stack

- **Frontend:** React TypeScript, Socket.io Client, Tailwind CSS
- **Backend:** Node.js Express, Socket.io, SQLite, SendGrid
- **Real-time Communication:** Socket.io for live updates

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ 
- npm or yarn
- SendGrid API key (optional, falls back to console logging)

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/sagarsameer-pers/planning-poker.git
   cd planning-poker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables** (optional)
   ```bash
   # Create server/.env file
   echo "SENDGRID_API_KEY=your_sendgrid_api_key_here" > server/.env
   echo "FROM_EMAIL=your_verified_sender_email@domain.com" >> server/.env
   ```

4. **Start the development servers**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:3001

## 📧 Email Configuration

### SendGrid Setup (Recommended)

1. Create a [SendGrid account](https://sendgrid.com/)
2. Generate an API key in Settings > API Keys
3. Verify your sender email in Settings > Sender Authentication
4. Add your credentials to `server/.env`:
   ```
   SENDGRID_API_KEY=SG.your_api_key_here
   FROM_EMAIL=your_verified_email@domain.com
   ```

### Development Mode

Without SendGrid configuration, OTP codes are logged to the console for testing.

## 🌐 Deployment Options

### Option 1: Frontend Only on Vercel (Current Setup)

The current `vercel.json` deploys only the React frontend to Vercel. For the backend:

1. **Deploy Frontend to Vercel:**
   - Connect your GitHub repo to Vercel
   - Vercel will automatically use the `vercel.json` configuration
   - Frontend will be deployed successfully

2. **Deploy Backend Separately:**
   - **Railway:** `railway login && railway new && railway up`
   - **Heroku:** Create app and deploy with Git
   - **DigitalOcean App Platform:** Connect repo and deploy
   - **AWS EC2/Elastic Beanstalk:** Traditional server deployment

3. **Update Frontend API URL:**
   ```typescript
   // In client/src/hooks/useSocket.ts
   const BACKEND_URL = 'https://your-backend-url.com';
   ```

### Option 2: Full-Stack Deployment

For platforms that support both frontend and backend:

#### Railway (Recommended)
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and deploy
railway login
railway new
railway up
```

#### Heroku
```bash
# Install Heroku CLI and login
heroku create your-app-name
git push heroku main
```

#### DigitalOcean App Platform
1. Connect your GitHub repository
2. Configure build settings:
   - Build Command: `npm run build:all`
   - Run Command: `npm start`

### Option 3: Docker Deployment

```dockerfile
# Dockerfile (create this file)
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build:all
EXPOSE 3001
CMD ["npm", "start"]
```

## 📁 Project Structure

```
planning-poker/
├── README.md
├── package.json              # Root package with scripts
├── vercel.json              # Vercel deployment config
├── .gitignore
├── server/                  # Backend Express + Socket.io
│   ├── index.js            # Main server file
│   ├── package.json        # Server dependencies
│   └── .env               # Environment variables
└── client/                 # React TypeScript frontend
    ├── src/
    │   ├── components/     # React components
    │   ├── hooks/         # Custom hooks
    │   ├── types/         # TypeScript types
    │   └── App.tsx        # Main app component
    ├── public/
    ├── package.json       # Client dependencies
    └── tailwind.config.js # Tailwind configuration
```

## 🎮 How to Use

1. **Authentication:** Enter name and email to receive OTP
2. **Create Room:** Generate a 3-digit room code to share with team
3. **Join Room:** Enter room code to join existing session
4. **Admin Features:** Room creator can designate other admins
5. **Start Voting:** Admins can create named voting sessions
6. **Vote:** Select poker card values (Fibonacci sequence)
7. **Reveal Results:** View all votes with non-voter tracking

## 🔧 Available Scripts

- `npm run dev` - Start both frontend and backend in development
- `npm run server:dev` - Start only backend server
- `npm run client:dev` - Start only frontend client
- `npm run build:all` - Build both frontend and backend
- `npm start` - Start production server

## 🐛 Troubleshooting

### Port Conflicts
```bash
# Kill processes on ports 3000/3001
npx kill-port 3000 3001
```

### Email Issues
- Check SendGrid API key format (starts with "SG.")
- Verify sender email in SendGrid dashboard
- Check spam/junk folders for OTP emails
- Use admin OTP helper feature for debugging

### Build Errors
```bash
# Clear node_modules and reinstall
rm -rf node_modules client/node_modules server/node_modules
npm install
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with React, Node.js, and Socket.io
- UI styled with Tailwind CSS
- Email service powered by SendGrid
- Real-time features enabled by WebSocket technology

---

**Happy Planning! 🎯** 