import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { listArchiveFiles, deleteFileFromArchive, getArchiveCredentials } from '../services/archiveService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure credentials
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

const args = process.argv.slice(2);
const isConfirmed = args.includes('--confirm');
const isDryRun = !isConfirmed;

const SYSTEM_EXTENSIONS = [
  '_meta.xml',
  '_meta.sqlite',
  '_files.xml',
  '_archive.torrent',
  '__ia_thumb.jpg',
  '_reviews.xml'
];

async function syncArchive() {
  const { identifier } = getArchiveCredentials();
  console.log('======================================================');
  console.log('🎯 Archive.org Sync Tool: Keep ONLY Firestore Songs');
  console.log(`📦 Vault Identifier: "${identifier}"`);
  console.log(`🔒 Mode: ${isDryRun ? '🛡️ DRY RUN' : '🚨 PERMANENT DELETION (--confirm)'}`);
  console.log('======================================================\n');

  // 1. Fetch live tracks from Firestore
  console.log('1️⃣ Fetching active tracks from Firebase Firestore...');
  const firebaseConfig = {
    apiKey: "AIzaSyA1uqaS3akPaF43cYWIJSoBRkD-yVRM71A",
    authDomain: "music-player-d0eb8.firebaseapp.com",
    projectId: "music-player-d0eb8"
  };
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);
  const snapshot = await getDocs(collection(db, 'tracks'));

  const activeTracks = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  console.log(`   Found ${activeTracks.length} active tracks in Firestore:`);
  activeTracks.forEach((t, i) => {
    console.log(`   ${i + 1}. "${t.title}" (${t.movie || t.artist})`);
  });

  // Extract set of preserved filenames and prefixes
  const keepFileNames = new Set();
  const keepPrefixes = new Set();

  for (const track of activeTracks) {
    const urls = [track.audioUrl, track.coverUrl, track.archiveAudioPath, track.archiveThumbPath];
    for (const u of urls) {
      if (!u) continue;
      // Strip domain and identifier if full URL
      const clean = u.replace(/^https?:\/\/[^\/]+\/download\/[^\/]+\//i, '').replace(/^\/+/, '');
      if (clean) {
        keepFileNames.add(clean.toLowerCase());
        // Also keep base without extension to preserve companion images/audio
        const dir = path.dirname(clean);
        const baseName = path.basename(clean, path.extname(clean));
        if (dir && dir !== '.') {
          keepPrefixes.add(`${dir}/${baseName}`.toLowerCase());
        }
      }
    }
  }

  // 2. Fetch all files currently in Archive.org
  console.log(`\n2️⃣ Fetching file listing from Archive.org "${identifier}"...`);
  const files = await listArchiveFiles(identifier);
  console.log(`   Found ${files.length} total files on Archive.org.`);

  const toKeep = [];
  const toDelete = [];

  for (const file of files) {
    const name = file.name || '';
    const lower = name.toLowerCase();
    const sizeBytes = parseInt(file.size || '0', 10);
    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);

    // Always preserve Archive.org system files
    if (SYSTEM_EXTENSIONS.some(sys => lower.endsWith(sys))) {
      toKeep.push({ name, sizeMb, reason: 'Archive.org System Metadata' });
      continue;
    }

    // Preserve Archive.org auto-generated video thumbnails if related to kept songs
    if (lower.startsWith(`${identifier.toLowerCase()}.thumbs/`)) {
      toKeep.push({ name, sizeMb, reason: 'Archive.org Generated Thumbnail' });
      continue;
    }

    // Check if directly matched in Firestore tracks
    if (keepFileNames.has(lower)) {
      toKeep.push({ name, sizeMb, reason: 'Referenced in Firestore Track' });
      continue;
    }

    // Check if matched by folder / basename prefix (e.g. .mp3/.mp4/.webp variants)
    const fileDir = path.dirname(name);
    const fileBase = path.basename(name, path.extname(name));
    const prefix = `${fileDir}/${fileBase}`.toLowerCase();

    // Check if file belongs to an active track folder and matches base song name
    if (keepPrefixes.has(prefix) && (lower.endsWith('.mp3') || lower.endsWith('.mp4') || lower.endsWith('.m4a') || lower.endsWith('.webp') || lower.endsWith('.jpg'))) {
      toKeep.push({ name, sizeMb, reason: 'Companion Audio/Cover for Firestore Track' });
      continue;
    }

    // Spectrograms or unreferenced files
    if (lower.includes('spectrogram')) {
      toDelete.push({ name, sizeMb, reason: 'Derived Spectrogram Image' });
      continue;
    }

    // Any other file not in Firestore
    toDelete.push({ name, sizeMb, reason: 'Not in Firebase Database' });
  }

  console.log('\n📊 Summary:');
  console.log(`  - Preserved Files (Belong to your ${activeTracks.length} Firestore songs + system): ${toKeep.length}`);
  console.log(`  - Files to Delete (Not in your Firebase database): ${toDelete.length}\n`);

  console.log('🛡️ PRESERVED FILES:');
  toKeep.forEach((f, i) => console.log(`   ${i + 1}. ${f.name} (${f.sizeMb} MB) [${f.reason}]`));

  console.log('\n🗑️ FILES MARKED FOR DELETION:');
  toDelete.forEach((f, i) => console.log(`   ${i + 1}. ${f.name} (${f.sizeMb} MB) [${f.reason}]`));

  if (toDelete.length === 0) {
    console.log('\n✅ Archive vault is already 100% in sync with Firebase database!');
    return;
  }

  if (isDryRun) {
    console.log('\n------------------------------------------------------');
    console.log('🛡️  DRY RUN COMPLETED (0 files deleted)');
    console.log(`To delete these ${toDelete.length} files permanently, run:`);
    console.log('node backend/scripts/syncArchiveWithFirestore.js --confirm');
    console.log('------------------------------------------------------\n');
    return;
  }

  // EXECUTE PERMANENT DELETION
  console.log(`\n⚠️  Executing deletion of ${toDelete.length} unreferenced files...`);
  let deleted = 0;
  let failed = 0;

  for (const item of toDelete) {
    process.stdout.write(`Deleting ${item.name}... `);
    try {
      const res = await deleteFileFromArchive(item.name, identifier);
      if (res.success) {
        console.log('✅ Deleted');
        deleted++;
      } else {
        console.log(`❌ Failed (status ${res.status})`);
        failed++;
      }
    } catch (delErr) {
      console.log(`❌ Error: ${delErr.message}`);
      failed++;
    }
    await new Promise(r => setTimeout(r, 600));
  }

  console.log('\n======================================================');
  console.log('🏁 Sync Completed:');
  console.log(`   ✅ Successfully Deleted: ${deleted}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log('======================================================\n');
}

syncArchive().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
