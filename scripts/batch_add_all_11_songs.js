import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { spawn } from 'node:child_process';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyA1uqaS3akPaF43cYWIJSoBRkD-yVRM71A",
  authDomain: "music-player-d0eb8.firebaseapp.com",
  projectId: "music-player-d0eb8",
  storageBucket: "music-player-d0eb8.firebasestorage.app",
  messagingSenderId: "167959878686",
  appId: "1:167959878686:web:199f75f091d0e3d59ca20f"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const accessKey = "sftYc6GkCtNMjk7H";
const secretKey = "lR6TOMtJUAnE7tZg";
const identifier = "muthuramalingam_a-vault";

const ffmpegExe = path.resolve('scripts/ffmpeg.exe');
const cookiesTxt = path.resolve('backend/cookies.txt');
const downloadsDir = path.resolve('scripts/downloads');

if (!fs.existsSync(downloadsDir)) {
  fs.mkdirSync(downloadsDir, { recursive: true });
}

function slugify(text) {
  return text
    .toString()
    .trim()
    .replace(/[\s\-\.]+/g, '_')
    .replace(/[^\w]/g, '')
    .replace(/_+/g, '_');
}

function runCommand(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { shell: process.platform === 'win32' });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', d => { stdout += d; });
    p.stderr.on('data', d => { stderr += d; });
    p.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`Command ${cmd} exited with code ${code}: ${stderr || stdout}`));
    });
  });
}

async function getAudioDuration(filePath) {
  try {
    const { stderr } = await runCommand(ffmpegExe, ['-i', filePath]);
    const match = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
    if (match) {
      const hours = parseInt(match[1], 10);
      const minutes = parseInt(match[2], 10);
      const seconds = parseFloat(match[3]);
      return Math.round(hours * 3600 + minutes * 60 + seconds);
    }
  } catch (err) {
    if (err.message) {
      const match = err.message.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseFloat(match[3]);
        return Math.round(hours * 3600 + minutes * 60 + seconds);
      }
    }
  }
  return 240;
}

async function uploadFileToArchive(localPath, remotePath, mimeType) {
  const stat = fs.statSync(localPath);
  const fileSize = stat.size;
  const encodedPath = remotePath.split('/').map(part => encodeURIComponent(part)).join('/');
  const uploadUrl = `https://s3.us.archive.org/${identifier}/${encodedPath}`;

  const headers = {
    'authorization': `LOW ${accessKey}:${secretKey}`,
    'x-archive-size-hint': String(fileSize),
    'x-archive-ignore-preexisting-bucket': '1',
    'x-archive-interactive-priority': '1',
    'x-archive-queue-derive': '0',
    'content-type': mimeType,
    'content-length': String(fileSize),
    'x-archive-meta-mediatype': mimeType.startsWith('image/') ? 'image' : 'audio',
    'x-archive-meta-collection': 'opensource_audio'
  };

  console.log(`   [Vault] Uploading ${path.basename(localPath)} (${(fileSize / (1024 * 1024)).toFixed(2)} MB)...`);

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      await new Promise((resolve, reject) => {
        const fileStream = fs.createReadStream(localPath);
        const req = https.request(uploadUrl, { method: 'PUT', headers }, (res) => {
          let responseBody = '';
          res.on('data', chunk => { responseBody += chunk; });
          res.on('end', () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve();
            } else {
              reject(new Error(`Archive.org error ${res.statusCode}: ${responseBody}`));
            }
          });
        });
        req.on('error', reject);
        fileStream.on('error', (err) => { req.destroy(err); reject(err); });
        fileStream.pipe(req);
      });
      return `https://archive.org/download/${identifier}/${remotePath}`;
    } catch (err) {
      console.warn(`   [Vault] Attempt ${attempt} failed: ${err.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 2000 * attempt));
      else throw err;
    }
  }
}

const songs = [
  {
    id: "kavan-oxygen",
    youtubeId: "rwcEoekEumg",
    title: "Oxygen",
    movie: "Kavan",
    year: "2017",
    artist: "Hiphop Tamizha, Sudharshan Ashok",
    composer: "Hiphop Tamizha",
    actors: "Vijay Sethupathi, Madonna Sebastian, T. Rajendar",
    genre: "Melody / Romantic",
    mood: "Love"
  },
  {
    id: "ynm-nenjai-kasakki",
    youtubeId: "f3lsGSFefS8",
    title: "Nenjai Kasakki",
    movie: "Yaaradi Nee Mohini",
    year: "2008",
    artist: "Udit Narayan, Suchitra",
    composer: "Yuvan Shankar Raja",
    actors: "Dhanush, Nayanthara, Raghuvaran",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "podaa-podi-appan-mavanae-vaada",
    youtubeId: "v0pXMxU87JQ",
    title: "Appan Mavanae Vaada",
    movie: "Podaa Podi",
    year: "2012",
    artist: "Silambarasan TR",
    composer: "Dharan Kumar",
    actors: "Silambarasan TR, Varalaxmi Sarathkumar",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "komban-karuppu-nerathazhagi",
    youtubeId: "NDNjEMHeHi4",
    title: "Karuppu Nerathazhagi",
    movie: "Komban",
    year: "2015",
    artist: "Velmurugan, Malavika Sundar",
    composer: "G. V. Prakash Kumar",
    actors: "Karthi, Lakshmi Menon, Rajkiran",
    genre: "Folk / Classical",
    mood: "Love"
  },
  {
    id: "azhagu-raja-yaarukkum-sollaama",
    youtubeId: "tKwN6tZrayU",
    title: "Yaarukkum Sollaama",
    movie: "All in All Azhagu Raja",
    year: "2013",
    artist: "Rahul Nambiar",
    composer: "S. Thaman",
    actors: "Karthi, Kajal Aggarwal, Santhanam",
    genre: "Melody / Romantic",
    mood: "Love"
  },
  {
    id: "osthe-pondatti",
    youtubeId: "pfHJ_BIQ7P8",
    title: "Pondatti",
    movie: "Osthe",
    year: "2011",
    artist: "Silambarasan TR",
    composer: "S. Thaman",
    actors: "Silambarasan TR, Richa Gangopadhyay, Santhanam",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "pattatthu-yaanai-enna-oru-enna-oru",
    youtubeId: "-jgsZO-iOfA",
    title: "Enna Oru Enna Oru",
    movie: "Pattatthu Yaanai",
    year: "2013",
    artist: "Karthik",
    composer: "S. Thaman",
    actors: "Vishal, Aishwarya Arjun, Santhanam",
    genre: "Melody / Romantic",
    mood: "Love"
  },
  {
    id: "madha-yaanai-koottam-kona-kondakari",
    youtubeId: "ovYSmZj85Es",
    title: "Kona Kondakari",
    movie: "Madha Yaanai Koottam",
    year: "2013",
    artist: "G. V. Prakash Kumar",
    composer: "N. R. Raghunanthan",
    actors: "Kathir, Oviya",
    genre: "Folk / Classical",
    mood: "Love"
  },
  {
    id: "kaththi-paalam",
    youtubeId: "XWlWvLauIrg",
    title: "Paalam",
    movie: "Kaththi",
    year: "2014",
    artist: "Shankar Mahadevan, Shweta Mohan",
    composer: "Anirudh Ravichander",
    actors: "Thalapathy Vijay, Samantha",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "kaththi-pakkam-vanthu",
    youtubeId: "Zy_KwCohQd0",
    title: "Pakkam Vanthu",
    movie: "Kaththi",
    year: "2014",
    artist: "Anirudh Ravichander, Hiphop Tamizha",
    composer: "Anirudh Ravichander",
    actors: "Thalapathy Vijay, Samantha",
    genre: "Gaana / Rap",
    mood: "Mass"
  },
  {
    id: "naadodigal-aadunga-da",
    youtubeId: "KHuRa7azu08",
    title: "Aadunga Da",
    movie: "Naadodigal",
    year: "2009",
    artist: "Velmurugan",
    composer: "Sundar C. Babu",
    actors: "Sasikumar, Vijay Vasanth, Bharani, Ananya",
    genre: "Kuthu / Pop",
    mood: "Mass"
  }
];

async function processSong(item, index, total) {
  console.log(`\n======================================================`);
  console.log(`[${index + 1}/${total}] Processing: "${item.title}" (${item.movie})`);
  console.log(`======================================================`);

  const movieSlug = slugify(item.movie);
  const songSlug = slugify(item.title);
  const audioOutName = `${songSlug}_${item.youtubeId}.mp3`;
  const localAudioPath = path.join(downloadsDir, audioOutName);

  // 1. Download if not already on disk
  if (!fs.existsSync(localAudioPath)) {
    console.log(`   Downloading audio & thumbnail for ${item.youtubeId}...`);
    const ytUrl = `https://youtu.be/${item.youtubeId}`;
    const ytArgs = [
      '-m', 'yt_dlp',
      '--ffmpeg-location', ffmpegExe,
      '--cookies', cookiesTxt,
      '--js-runtimes', 'node',
      '-f', 'ba/b',
      '-x',
      '--audio-format', 'mp3',
      '--audio-quality', '192K',
      '--write-thumbnail',
      '-o', path.join(downloadsDir, `${songSlug}_${item.youtubeId}.%(ext)s`),
      ytUrl
    ];
    await runCommand('py', ytArgs);
  } else {
    console.log(`   Audio already downloaded at: ${localAudioPath}`);
  }

  // Find thumbnail
  let localThumbPath = null;
  for (const ext of ['.webp', '.jpg', '.png']) {
    const cand = path.join(downloadsDir, `${songSlug}_${item.youtubeId}${ext}`);
    if (fs.existsSync(cand)) {
      localThumbPath = cand;
      break;
    }
  }

  // 2. Calculate duration
  const duration = await getAudioDuration(localAudioPath);
  console.log(`   Duration: ${duration}s (${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')})`);

  // 3. Upload audio to Archive.org
  const remoteAudioPath = `${movieSlug}/${songSlug}/${songSlug}.mp3`;
  const audioUrl = await uploadFileToArchive(localAudioPath, remoteAudioPath, 'audio/mpeg');

  // 4. Upload thumbnail to Archive.org
  let coverUrl = `https://i.ytimg.com/vi/${item.youtubeId}/hqdefault.jpg`;
  let remoteThumbPath = '';
  if (localThumbPath) {
    const ext = path.extname(localThumbPath).toLowerCase();
    const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
    remoteThumbPath = `${movieSlug}/${songSlug}/${songSlug}${ext}`;
    coverUrl = await uploadFileToArchive(localThumbPath, remoteThumbPath, mime);
  }

  // 5. Save track document into Firestore
  const trackDoc = {
    title: item.title,
    movie: item.movie,
    artist: item.artist,
    composer: item.composer,
    actors: item.actors,
    genre: item.genre,
    mood: item.mood,
    year: item.year,
    duration,
    audioUrl,
    coverUrl,
    archiveAudioPath: remoteAudioPath,
    archiveThumbPath: remoteThumbPath,
    vaultIdentifier: identifier,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  console.log(`   [Firestore] Writing document "tracks/${item.id}"...`);
  await setDoc(doc(db, "tracks", item.id), trackDoc);
  console.log(`   ✅ Saved successfully: "${item.title}"`);
}

async function run() {
  console.log(`🚀 Starting batch processing of ${songs.length} songs...\n`);
  for (let i = 0; i < songs.length; i++) {
    try {
      await processSong(songs[i], i, songs.length);
    } catch (err) {
      console.error(`❌ Failed processing "${songs[i].title}":`, err.message);
    }
  }
  console.log(`\n🎉 All songs processed! Exiting.`);
  process.exit(0);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
