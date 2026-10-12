/**
 * Media URL Resolver for Isaiyon
 * 
 * Provides high-speed direct cluster node resolution and failover for Archive.org
 * audio streams and cover images, avoiding the slow/frequently failing centralized
 * archive.org/download/ proxy gateway.
 */

// Known active storage cluster nodes for muthuramalingam_a-vault
const DEFAULT_VAULT_IDENTIFIER = 'muthuramalingam_a-vault';
const DIRECT_STORAGE_NODES = [
  'https://ia800409.us.archive.org/25/items',
  'https://ia600409.us.archive.org/25/items'
];

// In-memory cache for resolved identifiers -> storage node prefix
const storageNodeCache = new Map();
storageNodeCache.set(DEFAULT_VAULT_IDENTIFIER, DIRECT_STORAGE_NODES[0]);

/**
 * Optimizes an Archive.org URL to point directly to the fast storage cluster node.
 * E.g., transforms https://archive.org/download/IDENTIFIER/PATH into
 * https://ia800409.us.archive.org/25/items/IDENTIFIER/PATH
 */
export function resolveDirectArchiveUrl(url) {
  if (!url || typeof url !== 'string') return url;

  // If already base64 or local path, keep as-is
  if (url.startsWith('data:') || url.startsWith('/') || url.startsWith('blob:')) {
    return url;
  }

  // Check if it's an archive.org/download/ URL
  const downloadMatch = url.match(/^https?:\/\/(?:www\.)?archive\.org\/download\/([^/]+)\/(.+)$/i);
  if (downloadMatch) {
    const [, identifier, filePath] = downloadMatch;
    const baseNode = storageNodeCache.get(identifier) || DIRECT_STORAGE_NODES[0];
    return `${baseNode}/${identifier}/${filePath}`;
  }

  return url;
}

/**
 * Asynchronously checks / refreshes the active storage server for an Archive item
 * via Archive.org's fast CORS-enabled metadata API.
 */
export async function refreshStorageNode(identifier = DEFAULT_VAULT_IDENTIFIER) {
  try {
    const res = await fetch(`https://archive.org/metadata/${identifier}`, { mode: 'cors' });
    if (!res.ok) return;
    const data = await res.json();
    if (data.server && data.dir) {
      const directBase = `https://${data.server}${data.dir.replace(/\/[^/]+$/, '')}`;
      storageNodeCache.set(identifier, directBase);
    }
  } catch (_) {
    // Fail silently and keep defaults
  }
}

/**
 * Returns prioritized stream URLs for a track to enable seamless auto-failover.
 */
export function getAudioStreamCandidates(track) {
  if (!track) return [];
  const candidates = [];
  const seen = new Set();

  const add = (candidate) => {
    if (candidate && typeof candidate === 'string' && !seen.has(candidate)) {
      seen.add(candidate);
      candidates.push(candidate);
    }
  };

  const rawUrl = track.audioUrl || '';
  const archivePath = track.archiveAudioPath || '';
  const identifier = track.vaultIdentifier || DEFAULT_VAULT_IDENTIFIER;

  // 1. Direct cluster storage node URL (fastest & most reliable: ~300ms response)
  if (archivePath) {
    const directUrl = `${DIRECT_STORAGE_NODES[0]}/${identifier}/${archivePath}`;
    add(directUrl);
    add(`${DIRECT_STORAGE_NODES[1]}/${identifier}/${archivePath}`);
  }

  // 2. Direct resolved version of rawUrl
  if (rawUrl) {
    const resolved = resolveDirectArchiveUrl(rawUrl);
    add(resolved);
  }

  // 3. Local fallback path if local copy exists
  if (track.title) {
    const cleanTitle = track.title.replace(/\s+/g, '_');
    add(`/audio/${cleanTitle}.mp3`);
  }

  // 4. Raw URL as fallback
  if (rawUrl) {
    add(rawUrl);
  }

  return candidates;
}

/**
 * Normalizes all media URLs in a track document (coverUrl, audioUrl)
 * so they load without proxy delay or stream failures.
 */
export function normalizeTrack(track) {
  if (!track) return track;
  const cleanCover = resolveDirectArchiveUrl(track.coverUrl);
  const cleanAudio = resolveDirectArchiveUrl(track.audioUrl);

  return {
    ...track,
    coverUrl: cleanCover || track.coverUrl,
    audioUrl: cleanAudio || track.audioUrl
  };
}
