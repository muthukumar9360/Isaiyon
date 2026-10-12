# Isaiyon Music — Node.js & Express Backend

High-performance audio processing and Internet Archive (`muthuramalingam_a-vault`) bridge backend for **Isaiyon — Pure Sound**.

---

## 🚀 Features

- **YouTube Metadata Extraction (`/api/extract-info`)**: High-accuracy extraction of Tamil cinema song metadata (Song, Movie, Composer, Cast, Singers, Lyricist, Genre, Mood, Duration, Artwork) without downloading audio.
- **Background Upload Engine (`/api/upload-track` & `/api/jobs/:id`)**: Audio download and Archive.org nested upload runs as a background task with live progress reporting, bypassing Render's 100-second HTTP request timeout.
- **Direct Audio Upload (`/api/archive-upload`)**: Direct MP3/M4A/WAV uploads from mobile and desktop with server-side Archive.org credentials (zero secrets exposed in frontend code).
- **Cover Artwork Manager (`/api/update-cover`)**: Direct artwork update to Archive.org nested directories.
- **Vault Temp Cleanup Tool (`npm run archive:cleanup-temp`)**: Permanent removal of temporary and partial upload files from Archive.org with safety allowlists and `--dry-run` verification.
- **Firebase Admin Security**: All mutation and extraction endpoints require valid Firebase ID tokens signed by the authorized administrator (`ADMIN_EMAIL`).
- **Render Ready**: Includes optimized Dockerfile with Node.js 22, FFmpeg, and yt-dlp.

---

## 📁 Directory Structure

```text
backend/
├── Dockerfile                  # Container definition for Render (Node 22 + FFmpeg + yt-dlp)
├── .dockerignore
├── .env.example                # Template for environment configuration
├── .gitignore
├── index.js                    # Express app entrypoint & CORS configuration
├── package.json
├── README.md                   # Backend documentation and deployment manual
├── middleware/
│   └── requireAdmin.js         # Firebase Admin ID token & admin email verifier
├── routes/
│   ├── archive.js              # Direct file upload and cover update endpoints
│   ├── status.js               # Health check endpoint (/api/status)
│   └── youtube.js              # Metadata preview and track upload job routes
├── services/
│   ├── archiveService.js       # S3 REST upload, metadata listing, and file deletion
│   ├── jobQueue.js             # Async background job processor & temp disk cleanup
│   └── youtubeService.js       # yt-dlp metadata extractor and audio downloader
├── utils/
│   └── slugify.js              # URL/filesystem slug generator for Archive.org
└── scripts/
    └── cleanupArchiveTemp.js   # CLI utility to remove temp files from Archive.org
```

---

## 🔑 Environment Variables

Configure these in `backend/.env` for local development, or in the **Environment** tab on Render:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `PORT` | Listening port for Express | `5001` (Render automatically injects `10000`) |
| `NODE_ENV` | Environment mode | `production` or `development` |
| `FRONTEND_ORIGINS` | Comma-separated allowed frontend origins for CORS | `https://music-player-d0eb8.web.app,https://music-player-d0eb8.firebaseapp.com` |
| `ADMIN_EMAIL` | Authorized administrator email address | `perumpatayans@gmail.com` |
| `IA_ACCESS_KEY` | Archive.org S3 Access Key | Obtained from [archive.org/account/s3.php](https://archive.org/account/s3.php) |
| `IA_SECRET_KEY` | Archive.org S3 Secret Key | Obtained from [archive.org/account/s3.php](https://archive.org/account/s3.php) |
| `IA_IDENTIFIER` | Archive.org item bucket name | `muthuramalingam_a-vault` |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Minified JSON of your Firebase service account key | `{"type":"service_account","project_id":...}` |
| `FIREBASE_PROJECT_ID` | Fallback Firebase project ID | `music-player-d0eb8` |
| `DISABLE_AUTH` | Dev only: bypass ID token check | `false` |

---

## 🛠️ API Reference

### 1. Health Check
- **`GET /api/status`**
- Public endpoint (used by Render health checks and frontend bridge detection).
- Returns: `{ "status": "online", "server": "running", "hasCredentials": true, "projectIdentifier": "..." }`

### 2. Extract YouTube Info
- **`POST /api/extract-info`** (Requires Admin Token)
- Headers: `Authorization: Bearer <firebaseIdToken>`
- Body: `{ "url": "https://www.youtube.com/watch?v=..." }`
- Returns: Extracted rich song metadata without downloading the file.

### 3. Upload Track (Background Job)
- **`POST /api/upload-track`** (Requires Admin Token)
- Headers: `Authorization: Bearer <firebaseIdToken>`
- Body: Metadata payload (`url`, `id`, `movie`, `title`, `actors`, `composer`, `artist`, `genre`, `mood`, `duration`, `thumbnailUrl`, `customCoverBase64`).
- Returns: `{ "success": true, "jobId": "job_...", "status": "downloading", "progress": 20 }`

### 4. Job Status Polling
- **`GET /api/jobs/:id`** (Requires Admin Token)
- Headers: `Authorization: Bearer <firebaseIdToken>`
- Returns: `{ "success": true, "job": { "id": "...", "status": "completed", "progress": 100, "result": { ... } } }`

### 5. Direct Audio Upload
- **`POST /api/archive-upload`** (Requires Admin Token)
- Headers: `Authorization: Bearer <firebaseIdToken>`, `Content-Type: multipart/form-data`
- Form fields: `audio` (file), `movie`, `title`, `actors`, `composer`, `artist`.
- Returns: `{ "success": true, "audioUrl": "...", "remoteAudioPath": "..." }`

### 6. Update Cover Artwork
- **`POST /api/update-cover`** (Requires Admin Token)
- Body: `{ "movie": "...", "title": "...", "imageBase64": "..." }`
- Returns: `{ "success": true, "coverUrl": "...", "remotePath": "..." }`

---

## 🧹 Archive.org Temporary File Cleanup Command

Permanently cleans up temporary files (`.part`, `.tmp`, `temp_*`, test files) from your Archive.org item.

### Safe Dry Run (No files deleted)
```bash
npm run archive:cleanup-temp -- --dry-run
```

### Confirmed Permanent Deletion
```bash
npm run archive:cleanup-temp -- --confirm
```

> [!IMPORTANT]
> The cleanup script verifies all files against safe patterns. Real songs (`.mp3`, `.m4a`, `.wav`, etc.), valid covers, and Archive.org system metadata files are **never deleted**.

---

## 🚢 Deploying to Render

1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository: `https://github.com/muthukumar9360/Music_App`.
3. Fill in the deployment settings:
   - **Name**: `isaiyon-backend` (or your choice)
   - **Region**: Choose closest to your audience (e.g., Singapore or Frankfurt)
   - **Branch**: `main`
   - **Root Directory**: `backend`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile`
   - **Instance Type**: `Free` (or Starter for 24/7 uptime)
4. Under **Advanced** -> **Health Check Path**:
   - Set to: `/api/status`
5. Under **Environment Variables**, add:
   - `ADMIN_EMAIL` = `perumpatayans@gmail.com`
   - `IA_ACCESS_KEY` = `<your-archive-s3-access-key>`
   - `IA_SECRET_KEY` = `<your-archive-s3-secret-key>`
   - `IA_IDENTIFIER` = `muthuramalingam_a-vault`
   - `FRONTEND_ORIGINS` = `https://music-player-d0eb8.web.app,https://music-player-d0eb8.firebaseapp.com`
   - `FIREBASE_SERVICE_ACCOUNT_JSON` = `<minified-service-account-json>`
   - `NODE_ENV` = `production`
6. Click **Create Web Service**. Render will build the Docker container with Node 22, FFmpeg, and yt-dlp.
7. Once deployed, note down your Render service URL (e.g., `https://isaiyon-backend.onrender.com`).
8. Add this URL to your frontend's `.env.production`:
   ```bash
   VITE_API_BASE_URL=https://isaiyon-backend.onrender.com
   ```
9. Rebuild and deploy frontend to Firebase Hosting:
   ```bash
   npm run build
   firebase deploy --only hosting
   ```
