# ⬡ MediaVault — Multimedia Upload & Search Platform

A full-stack scalable web app for uploading, previewing, searching, and ranking multimedia files (images, videos, audio, PDFs) with JWT authentication, Cloudinary storage, real-time WebSocket notifications, and advanced search ranking.

---

## 🚀 Live Demo

- **Frontend:** https://mediavault.vercel.app *(deploy to Vercel)*
- **Backend API:** https://mediavault-api.railway.app *(deploy to Railway)*
- **API Docs (Swagger):** https://mediavault-api.railway.app/api-docs

---

## ✨ Features

| Feature | Details |
|---------|---------|
| 🔐 Auth | JWT access + refresh tokens, HTTP-only cookies, token rotation |
| ☁️ Upload | Drag-and-drop, Cloudinary storage, images/videos/audio/PDF, 50MB limit |
| 🔍 Search | Full-text search, autocomplete suggestions, advanced filters |
| 📊 Ranking | Composite score: text relevance + views (log scale) + recency decay + tag richness |
| 🔴 Real-time | WebSocket notifications on upload events, per-user rooms + broadcast |
| 🛡 Security | Helmet, CORS, rate limiting, input validation, file type/size guards |
| 📚 API Docs | Swagger/OpenAPI 3.0 at `/api-docs` |
| 🧪 Tests | Jest + Supertest covering auth, file CRUD, search |

---

## 🗂 Project Structure

```
mediaVault/
├── backend/
│   ├── config/
│   │   ├── cloudinary.js      # Multer + Cloudinary storage
│   │   ├── db.js              # MongoDB connection
│   │   └── swagger.js         # OpenAPI spec
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── file.controller.js
│   │   └── search.controller.js
│   ├── middleware/
│   │   ├── auth.middleware.js  # JWT verify
│   │   └── validation.middleware.js
│   ├── models/
│   │   ├── User.js
│   │   └── File.js            # Text indexes, relevance scoring
│   ├── routes/
│   │   ├── auth.routes.js     # Full Swagger JSDoc
│   │   ├── file.routes.js
│   │   └── search.routes.js
│   ├── utils/
│   │   ├── jwt.utils.js
│   │   └── websocket.js       # WS server, per-user rooms
│   ├── tests/
│   │   └── api.test.js        # Jest + Supertest
│   ├── app.js
│   ├── server.js
│   └── package.json
│
└── frontend/
    ├── public/
    │   └── index.html
    └── src/
        ├── components/
        │   ├── Layout/         # Sidebar + layout
        │   └── FileCard/       # File grid card
        ├── hooks/
        │   └── useWebSocket.js
        ├── pages/
        │   ├── LoginPage.jsx
        │   ├── RegisterPage.jsx
        │   ├── DashboardPage.jsx
        │   ├── UploadPage.jsx
        │   ├── SearchPage.jsx
        │   ├── FileDetailPage.jsx
        │   ├── MyFilesPage.jsx
        │   └── NotFoundPage.jsx
        ├── store/
        │   ├── index.js
        │   └── slices/        # auth, files, search, ui
        ├── styles/
        │   └── global.scss    # Design system, CSS vars
        ├── utils/
        │   └── api.js         # Axios + auto token refresh
        ├── App.js
        └── index.js
```

---

## ⚙️ Local Setup

### Prerequisites
- Node.js 18+
- MongoDB Atlas account (free tier works)
- Cloudinary account (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/mediavault.git
cd mediavault
```

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
```

Edit `.env`:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/mediavault
JWT_SECRET=your_super_secret_minimum_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your_refresh_secret_minimum_32_chars
JWT_REFRESH_EXPIRES_IN=7d
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLIENT_URL=http://localhost:3000
```

Start backend:

```bash
npm run dev     # development (nodemon)
npm start       # production
```

API available at: `http://localhost:5000`  
Swagger docs at: `http://localhost:5000/api-docs`

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.example .env
```

Edit `.env`:

```env
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_WS_URL=ws://localhost:5000/ws
```

Start frontend:

```bash
npm start
```

App available at: `http://localhost:3000`

### 4. Run Tests

```bash
cd backend
npm test
```

---

## 📡 API Reference

Full interactive docs at `/api-docs`. Summary:

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | ❌ | Register new user |
| POST | `/api/auth/login` | ❌ | Login, get tokens |
| POST | `/api/auth/refresh` | ❌ | Refresh access token |
| POST | `/api/auth/logout` | ✅ | Invalidate refresh token |
| GET  | `/api/auth/me` | ✅ | Get current user |

### Files
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/files/upload` | ✅ | Upload file (multipart/form-data) |
| GET | `/api/files` | ❌ | List public files (paginated, sorted) |
| GET | `/api/files/:id` | ❌ | Get file + increment view count |
| PATCH | `/api/files/:id` | ✅ | Update name/tags/description |
| DELETE | `/api/files/:id` | ✅ | Delete from DB + Cloudinary |
| GET | `/api/files/:id/download` | ✅ | Get download URL |

### Search
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/search?query=...` | ✅ | Full-text search with ranking |
| GET | `/api/search/suggestions?query=...` | ✅ | Autocomplete suggestions |

**Search query params:** `query`, `fileType`, `sortBy` (relevance/date/views/name/size), `order`, `page`, `limit`, `dateFrom`, `dateTo`, `tags`, `minSize`, `maxSize`

---

## 🧮 Search Ranking Algorithm

Each result gets a composite `rankScore`:

```
rankScore =
  textScore × 20           // MongoDB full-text match weight
  + fuzzyScore × 5         // Regex match bonus in name/description/tags
  + log10(viewCount+1) × 10 // Popularity (log scale to prevent dominance)
  + tagCount × 2           // Tag richness
  + 50 × e^(-0.05 × ageDays) // Recency decay (exponential)
```

This balances relevance, popularity, and freshness without any single factor dominating.

---

## 🔐 Security Implementation

- **JWT Access Token:** 15-minute expiry, signed with HS256
- **JWT Refresh Token:** 7-day expiry, rotated on every refresh (prevents replay)
- **Storage:** Tokens in `localStorage` + HTTP-only cookies (dual support)
- **Rate Limiting:** 100 req/15min global, 10 req/15min on auth routes
- **Input Validation:** `express-validator` on all routes
- **File Guards:** MIME type allowlist, 50MB size limit
- **Helmet:** Security headers (CSP, HSTS, etc.)
- **CORS:** Strict origin whitelist

---

## 🌐 Deployment

### Backend → Railway

1. Push to GitHub
2. Create Railway project → "Deploy from GitHub"
3. Set all environment variables in Railway dashboard
4. Railway auto-detects Node.js and runs `npm start`

### Frontend → Vercel

1. Push to GitHub
2. Import project in Vercel
3. Set `REACT_APP_API_URL` and `REACT_APP_WS_URL` in Vercel environment
4. Set build command: `npm run build`, output: `build`

---

## 🔌 WebSocket Events

Connect to `ws://localhost:5000/ws` and authenticate:

```json
{ "type": "AUTH", "userId": "<your-user-id>" }
```

Receive:

| Event | Payload | Description |
|-------|---------|-------------|
| `UPLOAD_SUCCESS` | `{ file: {...} }` | Your upload completed |
| `NEW_FILE` | `{ file: { name, uploader } }` | Anyone uploaded a public file |
| `AUTH_SUCCESS` | `{ message }` | WS authenticated |

---

## 📝 Assumptions & Notes

- Cloudinary free tier (25GB storage, 25GB bandwidth/month) is sufficient for demo
- MongoDB Atlas M0 free cluster used for development
- Refresh token rotation means old tokens are invalidated on each use (sliding sessions)
- File deletion removes from both Cloudinary and MongoDB atomically
- WebSocket reconnects automatically with 5-second backoff
- PDF preview links directly to Cloudinary URL (browser handles rendering)
- All search is case-insensitive with stemming via MongoDB text indexes

---

## 🧪 Test Coverage

```
Auth API
  ✓ POST /api/auth/register - registers user
  ✓ POST /api/auth/register - rejects duplicate email  
  ✓ POST /api/auth/register - rejects weak password
  ✓ POST /api/auth/login - logs in with valid credentials
  ✓ POST /api/auth/login - rejects wrong password
  ✓ GET  /api/auth/me - returns current user
  ✓ GET  /api/auth/me - rejects unauthenticated
  ✓ POST /api/auth/refresh - refreshes tokens

Files API
  ✓ POST /api/files/upload - uploads a file
  ✓ POST /api/files/upload - rejects unauthenticated upload
  ✓ GET  /api/files - lists files with pagination
  ✓ GET  /api/files - filters by fileType
  ✓ GET  /api/files/:id - gets file and increments view count
  ✓ PATCH /api/files/:id - updates file metadata

Search API
  ✓ GET /api/search - returns ranked results
  ✓ GET /api/search - filters by fileType
  ✓ GET /api/search - rejects with no params
  ✓ GET /api/search/suggestions - returns autocomplete

File Deletion
  ✓ DELETE /api/files/:id - deletes file
  ✓ GET    /api/files/:id - 404 after deletion
```

---

## 📦 Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18, Redux Toolkit, React Router 6, SCSS, react-dropzone |
| Backend | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB Atlas (metadata), Cloudinary (media) |
| Auth | JWT (access + refresh tokens), bcryptjs |
| Real-time | WebSocket (ws library) |
| Docs | Swagger UI + swagger-jsdoc (OpenAPI 3.0) |
| Testing | Jest, Supertest |
| Deploy | Vercel (frontend), Railway (backend) |
