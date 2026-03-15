# LASUConnect 🎓

> Campus-based social media platform exclusively for Lagos State University students.

**Stack:** MongoDB · Express.js · React.js · Node.js (MERN) + Socket.IO + Cloudinary

---

## Project Structure

```
lasuconnect/
├── client/                   # React.js frontend (Vite + Tailwind CSS)
│   └── src/
│       ├── components/       # Reusable UI components
│       ├── pages/            # Route-level pages
│       │   ├── auth/         # Login, Register, VerifyEmail
│       │   └── app/          # Feed, Reels, Messages, Courses, etc.
│       ├── context/          # Zustand store + Socket context
│       ├── services/         # Axios API client
│       └── utils/
└── server/                   # Node.js + Express.js backend
    ├── config/               # DB, Cloudinary connections
    ├── middleware/            # Error handler, notFound
    ├── modules/              # Feature modules (auth, posts, messages...)
    ├── models/               # Mongoose schemas (coming next step)
    ├── socket/               # Socket.IO event handlers
    ├── utils/                # Logger, AppError, catchAsync, apiResponse
    └── server.js             # Main entry point
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier)
- Git

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/lasuconnect.git
cd lasuconnect
```

### 2. Set up environment variables

```bash
cd server
cp .env.example .env
# Open .env and fill in all values (MongoDB URI, JWT secrets, Cloudinary, etc.)
```

### 3. Install all dependencies

```bash
# From the root directory
npm run install:all
```

### 4. Run in development mode

```bash
# From root — starts both server (port 5000) and client (port 5173) concurrently
npm run dev
```

Or run separately:
```bash
# Terminal 1 — Backend
cd server && npm run dev

# Terminal 2 — Frontend
cd client && npm run dev
```

### 5. Verify it's running

- API health check: http://localhost:5000/health
- Frontend: http://localhost:5173

---

## Implementation Progress

| Module              | Status      |
|---------------------|-------------|
| Project Scaffolding | ✅ Complete  |
| Auth Module         | 🔜 Next      |
| User Profiles       | 🔜 Upcoming  |
| Feed & Posts        | 🔜 Upcoming  |
| Reels               | 🔜 Upcoming  |
| Messaging           | 🔜 Upcoming  |
| Course Hubs         | 🔜 Upcoming  |
| Live Streaming      | 🔜 Upcoming  |
| Peer Tutoring       | 🔜 Upcoming  |
| Announcements       | 🔜 Upcoming  |
| Admin Dashboard     | 🔜 Upcoming  |

---

## Developer

**Ismail Oluwatimilehin Idris** · 220591160  
Department of Computer Science, Faculty of Science  
Lagos State University, Ojo  
Supervisor: Mr. Tola Ajagbe Peace
