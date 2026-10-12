import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { downloadAudioAndThumbnail } from './youtubeService.js';
import { uploadTrackNested } from './archiveService.js';

const jobs = new Map();

// Automatically purge jobs older than 30 minutes
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs.entries()) {
    if (job.updatedAt < cutoff) {
      jobs.delete(id);
    }
  }
}, 5 * 60 * 1000);

export function createJob({ type = 'youtube_upload', payload }) {
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const job = {
    id: jobId,
    type,
    status: 'queued',
    progress: 5,
    stage: 'Job queued for processing...',
    payload,
    result: null,
    error: null,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  jobs.set(jobId, job);
  return job;
}

export function getJob(jobId) {
  return jobs.get(jobId) || null;
}

export function updateJob(jobId, updates) {
  const existing = jobs.get(jobId);
  if (!existing) return null;

  const updated = {
    ...existing,
    ...updates,
    updatedAt: Date.now()
  };
  jobs.set(jobId, updated);
  return updated;
}

/**
 * Executes a YouTube download and Archive.org upload asynchronously.
 */
export async function runYoutubeUploadJob(jobId) {
  const job = getJob(jobId);
  if (!job) return;

  const { payload } = job;
  const tempDir = path.join(os.tmpdir(), `isaiyon_job_${jobId}`);

  try {
    updateJob(jobId, {
      status: 'downloading',
      progress: 20,
      stage: 'Downloading high-quality audio from YouTube...'
    });

    const videoId = payload.id || `video_${Date.now()}`;
    const { audioPath, thumbPath } = await downloadAudioAndThumbnail({
      youtubeUrl: payload.url,
      videoId,
      tempDir
    });

    // Handle custom cover if uploaded via frontend base64
    let effectiveThumb = thumbPath;
    if (payload.customCoverBase64) {
      try {
        let base64Data = payload.customCoverBase64;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        const customCoverPath = path.join(tempDir, `${videoId}_custom.jpg`);
        fs.writeFileSync(customCoverPath, Buffer.from(base64Data, 'base64'));
        effectiveThumb = customCoverPath;
      } catch (coverErr) {
        console.warn(`[JobQueue] Could not write custom cover: ${coverErr.message}`);
      }
    }

    updateJob(jobId, {
      status: 'uploading',
      progress: 65,
      stage: 'Uploading audio and cover artwork to Archive.org...'
    });

    const archiveRes = await uploadTrackNested({
      audioPath,
      thumbPath: effectiveThumb,
      movieName: payload.movie || 'Sound Vault',
      songTitle: payload.title || 'Unknown Track',
      metadata: payload
    });

    const finalResult = {
      ...payload,
      ...archiveRes
    };

    updateJob(jobId, {
      status: 'completed',
      progress: 100,
      stage: 'Track successfully uploaded to Vault!',
      result: finalResult
    });
  } catch (err) {
    console.error(`[JobQueue] Job ${jobId} failed:`, err);
    updateJob(jobId, {
      status: 'failed',
      progress: 0,
      stage: 'Upload failed',
      error: err.message || 'An unexpected error occurred during processing.'
    });
  } finally {
    // ALWAYS clean up temporary storage immediately
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log(`[JobQueue] Cleaned up temporary directory: ${tempDir}`);
      }
    } catch (cleanErr) {
      console.warn(`[JobQueue] Temp cleanup error: ${cleanErr.message}`);
    }
  }
}
