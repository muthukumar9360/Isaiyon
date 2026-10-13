import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KNOWN_COMPOSERS = [
  { regex: /A\.?\s*R\.?\s*Rahman|AR\s*Rahman/i, name: 'A. R. Rahman' },
  { regex: /Harris\s*Jayaraj/i, name: 'Harris Jayaraj' },
  { regex: /Yuvan\s*Shankar\s*Raja|Yuvan/i, name: 'Yuvan Shankar Raja' },
  { regex: /Anirudh\s*Ravichander|Anirudh/i, name: 'Anirudh Ravichander' },
  { regex: /Ilaiyaraaja|Ilayaraja|Ilaiyaraja/i, name: 'Ilaiyaraaja' },
  { regex: /D\.?\s*Imman|Imman/i, name: 'D. Imman' },
  { regex: /Santhosh\s*Narayanan/i, name: 'Santhosh Narayanan' },
  { regex: /G\.?\s*V\.?\s*Prakash/i, name: 'G. V. Prakash Kumar' },
  { regex: /Deva/i, name: 'Deva' },
  { regex: /Vidyasagar/i, name: 'Vidyasagar' },
  { regex: /Sirpy/i, name: 'Sirpy' }
];

const KNOWN_ACTORS = [
  'Ajith Kumar', 'Ajith', 'Thalapathy Vijay', 'Vijay', 'Suriya', 'Dhanush',
  'Sivakarthikeyan', 'Vikram', 'Rajinikanth', 'Kamal Haasan', 'Tabu',
  'Aishwarya Rai', 'Nayanthara', 'Trisha', 'Samantha', 'Simran', 'Jyothika',
  'Sneha', 'Laila', 'Manisha Koirala', 'Raghuvaran', 'Prashanth', 'Madhavan'
];

/**
 * Discovers available yt-dlp and ffmpeg binaries across Windows and Linux environments.
 */
export async function getBinaryCommands() {
  const customYtDlp = process.env.YT_DLP_PATH;
  const customFfmpeg = process.env.FFMPEG_PATH;

  let ytCommand = 'yt-dlp';
  let ytPrefixArgs = [];

  if (customYtDlp && fs.existsSync(customYtDlp)) {
    ytCommand = customYtDlp;
  } else {
    // Check if yt-dlp is accessible directly
    const directOk = await checkCommand('yt-dlp', ['--version']);
    if (!directOk) {
      // On Windows or systems with python module installed
      const pyModuleOk = await checkCommand('py', ['-m', 'yt_dlp', '--version']);
      if (pyModuleOk) {
        ytCommand = 'py';
        ytPrefixArgs = ['-m', 'yt_dlp'];
      } else {
        const python3ModuleOk = await checkCommand('python3', ['-m', 'yt_dlp', '--version']);
        if (python3ModuleOk) {
          ytCommand = 'python3';
          ytPrefixArgs = ['-m', 'yt_dlp'];
        }
      }
    }
  }

  // Find ffmpeg
  let ffmpegLocation = null;
  if (customFfmpeg && fs.existsSync(customFfmpeg)) {
    ffmpegLocation = customFfmpeg;
  } else {
    const ffmpegInPath = await checkCommand('ffmpeg', ['-version']);
    if (ffmpegInPath) {
      ffmpegLocation = 'ffmpeg';
    } else {
      // Check local scripts folder fallback (Windows dev)
      const localFfmpeg = path.resolve(__dirname, '../../scripts/ffmpeg.exe');
      if (fs.existsSync(localFfmpeg)) {
        ffmpegLocation = localFfmpeg;
      }
    }
  }

  return { ytCommand, ytPrefixArgs, ffmpegLocation };
}

/**
 * Executes a process cleanly without shell wrapping on POSIX systems (Linux/Render),
 * which prevents /bin/sh syntax errors caused by '%' or '(' in templates or '&' in URLs.
 * On Windows, transparently falls back to shell: true only if a .cmd/.bat wrapper requires it.
 */
function runProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    let proc;
    let stdoutData = '';
    let stderrData = '';
    let settled = false;

    const trySpawn = (useShell) => {
      try {
        proc = spawn(command, args, { ...options, shell: useShell });
      } catch (err) {
        if (!useShell && process.platform === 'win32') {
          return trySpawn(true);
        }
        if (!settled) {
          settled = true;
          reject(err);
        }
        return;
      }

      if (proc.stdout) {
        proc.stdout.on('data', (data) => {
          stdoutData += data.toString();
        });
      }

      if (proc.stderr) {
        proc.stderr.on('data', (data) => {
          stderrData += data.toString();
        });
      }

      proc.on('error', (err) => {
        if (!useShell && process.platform === 'win32' && err.code === 'ENOENT') {
          return trySpawn(true);
        }
        if (!settled) {
          settled = true;
          reject(err);
        }
      });

      proc.on('close', (code) => {
        if (!settled) {
          settled = true;
          resolve({ code, stdout: stdoutData, stderr: stderrData });
        }
      });
    };

    trySpawn(false);
  });
}

async function checkCommand(cmd, args) {
  try {
    const { code } = await runProcess(cmd, args, { stdio: 'ignore' });
    return code === 0;
  } catch {
    return false;
  }
}

/**
 * Validates whether string is a valid YouTube URL.
 */
export function isValidYoutubeUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return /^(https?:\/\/)?(www\.)?(youtube\.com\/(watch\?v=|shorts\/)|youtu\.be\/)[a-zA-Z0-9_\-\?=&]+/.test(url.trim());
}

/**
 * Parses raw yt-dlp JSON info into rich metadata.
 */
export function parseRichMetadata(info) {
  const title = info.title || '';
  const desc = info.description || '';
  const uploader = info.uploader || info.artist || '';
  const duration = info.duration || 0;
  const thumbnailUrl = info.thumbnail || '';

  let movie = info.album || '';
  let song = info.track || '';
  let actors = '';
  let composer = info.composer || '';
  let singers = info.artist || '';
  let lyrics = '';
  let genre = info.genre || 'Soundtrack';

  // 1. Movie parsing from description
  const movieMatch = desc.match(/(?:Movie|Film|Album)\s*[:\-]\s*([^\n\r,\(]+)/i);
  if (movieMatch) {
    movie = movieMatch[1].trim();
  } else if (!movie) {
    const splitPatterns = [/\|\s*([^\n\r\|]+)/i, /-\s*([^\n\r\-]+)/i, /From\s+["']?([^"',\n\r]+)["']?/i];
    for (const pat of splitPatterns) {
      const m = title.match(pat);
      if (m) {
        const cand = m[1].trim();
        const lowerCand = cand.toLowerCase();
        if (!['video', 'audio', 'lyric', 'official', 'full song', 'tamil'].some(k => lowerCand.includes(k))) {
          movie = cand;
          break;
        }
      }
    }
  }

  // 2. Song title extraction
  const songMatch = desc.match(/(?:Song|Track)\s*[:\-]\s*([^\n\r,\(]+)/i);
  if (songMatch) {
    song = songMatch[1].trim();
  } else if (!song) {
    const baseTitle = title.split(/[-|([\]]/)[0].trim();
    song = baseTitle || title;
  }

  // 3. Cast / Actors
  const castMatch = desc.match(/(?:Starring|Cast|Actors?)\s*[:\-]\s*([^\n\r]+)/i);
  if (castMatch) {
    actors = castMatch[1].trim();
  } else {
    const fullText = `${title} ${desc}`;
    const foundActors = [];
    for (const aname of KNOWN_ACTORS) {
      const reg = new RegExp(`\\b${aname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (reg.test(fullText)) {
        if (!foundActors.some(f => f.includes(aname) || aname.includes(f))) {
          foundActors.push(aname);
        }
      }
    }
    if (foundActors.length > 0) {
      actors = foundActors.slice(0, 4).join(', ');
    }
  }

  // 4. Music Director / Composer
  const musicMatch = desc.match(/(?:Music|Composer|Music Director)\s*[:\-]\s*([^\n\r,]+)/i);
  if (musicMatch) {
    composer = musicMatch[1].trim();
  } else if (!composer || ['music director', 'soundtrack', ''].includes(composer.toLowerCase())) {
    const fullText = `${title} ${desc}`;
    for (const item of KNOWN_COMPOSERS) {
      if (item.regex.test(fullText)) {
        composer = item.name;
        break;
      }
    }
  }

  // 5. Singers
  const singersMatch = desc.match(/(?:Singers?|Vocals?|Artist)\s*[:\-]\s*([^\n\r,]+)/i);
  if (singersMatch) {
    singers = singersMatch[1].trim();
  } else if (!singers) {
    singers = uploader;
  }

  // 6. Lyrics
  const lyricsMatch = desc.match(/(?:Lyrics|Lyricist)\s*[:\-]\s*([^\n\r,]+)/i);
  if (lyricsMatch) {
    lyrics = lyricsMatch[1].trim();
  }

  // 7. Genre
  const genreMatch = desc.match(/(?:Genre)\s*[:\-]\s*([^\n\r,]+)/i);
  if (genreMatch) {
    genre = genreMatch[1].trim();
  }

  // 8. Mood
  let mood = 'Melody Hits';
  const lowerText = `${title} ${desc}`.toLowerCase();
  if (['sad', 'pain', 'failure', 'breakup', 'heartbreak', 'death', 'tear'].some(k => lowerText.includes(k))) {
    mood = 'Love Failure';
  }

  if (!movie) {
    movie = 'Tamil Cinema Hits';
  }

  return {
    id: info.id || 'track',
    title: song,
    movie,
    artist: singers || 'Various Artists',
    actors: actors || 'Featured Stars',
    composer: composer || 'Music Director',
    lyricist: lyrics,
    genre,
    mood,
    duration,
    thumbnailUrl,
    videoUrl: info.webpage_url || (info.id ? `https://www.youtube.com/watch?v=${info.id}` : '')
  };
}

/**
 * Extracts YouTube metadata without downloading any media.
 * Supports multiple client fallbacks and official YouTube oEmbed fallback to bypass bot checks.
 */
export async function extractYoutubeInfo(youtubeUrl) {
  if (!isValidYoutubeUrl(youtubeUrl)) {
    throw new Error('Invalid YouTube URL format.');
  }

  // Extract clean 11-character video ID if available
  const videoIdMatch = youtubeUrl.match(/(?:watch\?v=|shorts\/|youtu\.be\/)([a-zA-Z0-9_\-]{11})/);
  const videoId = videoIdMatch ? videoIdMatch[1] : '';

  const { ytCommand, ytPrefixArgs } = await getBinaryCommands();

  // Support cookies file if specified in env or if cookies.txt exists in root or backend
  let cookieArgs = [];
  const envCookie = process.env.YOUTUBE_COOKIES || process.env.YT_COOKIES;
  const possibleCookieFiles = [
    process.env.YOUTUBE_COOKIE_PATH,
    path.join(__dirname, '../cookies.txt'),
    path.join(__dirname, '../../cookies.txt'),
    path.join(process.cwd(), 'cookies.txt')
  ].filter(Boolean);

  let activeCookiePath = null;
  if (envCookie && envCookie.trim().length > 10) {
    try {
      const tempCookiePath = path.join(os.tmpdir(), 'yt_cookies.txt');
      fs.writeFileSync(tempCookiePath, envCookie.trim(), 'utf8');
      activeCookiePath = tempCookiePath;
    } catch (_) {}
  } else {
    for (const cp of possibleCookieFiles) {
      if (fs.existsSync(cp)) {
        activeCookiePath = cp;
        break;
      }
    }
  }

  if (activeCookiePath) {
    cookieArgs = ['--cookies', activeCookiePath];
  }

  const args = [
    ...ytPrefixArgs,
    '--js-runtimes', 'node',
    '--remote-components', 'ejs:github',
    ...cookieArgs,
    ...(activeCookiePath ? [] : ['--extractor-args', 'youtube:player_skip=webpage;player_client=android']),
    '--dump-json',
    '--no-playlist',
    '--quiet',
    '--no-warnings',
    youtubeUrl.trim()
  ];

  console.log(`[YouTubeService] Extracting metadata using ${ytCommand} ${args.join(' ')}`);

  try {
    const { code, stdout, stderr } = await runProcess(ytCommand, args);
    if (code !== 0) {
      throw new Error(`yt-dlp extraction failed (code ${code}): ${stderr || 'Unknown error'}`);
    }

    try {
      const parsed = JSON.parse(stdout.trim());
      return parseRichMetadata(parsed);
    } catch (err) {
      throw new Error(`Failed to parse yt-dlp metadata JSON: ${err.message}`);
    }
  } catch (ytErr) {
    console.warn(`[YouTubeService] Primary extraction failed (${ytErr.message}). Attempting YouTube oEmbed fallback...`);

    // Resilient Fallback: Official YouTube oEmbed API (immune to datacenter/cloud bot detection)
    try {
      const targetQueryUrl = videoId ? `https://www.youtube.com/watch?v=${videoId}` : youtubeUrl.trim();
      const oembedRes = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(targetQueryUrl)}&format=json`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
      });

      if (oembedRes.ok) {
        const oembedData = await oembedRes.json();
        const fallbackInfo = {
          id: videoId || 'track',
          title: oembedData.title || 'YouTube Track',
          uploader: oembedData.author_name || 'YouTube Music',
          thumbnail: oembedData.thumbnail_url || (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : ''),
          duration: 0,
          description: `Uploaded by ${oembedData.author_name || 'YouTube Creator'}`,
          webpage_url: `https://www.youtube.com/watch?v=${videoId}`
        };
        const rich = parseRichMetadata(fallbackInfo);
        console.log(`[YouTubeService] Successfully resolved via oEmbed: "${rich.title}"`);
        return rich;
      }
    } catch (oembedErr) {
      console.warn('[YouTubeService] oEmbed fallback also failed:', oembedErr.message);
    }

    // Last resort fallback if videoId is known
    if (videoId) {
      return parseRichMetadata({
        id: videoId,
        title: 'Tamil Master Song',
        uploader: 'YouTube Artist',
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        duration: 0,
        webpage_url: `https://www.youtube.com/watch?v=${videoId}`
      });
    }

    throw ytErr;
  }
}

/**
 * Downloads audio as MP3 and thumbnail into temporary directory.
 */
export async function downloadAudioAndThumbnail({ youtubeUrl, videoId, tempDir }) {
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const { ytCommand, ytPrefixArgs, ffmpegLocation } = await getBinaryCommands();
  const outTemplate = path.join(tempDir, `${videoId}.%(ext)s`);

  // Support cookies file if specified in env or if cookies.txt exists in root or backend
  let cookieArgs = [];
  const envCookie = process.env.YOUTUBE_COOKIES || process.env.YT_COOKIES;
  const possibleCookieFiles = [
    process.env.YOUTUBE_COOKIE_PATH,
    path.join(__dirname, '../cookies.txt'),
    path.join(__dirname, '../../cookies.txt'),
    path.join(process.cwd(), 'cookies.txt')
  ].filter(Boolean);

  let activeCookiePath = null;
  if (envCookie && envCookie.trim().length > 10) {
    try {
      const tempCookiePath = path.join(tempDir, 'yt_cookies.txt');
      fs.writeFileSync(tempCookiePath, envCookie.trim(), 'utf8');
      activeCookiePath = tempCookiePath;
    } catch (_) {}
  } else {
    for (const cp of possibleCookieFiles) {
      if (fs.existsSync(cp)) {
        activeCookiePath = cp;
        break;
      }
    }
  }

  if (activeCookiePath) {
    cookieArgs = ['--cookies', activeCookiePath];
  }

  const ffmpegArgs = [];
  // Only pass --ffmpeg-location if it points to a specific custom binary/path (not generic 'ffmpeg')
  if (ffmpegLocation && ffmpegLocation !== 'ffmpeg') {
    ffmpegArgs.push('--ffmpeg-location', ffmpegLocation);
  }

  // Client strategies to bypass YouTube cloud/datacenter HTTP 429 bot checks:
  // When cookies are present: prioritize default/web client which reads cookies
  // When cookies are absent: try android/ios with webpage skipping to avoid datacenter 429
  const clientStrategies = activeCookiePath
    ? [null, 'youtube:player_client=web,mweb', 'youtube:player_client=ios']
    : [
        'youtube:player_skip=webpage;player_client=android',
        'youtube:player_skip=webpage;player_client=ios',
        null
      ];

  let lastError = '';

  for (let i = 0; i < clientStrategies.length; i++) {
    const extractorArg = clientStrategies[i];
    const args = [
      ...ytPrefixArgs,
      '--js-runtimes', 'node',
      '--remote-components', 'ejs:github',
      ...cookieArgs,
      ...(extractorArg ? ['--extractor-args', extractorArg] : []),
      '-f', 'ba/b',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '192K',
      '--write-thumbnail',
      ...ffmpegArgs,
      '-o', outTemplate,
      youtubeUrl.trim()
    ];

    console.log(`[YouTubeService] Download attempt ${i + 1}/${clientStrategies.length} with ${extractorArg}`);
    const { code, stderr } = await runProcess(ytCommand, args);

    if (code === 0) {
      // Check if audio file was produced
      const files = fs.readdirSync(tempDir);
      let audioFile = null;
      for (const f of files) {
        if (f.startsWith(videoId) && !f.endsWith('.jpg') && !f.endsWith('.webp') && !f.endsWith('.png') && !f.endsWith('.part')) {
          audioFile = path.join(tempDir, f);
          break;
        }
      }

      if (audioFile) {
        // Locate thumbnail file
        let thumbFile = null;
        for (const ext of ['.jpg', '.webp', '.png']) {
          const candidate = path.join(tempDir, `${videoId}${ext}`);
          if (fs.existsSync(candidate)) {
            thumbFile = candidate;
            break;
          }
        }
        return { audioPath: audioFile, thumbPath: thumbFile };
      }
    }

    lastError = stderr || `Attempt ${i + 1} exited with code ${code}`;
    console.warn(`[YouTubeService] Attempt ${i + 1} failed: ${lastError.slice(0, 180)}`);
  }

  throw new Error(`yt-dlp download failed: ${lastError || 'Could not download audio from YouTube.'}`);
}
