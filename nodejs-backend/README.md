# Telegram Group Creator - Node.js Backend

This is a dedicated Node.js backend for GramJS that enables Telegram group creation via MTProto API.

## Setup Instructions

### 1. Create a new folder and initialize

```bash
mkdir telegram-backend
cd telegram-backend
npm init -y
```

### 2. Install dependencies

```bash
npm install telegram gramjs express cors dotenv input
```

### 3. Create the server files

Copy the contents of `server.js` and `package.json` from this folder.

### 4. Create `.env` file

```env
TELEGRAM_API_ID=your_api_id
TELEGRAM_API_HASH=your_api_hash
PORT=3001
FRONTEND_URL=https://your-lovable-app.lovable.app
```

### 5. Deploy Options

#### Option A: Railway (Recommended - Free tier available)
1. Go to [railway.app](https://railway.app)
2. Create new project → Deploy from GitHub
3. Add environment variables
4. Get your deployment URL

#### Option B: Render
1. Go to [render.com](https://render.com)
2. Create new Web Service
3. Connect your GitHub repo
4. Add environment variables

#### Option C: VPS (DigitalOcean, AWS, etc.)
```bash
# On your VPS
git clone your-repo
cd telegram-backend
npm install
npm start
```

### 6. Update Frontend

After deploying, update the `BACKEND_URL` in your Lovable app's frontend code to point to your deployed Node.js server.

## API Endpoints

- `POST /api/send-code` - Send OTP to phone
- `POST /api/verify-code` - Verify OTP and get session
- `POST /api/create-group` - Create Telegram group
- `GET /health` - Health check
