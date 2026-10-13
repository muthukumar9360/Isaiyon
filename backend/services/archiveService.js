import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import axios from 'axios';
import { slugify } from '../utils/slugify.js';

const DEFAULT_PROJECT_IDENTIFIER = 'muthuramalingam_a-vault';

export function getArchiveCredentials() {
  let accessKey = process.env.IA_ACCESS_KEY || '';
  let secretKey = process.env.IA_SECRET_KEY || '';
  let identifier = process.env.IA_IDENTIFIER || DEFAULT_PROJECT_IDENTIFIER;

  if (!accessKey || !secretKey) {
    const candidatePaths = [
      path.resolve('scripts/ia_config.json'),
      path.resolve('../scripts/ia_config.json'),
      path.resolve('../../scripts/ia_config.json')
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        try {
          const json = JSON.parse(fs.readFileSync(p, 'utf8'));
          accessKey = accessKey || json.access_key || '';
          secretKey = secretKey || json.secret_key || '';
          if (json.project_identifier) {
            identifier = json.project_identifier;
          }
          break;
        } catch (_) {}
      }
    }
  }

  return {
    accessKey: accessKey.trim(),
    secretKey: secretKey.trim(),
    identifier: identifier.trim()
  };
}

export function hasArchiveCredentials() {
  const { accessKey, secretKey } = getArchiveCredentials();
  return Boolean(accessKey && secretKey);
}

/**
 * Normalizes remote path to avoid leading/trailing slashes and duplicate separators.
 */
export function normalizeRemotePath(remotePath) {
  return remotePath
    .split('/')
    .filter(Boolean)
    .join('/');
}

/**
 * Upload a local file to Archive.org using the S3-compatible REST API.
 */
export async function uploadFileToArchive({
  localFilePath,
  remotePath,
  mimeType = 'audio/mpeg',
  metadata = {}
}) {
  const { accessKey, secretKey, identifier } = getArchiveCredentials();
  if (!accessKey || !secretKey) {
    throw new Error('Archive.org credentials not configured (IA_ACCESS_KEY, IA_SECRET_KEY).');
  }

  if (!fs.existsSync(localFilePath)) {
    throw new Error(`Local file not found for upload: ${localFilePath}`);
  }

  const stat = fs.statSync(localFilePath);
  const fileSize = stat.size;
  const cleanPath = normalizeRemotePath(remotePath);
  const encodedPath = cleanPath.split('/').map(part => encodeURIComponent(part)).join('/');
  const uploadUrl = `https://s3.us.archive.org/${identifier}/${encodedPath}`;

  const headers = {
    'authorization': `LOW ${accessKey}:${secretKey}`,
    'x-archive-size-hint': String(fileSize),
    'x-archive-ignore-preexisting-bucket': '1',
    'x-archive-interactive-priority': '1',
    'x-archive-queue-derive': '0',
    'content-type': mimeType,
    'content-length': String(fileSize)
  };

  if (metadata.title) {
    headers['x-archive-meta-title'] = metadata.title.slice(0, 200);
  }
  if (metadata.creator) {
    headers['x-archive-meta-creator'] = metadata.creator.slice(0, 100);
  }
  if (metadata.description) {
    headers['x-archive-meta-description'] = metadata.description.slice(0, 500);
  }
  headers['x-archive-meta-mediatype'] = metadata.mediatype || 'audio';
  headers['x-archive-meta-collection'] = metadata.collection || 'opensource_audio';

  console.log(`[ArchiveService] Uploading file to ${uploadUrl} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)`);

  let lastError = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(localFilePath);
        const req = https.request(uploadUrl, {
          method: 'PUT',
          headers
        }, (res) => {
          let responseBody = '';
          res.on('data', chunk => { responseBody += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve();
            } else {
              reject(new Error(`Archive.org responded with status ${res.statusCode}: ${responseBody.slice(0, 200)}`));
            }
          });
        });

        req.on('error', (err) => {
          reject(err);
        });

        fileStream.on('error', (err) => {
          req.destroy(err);
          reject(err);
        });

        fileStream.pipe(req);
      });

      const directAudioUrl = `https://archive.org/download/${identifier}/${cleanPath}`;
      const audioUrl = directAudioUrl;
      const archiveDetailsUrl = `https://archive.org/details/${identifier}`;

      return {
        success: true,
        identifier,
        audioUrl,
        directAudioUrl,
        archiveDetailsUrl,
        remoteAudioPath: cleanPath
      };
    } catch (err) {
      lastError = err;
      console.warn(`[ArchiveService] Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 3) {
        await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }
  }

  throw new Error(`Failed to upload to Archive.org after 3 attempts: ${lastError?.message}`);
}

/**
 * Upload an in-memory Buffer directly to Archive.org.
 */
export async function uploadBufferToArchive({
  buffer,
  remotePath,
  mimeType = 'image/jpeg',
  metadata = {}
}) {
  const { accessKey, secretKey, identifier } = getArchiveCredentials();
  if (!accessKey || !secretKey) {
    throw new Error('Archive.org credentials not configured (IA_ACCESS_KEY, IA_SECRET_KEY).');
  }

  const cleanPath = normalizeRemotePath(remotePath);
  const encodedPath = cleanPath.split('/').map(part => encodeURIComponent(part)).join('/');
  const uploadUrl = `https://s3.us.archive.org/${identifier}/${encodedPath}`;

  const headers = {
    'authorization': `LOW ${accessKey}:${secretKey}`,
    'x-archive-size-hint': String(buffer.length),
    'x-archive-ignore-preexisting-bucket': '1',
    'x-archive-interactive-priority': '1',
    'x-archive-queue-derive': '0',
    'content-type': mimeType,
    'content-length': String(buffer.length)
  };

  const response = await axios.put(uploadUrl, buffer, {
    headers,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    timeout: 120000
  });

  if (response.status < 200 || response.status >= 300) {
    throw new Error(`Archive upload buffer failed with status ${response.status}`);
  }

  const directUrl = `https://archive.org/download/${identifier}/${cleanPath}`;
  const fileUrl = directUrl;
  return {
    success: true,
    fileUrl,
    directUrl,
    remotePath: cleanPath
  };
}

/**
 * Upload audio and artwork following the movie/song folder structure.
 */
export async function uploadTrackNested({
  audioPath,
  thumbPath,
  movieName,
  songTitle,
  metadata = {}
}) {
  const { identifier } = getArchiveCredentials();
  const movieSlug = slugify(movieName, 'Sound_Vault');
  const songSlug = slugify(songTitle, 'Track');

  const extAudio = path.extname(audioPath) || '.mp3';
  const remoteAudioPath = `${movieSlug}/${songSlug}/${songSlug}${extAudio}`;

  const archiveMeta = {
    title: `Isaiyon Music Vault - ${movieName}`,
    mediatype: 'audio',
    collection: 'opensource_audio',
    creator: metadata.composer || metadata.artist || 'Tamil Cinema',
    description: `Song: ${songTitle} | Movie: ${movieName} | Cast: ${metadata.actors || 'Featured Stars'} | Music: ${metadata.composer || 'Music Director'}`
  };

  // 1. Upload audio
  const audioResult = await uploadFileToArchive({
    localFilePath: audioPath,
    remotePath: remoteAudioPath,
    mimeType: extAudio === '.mp3' ? 'audio/mpeg' : (extAudio === '.m4a' || extAudio === '.mp4') ? 'audio/mp4' : 'application/octet-stream',
    metadata: archiveMeta
  });

  // 2. Upload thumbnail if available
  let coverUrl = metadata.thumbnailUrl || '';
  if (thumbPath && fs.existsSync(thumbPath)) {
    try {
      const extThumb = path.extname(thumbPath) || '.jpg';
      const remoteThumbPath = `${movieSlug}/${songSlug}/${songSlug}${extThumb}`;
      const thumbStat = fs.statSync(thumbPath);
      const thumbBuffer = fs.readFileSync(thumbPath);

      const thumbRes = await uploadBufferToArchive({
        buffer: thumbBuffer,
        remotePath: remoteThumbPath,
        mimeType: extThumb === '.png' ? 'image/png' : extThumb === '.webp' ? 'image/webp' : 'image/jpeg'
      });
      coverUrl = thumbRes.fileUrl;
    } catch (thumbErr) {
      console.warn('[ArchiveService] Thumbnail upload warning:', thumbErr.message);
    }
  }

  return {
    success: true,
    identifier,
    audioUrl: audioResult.audioUrl,
    coverUrl,
    archiveDetailsUrl: audioResult.archiveDetailsUrl,
    remoteAudioPath: audioResult.remoteAudioPath
  };
}

/**
 * Lists all files in the Archive.org item via the metadata API.
 */
export async function listArchiveFiles(identifierOverride) {
  const { identifier } = getArchiveCredentials();
  const targetId = identifierOverride || identifier;

  const url = `https://archive.org/metadata/${targetId}/files`;
  const response = await axios.get(url, { timeout: 30000 });
  return response.data?.result || [];
}

/**
 * Permanently deletes a single file from Archive.org.
 */
export async function deleteFileFromArchive(remotePath, identifierOverride) {
  const { accessKey, secretKey, identifier } = getArchiveCredentials();
  if (!accessKey || !secretKey) {
    throw new Error('Archive.org credentials required for deletion (IA_ACCESS_KEY, IA_SECRET_KEY).');
  }

  const targetId = identifierOverride || identifier;
  const cleanPath = normalizeRemotePath(remotePath);
  const encodedPath = cleanPath.split('/').map(part => encodeURIComponent(part)).join('/');
  const deleteUrl = `https://s3.us.archive.org/${targetId}/${encodedPath}`;

  const response = await axios.delete(deleteUrl, {
    headers: {
      'authorization': `LOW ${accessKey}:${secretKey}`,
      'x-archive-cascade-delete': '1'
    },
    validateStatus: (status) => status >= 200 && status < 400
  });

  return {
    success: true,
    status: response.status,
    deletedPath: cleanPath
  };
}
