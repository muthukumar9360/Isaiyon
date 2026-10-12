import express from 'express';
import { extractYoutubeInfo, isValidYoutubeUrl } from '../services/youtubeService.js';
import { createJob, getJob, runYoutubeUploadJob } from '../services/jobQueue.js';
import { requireAdmin } from '../middleware/requireAdmin.js';

const router = express.Router();

/**
 * POST /api/extract-info
 * Extracts metadata preview from YouTube video URL without downloading.
 */
router.post('/extract-info', requireAdmin, async (req, res) => {
  const { url } = req.body || {};

  if (!url || !isValidYoutubeUrl(url)) {
    return res.status(400).json({
      error: 'Invalid or missing YouTube URL.'
    });
  }

  try {
    const meta = await extractYoutubeInfo(url);
    res.json({
      success: true,
      data: meta
    });
  } catch (err) {
    console.error('[API /extract-info] Error:', err.message);
    res.status(500).json({
      error: err.message || 'Failed to extract song metadata from YouTube.'
    });
  }
});

/**
 * POST /api/upload-track
 * Queues YouTube audio download & Archive.org nested upload.
 * Supports background job execution to prevent Render HTTP timeouts.
 */
router.post('/upload-track', requireAdmin, async (req, res) => {
  const payload = req.body || {};

  if (!payload.url || !isValidYoutubeUrl(payload.url)) {
    return res.status(400).json({
      error: 'A valid YouTube video URL is required.'
    });
  }

  if (!payload.title || !payload.title.trim()) {
    return res.status(400).json({
      error: 'Track title is required.'
    });
  }

  try {
    const job = createJob({
      type: 'youtube_upload',
      payload: {
        ...payload,
        movie: (payload.movie || 'Sound Vault').trim(),
        title: payload.title.trim(),
        actors: (payload.actors || '').trim(),
        composer: (payload.composer || '').trim(),
        artist: (payload.artist || '').trim()
      }
    });

    // Start background worker without blocking HTTP response
    runYoutubeUploadJob(job.id).catch((err) => {
      console.error(`[UploadTrack] Uncaught job error for ${job.id}:`, err);
    });

    // If client requested synchronous execution (e.g. scripts or test clients)
    if (req.query.sync === 'true' || req.body.sync === true) {
      const startTime = Date.now();
      // Poll internally up to 90 seconds
      while (Date.now() - startTime < 90000) {
        await new Promise(r => setTimeout(r, 1000));
        const currentJob = getJob(job.id);
        if (currentJob.status === 'completed') {
          return res.json(currentJob.result);
        }
        if (currentJob.status === 'failed') {
          return res.status(500).json({ error: currentJob.error });
        }
      }
    }

    // Default: return job ticket for frontend polling
    res.json({
      success: true,
      jobId: job.id,
      status: job.status,
      stage: job.stage,
      progress: job.progress
    });
  } catch (err) {
    console.error('[API /upload-track] Error starting job:', err);
    res.status(500).json({
      error: err.message || 'Failed to initiate track upload.'
    });
  }
});

/**
 * GET /api/jobs/:id
 * Polls the real-time processing status of an upload job.
 */
router.get('/jobs/:id', requireAdmin, (req, res) => {
  const job = getJob(req.params.id);
  if (!job) {
    return res.status(404).json({
      error: 'Job not found or expired.'
    });
  }

  res.json({
    success: true,
    job: {
      id: job.id,
      status: job.status,
      progress: job.progress,
      stage: job.stage,
      result: job.result,
      error: job.error,
      updatedAt: job.updatedAt
    }
  });
});

export default router;
