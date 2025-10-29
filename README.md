# 🎙️ HITL Voice Assistant

A production-ready **Human-in-the-Loop (HITL)** AI voice assistant that enables real-time spoken interaction with users, automatically escalates unknown questions to human supervisors, and learns from supervisor responses.

---

## 🧭 Overview

**HITL Voice Assistant** is a smart, learning voice assistant built for scenarios where AI needs human oversight and continuous improvement. When a user asks a question the AI doesn't know, it:

1. **Escalates** the query to a human supervisor in real-time
2. **Learns** the answer once the supervisor provides it
3. **Follows up** automatically by speaking the answer to the user
4. **Remembers** the answer for future queries

This approach combines the scalability of AI with the reliability of human judgment, making it ideal for customer support, front desk automation, helpdesks, and FAQ systems.

---

## 🚀 Features

| Feature                            | Description                                                            |
| ---------------------------------- | ---------------------------------------------------------------------- |
| 🗣️ **Real-time Voice Interaction** | Users speak questions via browser microphone using LiveKit             |
| 🤖 **Intelligent Knowledge Base**  | AI answers known questions instantly from Firestore                    |
| 🆘 **Human Escalation**            | Unknown questions are routed to supervisor dashboard                   |
| 📚 **Continuous Learning**         | System learns new answers when supervisors resolve queries             |
| 🔄 **Automatic Follow-up**         | AI proactively speaks answers when supervisors respond                 |
| 🔍 **De-duplication**              | Prevents duplicate escalations for the same question within 60 seconds |
| ⏱️ **Timeout Management**          | Auto-marks unresolved requests after 10 minutes                        |
| 📊 **Supervisor Dashboard**        | Real-time view of pending, resolved, and unresolved requests           |

---

## 🧰 Tech Stack

| Layer        | Technology                                 |
| ------------ | ------------------------------------------ |
| **Frontend** | React 19, Vite, LiveKit Client SDK         |
| **Backend**  | Node.js, Express, LiveKit Server SDK       |
| **Voice**    | LiveKit (WebRTC), Web Speech API (STT/TTS) |
| **Database** | Firebase Firestore                         |
| **Language** | JavaScript (ES Modules)                    |

---

## ⚙️ Setup Guide

### Prerequisites

- **Node.js** 18+ and npm
- **Firebase** project with Firestore enabled
- **LiveKit** account ([livekit.io](https://livekit.io))
- Modern browser with Web Speech API support (Chrome recommended)

### 1. Clone the Repository

```powershell
git clone https://github.com/yourusername/hitl-voice-assistant.git
cd hitl-voice-assistant
```

### 2. Backend Setup

#### Install Dependencies

```powershell
cd backend
npm install
```

#### Configure Environment Variables

Create a `backend/.env` file with the following:

```env
PORT=3000

# LiveKit Configuration
LIVEKIT_URL=wss://your-project.livekit.cloud
LIVEKIT_API_KEY=your_api_key
LIVEKIT_API_SECRET=your_api_secret

# Firebase Configuration (choose one method)
# Method 1: Base64-encoded service account JSON (recommended for Windows)
FIREBASE_SERVICE_ACCOUNT_B64=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsC...

# Method 2: Direct JSON string
# FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}

# Method 3: Path to JSON file
# FIREBASE_SERVICE_ACCOUNT_FILE=./serviceAccount.json
```

**Getting Firebase Credentials:**

1. Go to Firebase Console → Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Download the JSON file
4. For `FIREBASE_SERVICE_ACCOUNT_B64`, run:
   ```powershell
   [Convert]::ToBase64String([System.IO.File]::ReadAllBytes("path\to\serviceAccount.json"))
   ```

**Getting LiveKit Credentials:**

1. Sign up at [livekit.io](https://livekit.io)
2. Create a new project
3. Copy your WebSocket URL, API Key, and Secret from the dashboard

#### Start Backend Server

```powershell
npm run dev
```

Server runs at `http://localhost:3000`

### 3. Frontend Setup

#### Install Dependencies

```powershell
cd ../frontend
npm install
```

#### Configure Environment Variables

Create a `frontend/.env` file:

```env
VITE_API_BASE=http://localhost:3000
```

#### Start Frontend Dev Server

```powershell
npm run dev
```

Frontend runs at `http://localhost:5173`

### 4. Access the Application

1. Open browser to `http://localhost:5173`
2. You'll see two tabs:
   - **Voice Call** – End-user interface for asking questions
   - **Supervisor Dashboard** – Admin interface for resolving escalations

---

## 🔌 API Endpoints

| Method  | Endpoint                 | Description                                                |
| ------- | ------------------------ | ---------------------------------------------------------- |
| `POST`  | `/api/livekit-token`     | Generate LiveKit access token for browser client           |
| `POST`  | `/api/ask`               | Submit question; returns answer or escalates to supervisor |
| `GET`   | `/api/help-requests`     | Fetch all help requests (pending, resolved, unresolved)    |
| `PATCH` | `/api/help-requests/:id` | Resolve a help request or mark as unresolved               |
| `GET`   | `/api/knowledge`         | Retrieve learned answers from knowledge base               |

### Example Request: Ask Question

```powershell
$body = @{
    customerId = "user123"
    question = "What are your business hours?"
} | ConvertTo-Json

Invoke-RestMethod -Uri http://localhost:3000/api/ask -Method POST -ContentType "application/json" -Body $body
```

**Response (Known Answer):**

```json
{
  "status": "answered",
  "answer": "We are open Monday-Friday, 9 AM to 5 PM."
}
```

**Response (Escalated):**

```json
{
  "status": "escalated",
  "requestId": "abc123xyz",
  "message": "Let me check with my supervisor and get back to you.",
  "deduped": false
}
```

---

## 🧪 Testing Locally

### Test Backend Health

```powershell
# Get all help requests
Invoke-RestMethod -Uri http://localhost:3000/api/help-requests

# Get knowledge base
Invoke-RestMethod -Uri http://localhost:3000/api/knowledge
```

### Test Voice Flow

1. Open Voice Call tab
2. Click "Join LiveKit Room"
3. Click 🎙️ "Ask by Voice"
4. Speak a question (e.g., "What is your refund policy?")
5. If unknown, AI will escalate
6. Switch to Supervisor Dashboard tab
7. Type answer and click "Resolve"
8. Switch back to Voice Call – AI will speak the answer automatically

---

## 🗂️ Project Structure

```
hitl-voice-assistant/
├── backend/
│   ├── server.js              # Express API with HITL logic
│   ├── firebase.js            # Firestore initialization
│   ├── package.json           # Backend dependencies
│   └── .env                   # Environment variables (not in repo)
│
├── frontend/
│   ├── src/
│   │   ├── App.jsx            # Main app with tab navigation
│   │   ├── VoiceCall.jsx      # User voice interface with LiveKit + STT
│   │   ├── Supervisor.jsx     # Admin dashboard for resolving requests
│   │   ├── main.jsx           # React entry point
│   │   └── index.css          # Global styles
│   ├── package.json           # Frontend dependencies
│   ├── vite.config.js         # Vite configuration
│   └── .env                   # Frontend environment variables
│
└── README.md                  # This file
```

---

## 🧱 Future Improvements

- [ ] **User Authentication** – Add login/SSO for supervisors
- [ ] **Analytics Dashboard** – Track resolution time, escalation rate, user satisfaction
- [ ] **Multi-language Support** – Extend STT/TTS to support multiple languages
- [ ] **Voice Quality Enhancements** – Implement noise cancellation, better voice selection
- [ ] **Notification System** – Alert supervisors via email/Slack when questions are escalated
- [ ] **Advanced Knowledge Search** – Use vector embeddings for semantic question matching
- [ ] **Mobile App** – Build native iOS/Android clients
- [ ] **API Rate Limiting** – Add throttling to prevent abuse
- [ ] **Automated Testing** – Unit and integration tests for backend/frontend
- [ ] **Deployment Guide** – Docker containers and cloud deployment instructions

---

## 📄 License

MIT License

Copyright (c) 2025

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📧 Support

For questions or issues, please open an issue on GitHub.

---

**Built with ❤️ using LiveKit, React, and Firebase**
