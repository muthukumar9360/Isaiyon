import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
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

function checkCommand(cmd, args) {
  return new Promise((resolve) => {
    try {
      const proc = spawn(cmd, args, { shell: true, stdio: 'ignore' });
      proc.on('error', () => resolve(false));
      proc.on('close', (code) => resolve(code === 0));
    } catch {
      resolve(false);
    }
  });
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
 */
export async function extractYoutubeInfo(youtubeUrl) {
  if (!isValidYoutubeUrl(youtubeUrl)) {
    throw new Error('Invalid YouTube URL format.');
  }

  const { ytCommand, ytPrefixArgs } = await getBinaryCommands();
  const args = [
    ...ytPrefixArgs,
    '--dump-json',
    '--no-playlist',
    '--quiet',
    '--no-warnings',
    youtubeUrl.trim()
  ];

  console.log(`[YouTubeService] Extracting metadata using ${ytCommand} ${args.join(' ')}`);

  return new Promise((resolve, reject) => {
    const proc = spawn(ytCommand, args, { shell: true });
    let stdoutData = '';
    let stderrData = '';

    proc.stdout.on('data', (data) => {
      stdoutData += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp extraction failed (code ${code}): ${stderrData || 'Unknown error'}`));
      }

      try {
        const parsed = JSON.parse(stdoutData.trim());
        const rich = parseRichMetadata(parsed);
        resolve(rich);
      } catch (err) {
        reject(new Error(`Failed to parse yt-dlp metadata JSON: ${err.message}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn yt-dlp: ${err.message}`));
    });
  });
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

  const args = [
    ...ytPrefixArgs,
    '--extractor-args', 'youtube:player_client=android,web',
    '-x',
    '--audio-format', 'mp3',
    '--audio-quality', '192K',
    '--write-thumbnail',
    '-o', outTemplate
  ];

  if (ffmpegLocation) {
    args.push('--ffmpeg-location', ffmpegLocation);
  }

  args.push(youtubeUrl.trim());

  console.log(`[YouTubeService] Downloading audio & thumb: ${ytCommand} ${args.join(' ')}`);

  await new Promise((resolve, reject) => {
    const proc = spawn(ytCommand, args, { shell: true });
    let stderrData = '';

    proc.stderr.on('data', (data) => {
      stderrData += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`yt-dlp download failed (code ${code}): ${stderrData}`));
      }
      resolve();
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn yt-dlp download: ${err.message}`));
    });
  });

  // Locate audio file
  const files = fs.readdirSync(tempDir);
  let audioFile = null;
  for (const f of files) {
    if (f.startsWith(videoId) && !f.endsWith('.jpg') && !f.endsWith('.webp') && !f.endsWith('.png') && !f.endsWith('.part')) {
      audioFile = path.join(tempDir, f);
      break;
    }
  }

  // Locate thumbnail file
  let thumbFile = null;
  for (const ext of ['.jpg', '.webp', '.png']) {
    const candidate = path.join(tempDir, `${videoId}${ext}`);
    if (fs.existsSync(candidate)) {
      thumbFile = candidate;
      break;
    }
  }

  if (!audioFile) {
    throw new Error('Audio file was not generated by yt-dlp.');
  }

  return { audioPath: audioFile, thumbPath: thumbFile };
}
