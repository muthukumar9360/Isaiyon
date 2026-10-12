import express from 'express';
import multer from 'multer';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import axios from 'axios';
import { slugify } from '../utils/slugify.js';
import { uploadFileToArchive, uploadBufferToArchive, getArchiveCredentials } from '../services/archiveService.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

const uploadTempDir = path.join(os.tmpdir(), 'isaiyon_audio_uploads');
if (!fs.existsSync(uploadTempDir)) {
  fs.mkdirSync(uploadTempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadTempDir);
  },
  filename: (req, file, cb) => {
    const safeExt = path.extname(file.originalname).toLowerCase() || '.mp3';
    cb(null, `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}${safeExt}`);
  }
});

const allowedAudioExtensions = new Set(['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.mp4']);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedAudioExtensions.has(ext) || file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported audio file type: ${ext}. Allowed: mp3, m4a, wav, aac, ogg, flac`));
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: 65 * 1024 * 1024 // 65MB max for audio
  },
  fileFilter
});

/**
 * POST /api/archive-upload
 * Handles direct audio uploads from mobile or desktop browser to Archive.org
 * using server-side credentials. Never exposes Archive S3 keys to frontend.
 */
router.post('/archive-upload', requireAdmin, upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided in request (field: audio).' });
  }

  const localFilePath = req.file.path;
  try {
    const movie = req.body.movie || 'Sound Vault';
    const title = req.body.title || 'Unknown Track';
    const movieSlug = slugify(movie, 'vault');
    const songSlug = slugify(title, 'song');
    const uniqueId = Date.now().toString(36);
    const fileExt = path.extname(req.file.originalname).toLowerCase() || '.mp3';

    // Structure: movie_slug/song_slug_uniqueid.ext
    const remotePath = `${movieSlug}/${songSlug}_${uniqueId}${fileExt}`;

    const metadata = {
      title: `${title} (${movie})`,
      creator: req.body.composer || req.body.artist || 'Tamil Sound Vault',
      description: `Track: ${title} | Movie: ${movie} | Artists: ${req.body.artist || ''} | Cast: ${req.body.actors || ''}`
    };

    const mimeType = req.file.mimetype || (fileExt === '.mp3' ? 'audio/mpeg' : 'audio/mp4');

    const uploadResult = await uploadFileToArchive({
      localFilePath,
      remotePath,
      mimeType,
      metadata
    });

    res.json({
      success: true,
      audioUrl: uploadResult.audioUrl,
      remoteAudioPath: uploadResult.remoteAudioPath,
      identifier: uploadResult.identifier
    });
  } catch (err) {
    console.error('[API /archive-upload] Error:', err);
    res.status(500).json({
      error: err.message || 'Failed to upload audio file to Archive.org.'
    });
  } finally {
    // Clean up uploaded temp file immediately
    try {
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
    } catch (cleanErr) {
      console.warn('[API /archive-upload] Temp cleanup warning:', cleanErr.message);
    }
  }
});

/**
 * POST /api/update-cover
 * Updates cover artwork in Archive.org item.
 */
router.post('/update-cover', requireAdmin, async (req, res) => {
  const { movie, title, imageBase64, coverUrl } = req.body || {};

  if (!movie || !title) {
    return res.status(400).json({ error: 'Movie and title are required to locate cover path.' });
  }

  const movieSlug = slugify(movie, 'vault');
  const songSlug = slugify(title, 'track');
  const remoteThumbPath = `${movieSlug}/${songSlug}/${songSlug}.jpg`;

  try {
    let buffer;
    if (imageBase64) {
      let rawBase64 = imageBase64;
      if (rawBase64.includes(',')) {
        rawBase64 = rawBase64.split(',')[1];
      }
      buffer = Buffer.from(rawBase64, 'base64');
    } else if (coverUrl) {
      const response = await axios.get(coverUrl, { responseType: 'arraybuffer', timeout: 15000 });
      buffer = Buffer.from(response.data);
    } else {
      return res.status(400).json({ error: 'Must provide imageBase64 or coverUrl.' });
    }

    const uploadRes = await uploadBufferToArchive({
      buffer,
      remotePath: remoteThumbPath,
      mimeType: 'image/jpeg'
    });

    const cacheBustedUrl = `${uploadRes.fileUrl}?t=${Date.now()}`;

    res.json({
      success: true,
      coverUrl: cacheBustedUrl,
      remotePath: remoteThumbPath
    });
  } catch (err) {
    console.error('[API /update-cover] Error:', err);
    res.status(500).json({
      error: err.message || 'Failed to update cover artwork in Archive.org.'
    });
  }
});

export default router;
