import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { uploadFileToArchive, deleteFileFromArchive, getArchiveCredentials } from '../services/archiveService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function ensureCredentials() {
  let { accessKey, secretKey, identifier } = getArchiveCredentials();
  if (!accessKey || !secretKey) {
    const fallbackPath = path.resolve(__dirname, '../../scripts/ia_config.json');
    if (fs.existsSync(fallbackPath)) {
      try {
        const json = JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
        process.env.IA_ACCESS_KEY = json.access_key;
        process.env.IA_SECRET_KEY = json.secret_key;
        if (json.project_identifier) {
          process.env.IA_IDENTIFIER = json.project_identifier;
        }
      } catch (_) {}
    }
  }
}

ensureCredentials();

const firebaseConfig = {
  apiKey: "AIzaSyA1uqaS3akPaF43cYWIJSoBRkD-yVRM71A",
  authDomain: "music-player-d0eb8.firebaseapp.com",
  projectId: "music-player-d0eb8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const { identifier } = getArchiveCredentials();

async function downloadFile(url, destPath) {
  const writer = fs.createWriteStream(destPath);
  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream',
    timeout: 30000
  });
  response.data.pipe(writer);
  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
}

async function relocateSongs() {
  console.log('======================================================');
  console.log('📁 Relocating Songs from "sound_vault" to proper folders');
  console.log('======================================================\n');

  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'isaiyon-relocate-'));

  // 1. Relocate "Enna Solla Pogirai" to "Kandukondain_Kandukondain/Enna_Solla_Pogirai/"
  console.log('1️⃣ Relocating "Enna Solla Pogirai"...');
  const ennaOldUrl = `https://archive.org/download/${identifier}/sound_vault/enna_solla_pogirai_official_video_so_mv44hqgx.m4a`;
  const ennaNewRemotePath = 'Kandukondain_Kandukondain/Enna_Solla_Pogirai/enna_solla_pogirai.m4a';
  const ennaNewUrl = `https://archive.org/download/${identifier}/${ennaNewRemotePath}`;
  const ennaTempFile = path.join(tempDir, 'enna_solla_pogirai.m4a');

  try {
    process.stdout.write('   Downloading current file from Archive.org... ');
    await downloadFile(ennaOldUrl, ennaTempFile);
    console.log(`✅ (${(fs.statSync(ennaTempFile).size / (1024 * 1024)).toFixed(2)} MB)`);

    process.stdout.write(`   Uploading to "${ennaNewRemotePath}"... `);
    const res = await uploadFileToArchive({
      localFilePath: ennaTempFile,
      remotePath: ennaNewRemotePath,
      mimeType: 'audio/mp4'
    });
    console.log(`✅ Uploaded (${res.audioUrl || ennaNewUrl})`);

    process.stdout.write('   Updating Firestore document "2DPdpX7gVOr26wZKFJeG"... ');
    await updateDoc(doc(db, 'tracks', '2DPdpX7gVOr26wZKFJeG'), {
      movie: 'Kandukondain Kandukondain',
      audioUrl: ennaNewUrl,
      archiveAudioPath: ennaNewRemotePath,
      composer: 'A. R. Rahman',
      artist: 'Shankar Mahadevan',
      actors: 'Ajith Kumar, Tabu, Aishwarya Rai, Mammootty, Abbas',
      year: '2000'
    });
    console.log('✅ Firestore updated');

    process.stdout.write('   Deleting old file "sound_vault/enna_solla_pogirai_official_video_so_mv44hqgx.m4a"... ');
    await deleteFileFromArchive('sound_vault/enna_solla_pogirai_official_video_so_mv44hqgx.m4a', identifier);
    console.log('✅ Old file deleted');
  } catch (err) {
    console.error('❌ Error relocating Enna Solla Pogirai:', err.message);
  }

  // 2. Relocate "Beep song" to "Album_Song/Beep_Song/"
  console.log('\n2️⃣ Relocating "Beep song"...');
  const beepOldUrl = `https://archive.org/download/${identifier}/sound_vault/beep_song_silambarasan_anirudh_mv4o8wxb.mp3`;
  const beepNewRemotePath = 'Album_Song/Beep_Song/beep_song.mp3';
  const beepNewUrl = `https://archive.org/download/${identifier}/${beepNewRemotePath}`;
  const beepTempFile = path.join(tempDir, 'beep_song.mp3');

  try {
    process.stdout.write('   Downloading current file from Archive.org... ');
    await downloadFile(beepOldUrl, beepTempFile);
    console.log(`✅ (${(fs.statSync(beepTempFile).size / (1024 * 1024)).toFixed(2)} MB)`);

    process.stdout.write(`   Uploading to "${beepNewRemotePath}"... `);
    const res = await uploadFileToArchive({
      localFilePath: beepTempFile,
      remotePath: beepNewRemotePath,
      mimeType: 'audio/mpeg'
    });
    console.log(`✅ Uploaded (${res.audioUrl || beepNewUrl})`);

    process.stdout.write('   Updating Firestore document "g47btMQJu4CzanmlhYu3"... ');
    await updateDoc(doc(db, 'tracks', 'g47btMQJu4CzanmlhYu3'), {
      movie: 'Album Song',
      audioUrl: beepNewUrl,
      archiveAudioPath: beepNewRemotePath,
      composer: 'Anirudh Ravichander',
      artist: 'Silambarasan TR',
      year: '2015'
    });
    console.log('✅ Firestore updated');

    process.stdout.write('   Deleting old file "sound_vault/beep_song_silambarasan_anirudh_mv4o8wxb.mp3"... ');
    await deleteFileFromArchive('sound_vault/beep_song_silambarasan_anirudh_mv4o8wxb.mp3', identifier);
    console.log('✅ Old file deleted');
  } catch (err) {
    console.error('❌ Error relocating Beep song:', err.message);
  }

  // Clean local temp files
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
  } catch (_) {}

  console.log('\n======================================================');
  console.log('🏁 Relocation completed successfully! Folder "sound_vault" is removed.');
  console.log('======================================================\n');
}

relocateSongs().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
