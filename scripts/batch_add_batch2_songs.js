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
    id: "uthama-puthiran-kan-irandil",
    youtubeId: "vKWv_DuhOXg",
    title: "Kan Irandil",
    movie: "Uthama Puthiran",
    year: "2010",
    artist: "Naresh Iyer",
    composer: "Vijay Antony",
    actors: "Dhanush, Genelia D'Souza, Vivek",
    genre: "Melody / Romantic",
    mood: "Love"
  },
  {
    id: "vil-ambu-aale-saachuputta",
    youtubeId: "zZipMA0aN4Y",
    title: "Aale Saachuputta",
    movie: "Vil Ambu",
    year: "2016",
    artist: "Anirudh Ravichander",
    composer: "Navin",
    actors: "Sri, Harish Kalyan, Srushti Dange",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "mapla-singam-edhukku-machan",
    youtubeId: "5r8HVhk2cv0",
    title: "Edhukku Machan",
    movie: "Mapla Singam",
    year: "2016",
    artist: "Aalap Raju, Kalpana Raghavendar",
    composer: "N. R. Raghunanthan",
    actors: "Vimal, Anjali, Soori",
    genre: "Melody / Romantic",
    mood: "Love"
  },
  {
    id: "kacheri-arambam-vithai-vithai",
    youtubeId: "szXmUU7mGs8",
    title: "Vithai Vithai",
    movie: "Kacheri Arambam",
    year: "2010",
    artist: "Shaan, D. Imman",
    composer: "D. Imman",
    actors: "Jiiva, Poonam Bajwa, Vadivelu",
    genre: "Melody / Romantic",
    mood: "Love"
  },
  {
    id: "venghai-yenna-solla-pore",
    youtubeId: "LPGGO_QoUU8",
    title: "Yenna Solla Pore",
    movie: "Venghai",
    year: "2011",
    artist: "Devi Sri Prasad",
    composer: "Devi Sri Prasad",
    actors: "Dhanush, Tamannaah, Rajkiran",
    genre: "Melody / Romantic",
    mood: "Love"
  },
  {
    id: "vel-kovakkara-kiliye",
    youtubeId: "K3-2DpmwNZ0",
    title: "Kovakkara Kiliye",
    movie: "Vel",
    year: "2007",
    artist: "Tipu, Sujatha Mohan",
    composer: "Yuvan Shankar Raja",
    actors: "Suriya, Asin, Vadivelu",
    genre: "Melody / Romantic",
    mood: "Love"
  },
  {
    id: "mappillai-ennoda-rasi",
    youtubeId: "f1kIXfzAjoQ",
    title: "Ennoda Rasi",
    movie: "Mappillai",
    year: "2011",
    artist: "Ranjith",
    composer: "Mani Sharma",
    actors: "Dhanush, Hansika Motwani, Manisha Koirala",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "saguni-kandha-kaara-vadai",
    youtubeId: "gYwapiurNvM",
    title: "Kandha Kaara Vadai",
    movie: "Saguni",
    year: "2012",
    artist: "Pushpavanam Kuppusamy, Ananthu",
    composer: "G. V. Prakash Kumar",
    actors: "Karthi, Pranitha Subhash, Santhanam",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "diesel-beer-song",
    youtubeId: "V8D5P04kZ_M",
    title: "Beer Song",
    movie: "Diesel",
    year: "2024",
    artist: "G. V. Prakash Kumar, Dhibu Ninan Thomas",
    composer: "Dhibu Ninan Thomas",
    actors: "Harish Kalyan, Athulya Ravi",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "vsop-lucka-maattikkichi",
    youtubeId: "p-HFGeg6HrE",
    title: "Lucka Maattikkichi",
    movie: "Vasuvum Saravananum Onna Padichavanga",
    year: "2015",
    artist: "D. Imman, Anirudh Ravichander",
    composer: "D. Imman",
    actors: "Arya, Santhanam, Tamannaah",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "devi-chalmaar",
    youtubeId: "n_fA0hU5-a4",
    title: "Chalmaar",
    movie: "Devi",
    year: "2016",
    artist: "Benny Dayal",
    composer: "Sajid-Wajid",
    actors: "Prabhu Deva, Tamannaah, Sonu Sood",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "saravanan-irukka-bayamaen-lalaa-kadai-saanthi",
    youtubeId: "D3O6nOrI5Ug",
    title: "Lalaa Kadai Saanthi",
    movie: "Saravanan Irukka Bayamaen",
    year: "2017",
    artist: "Benny Dayal, Sunidhi Chauhan",
    composer: "D. Imman",
    actors: "Udhayanidhi Stalin, Regina Cassandra, Soori",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "maattrraan-theeyae-theeyae",
    youtubeId: "LPAK3KU-FSw",
    title: "Theeyae Theeyae",
    movie: "Maattrraan",
    year: "2012",
    artist: "Franko, Aalap Raju, Charulatha Mani, Suchitra",
    composer: "Harris Jayaraj",
    actors: "Suriya, Kajal Aggarwal",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "ethir-neechal-boomi-enna-suthudhe",
    youtubeId: "nLaeDsf0UVI",
    title: "Boomi Enna Suthudhe",
    movie: "Ethir Neechal",
    year: "2013",
    artist: "Anirudh Ravichander",
    composer: "Anirudh Ravichander",
    actors: "Sivakarthikeyan, Priya Anand",
    genre: "Gaana / Rap",
    mood: "Mass"
  },
  {
    id: "romeo-juliet-thoovaanam",
    youtubeId: "K9jQm0FZZ98",
    title: "Thoovaanam",
    movie: "Romeo Juliet",
    year: "2015",
    artist: "Vishal Dadlani, Sunitha Sarathy",
    composer: "D. Imman",
    actors: "Jayam Ravi, Hansika Motwani",
    genre: "Melody / Romantic",
    mood: "Love"
  },
  {
    id: "aakko-enakenna-yaarum-illaye",
    youtubeId: "LwUJR22bGGI",
    title: "Enakenna Yaarum Illaye",
    movie: "Aakko",
    year: "2015",
    artist: "Anirudh Ravichander",
    composer: "Anirudh Ravichander",
    actors: "Anirudh Ravichander, Geethan Britto",
    genre: "Melody / Romantic",
    mood: "Breakup"
  },
  {
    id: "miruthan-munnal-kadhali",
    youtubeId: "q4u4zIbhkdI",
    title: "Munnal Kadhali",
    movie: "Miruthan",
    year: "2016",
    artist: "Vishal Dadlani, Sharanya Gopinath",
    composer: "D. Imman",
    actors: "Jayam Ravi, Lakshmi Menon",
    genre: "Melody / Romantic",
    mood: "Breakup"
  },
  {
    id: "romeo-sidu-sidu",
    youtubeId: "Dyt1jelmjY0",
    title: "Sidu Sidu",
    movie: "Romeo",
    year: "2024",
    artist: "Kapil Kapilan, Barath Dhanasekar",
    composer: "Barath Dhanasekar",
    actors: "Vijay Antony, Mirnalini Ravi",
    genre: "Melody / Romantic",
    mood: "Love"
  },
  {
    id: "india-pakistan-oru-ponna-parthein-mama",
    youtubeId: "81_Fsi1nX5o",
    title: "Oru Ponna Parthein Mama",
    movie: "India Pakistan",
    year: "2015",
    artist: "S. P. B. Charan",
    composer: "Deena Devarajan",
    actors: "Vijay Antony, Sushma Raj",
    genre: "Kuthu / Pop",
    mood: "Love"
  },
  {
    id: "india-pakistan-vaadi-kutty-lady",
    youtubeId: "4611ZTySPv0",
    title: "Vaadi Kutty Lady",
    movie: "India Pakistan",
    year: "2015",
    artist: "Nivas, Anitha Karthikeyan",
    composer: "Deena Devarajan",
    actors: "Vijay Antony, Sushma Raj",
    genre: "Kuthu / Pop",
    mood: "Mass"
  },
  {
    id: "mgr-chikku-bukku",
    youtubeId: "jVv7yoG6sBY",
    title: "Chikku Bukku",
    movie: "Madha Gaja Raja",
    year: "2013",
    artist: "Chinna Ponnu, Prabhu Pandala",
    composer: "Vijay Antony",
    actors: "Vishal, Anjali, Varalaxmi Sarathkumar",
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

  // 6. Clean up disk immediately to keep free space clean
  try {
    if (fs.existsSync(localAudioPath)) fs.unlinkSync(localAudioPath);
    if (localThumbPath && fs.existsSync(localThumbPath)) fs.unlinkSync(localThumbPath);
  } catch (_) {}
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
  console.log(`\n🎉 All ${songs.length} songs processed successfully! Exiting.`);
  process.exit(0);
}

run().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
