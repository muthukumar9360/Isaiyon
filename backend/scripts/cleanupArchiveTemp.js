import 'dotenv/config';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { listArchiveFiles, deleteFileFromArchive, getArchiveCredentials } from '../services/archiveService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper to load credentials from scripts/ia_config.json if backend/.env is not yet filled in local development
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
const isDryRun = args.includes('--dry-run') || !args.includes('--confirm');
const isConfirmed = args.includes('--confirm');

// 1. Protected Archive System Files (DO NOT DELETE)
const SYSTEM_EXTENSIONS = [
  '_meta.xml',
  '_meta.sqlite',
  '_files.xml',
  '_archive.torrent',
  '__ia_thumb.jpg',
  '_reviews.xml'
];

// 2. Real song file extensions
const VALID_AUDIO_EXTENSIONS = ['.mp3', '.m4a', '.wav', '.aac', '.ogg', '.flac', '.mp4'];
const VALID_COVER_EXTENSIONS = ['.jpg', '.jpeg', '.webp', '.png'];

/**
 * Checks if a file is a confirmed temporary artifact.
 */
function isConfirmedTempFile(fileName) {
  const name = fileName.trim();
  const lower = name.toLowerCase();

  // Never delete system metadata files
  if (SYSTEM_EXTENSIONS.some(sys => lower.endsWith(sys))) {
    return { isTemp: false, reason: 'Archive.org system metadata' };
  }

  // 1. Incomplete downloads or yt-dlp partial files
  if (lower.endsWith('.part') || lower.endsWith('.ytdl') || lower.endsWith('.tmp') || lower.endsWith('.temp')) {
    return { isTemp: true, reason: 'Incomplete download / temporary file extension' };
  }

  // 2. Temp prefix or contains temporary marker
  const baseName = path.basename(name).toLowerCase();
  if (baseName.startsWith('temp_') || baseName.startsWith('tmp_') || baseName.includes('_temp_')) {
    return { isTemp: true, reason: 'Temporary file naming pattern' };
  }

  // 3. Known temporary test files & probe test uploads from development
  if (
    lower.startsWith('test_') ||
    lower.startsWith('test/') ||
    lower.startsWith('test_folder/') ||
    lower.startsWith('test_sound_vault/') ||
    lower.startsWith('test_soundtrack/') ||
    lower.startsWith('folder/song name') ||
    lower.startsWith('movie/song') ||
    lower.endsWith('/test.mp3') ||
    lower === 'audio_uploads/test_run.mp3' ||
    lower === 'temp_test.mp4' || 
    lower === 'test.webp' || 
    lower.startsWith('scripts/downloads/') ||
    lower.startsWith('temp/') ||
    lower.startsWith('tmp/')
  ) {
    return { isTemp: true, reason: 'Known test or staging probe artifact' };
  }

  // 4. Legitimate structured song file: [Movie]/[Song]/[Song].(mp3|m4a|...)
  const isAudio = VALID_AUDIO_EXTENSIONS.some(ext => lower.endsWith(ext));
  const isCover = VALID_COVER_EXTENSIONS.some(ext => lower.endsWith(ext));

  if (isAudio || isCover) {
    return { isTemp: false, reason: isAudio ? 'Valid song audio file' : 'Valid cover artwork' };
  }

  // Unclear purpose: preserve safely
  return { isTemp: false, reason: 'Unrecognized file — safe keep' };
}

async function runCleanup() {
  const { identifier, accessKey } = getArchiveCredentials();

  console.log(`\n======================================================`);
  console.log(`🧹 Archive.org Vault Temporary File Cleanup Tool`);
  console.log(`📦 Item Identifier: "${identifier}"`);
  console.log(`🔒 Mode: ${isConfirmed ? '🚨 PERMANENT DELETION (--confirm)' : '🛡️ DRY RUN (--dry-run)'}`);
  console.log(`======================================================\n`);

  if (!accessKey) {
    console.error('❌ Error: Archive.org credentials are not configured in environment variables.');
    console.error('   Please set IA_ACCESS_KEY and IA_SECRET_KEY in backend/.env.');
    process.exit(1);
  }

  try {
    console.log(`Fetching file listing from Archive.org item "${identifier}"...`);
    let files = null;
    for (let attempt = 1; attempt <= 4; attempt++) {
      try {
        files = await listArchiveFiles(identifier);
        if (files) break;
      } catch (err) {
        if (attempt === 4) throw err;
        console.log(`⚠️ Listing attempt ${attempt} timed out or failed (${err.message}). Retrying in 3s...`);
        await new Promise(r => setTimeout(r, 3000));
      }
    }

    if (!files || files.length === 0) {
      console.log('No files found in this vault item.');
      return;
    }

    console.log(`Found ${files.length} total files in item. Analyzing candidates...\n`);

    const tempCandidates = [];
    const preservedFiles = [];

    for (const f of files) {
      const name = f.name || '';
      const sizeBytes = parseInt(f.size || '0', 10);
      const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
      const evalResult = isConfirmedTempFile(name);

      if (evalResult.isTemp) {
        tempCandidates.push({ name, sizeBytes, sizeMb, reason: evalResult.reason });
      } else {
        preservedFiles.push({ name, sizeMb, reason: evalResult.reason });
      }
    }

    console.log(`📊 Analysis Summary:`);
    console.log(`  - Total Files: ${files.length}`);
    console.log(`  - Preserved Songs/Covers/System: ${preservedFiles.length}`);
    console.log(`  - Confirmed Temporary Files: ${tempCandidates.length}\n`);

    if (tempCandidates.length === 0) {
      console.log('✅ Vault is clean! No temporary files detected.');
      return;
    }

    console.log('📋 Temporary Files Identified:');
    tempCandidates.forEach((item, idx) => {
      console.log(`  ${idx + 1}. ${item.name} (${item.sizeMb} MB) [Reason: ${item.reason}]`);
    });

    if (isDryRun) {
      console.log(`\n------------------------------------------------------`);
      console.log(`🛡️  DRY RUN COMPLETED`);
      console.log(`   0 files were deleted.`);
      console.log(`   To PERMANENTLY delete these ${tempCandidates.length} temporary files from Archive.org, run:`);
      console.log(`   npm run archive:cleanup-temp -- --confirm`);
      console.log(`------------------------------------------------------\n`);
      return;
    }

    // CONFIRMED EXECUTION
    console.log(`\n⚠️  Executing PERMANENT deletion for ${tempCandidates.length} files...`);
    let deletedCount = 0;
    let failedCount = 0;

    for (const item of tempCandidates) {
      process.stdout.write(`Deleting ${item.name}... `);
      try {
        const res = await deleteFileFromArchive(item.name, identifier);
        if (res.success) {
          console.log(`✅ Deleted`);
          deletedCount++;
        } else {
          console.log(`❌ Failed (status ${res.status})`);
          failedCount++;
        }
      } catch (delErr) {
        console.log(`❌ Error: ${delErr.message}`);
        failedCount++;
      }
      // Brief pause between S3 calls to prevent rate-limits
      await new Promise(r => setTimeout(r, 600));
    }

    console.log(`\n======================================================`);
    console.log(`🏁 Cleanup Completed:`);
    console.log(`   ✅ Successfully Deleted: ${deletedCount}`);
    console.log(`   ❌ Failed: ${failedCount}`);
    console.log(`======================================================\n`);
  } catch (err) {
    console.error('❌ Failed during archive cleanup:', err.message);
    process.exit(1);
  }
}

runCleanup();
