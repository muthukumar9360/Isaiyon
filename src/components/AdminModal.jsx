import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  RefreshCw, 
  Upload, 
  CheckCircle2, 
  ExternalLink, 
  Edit3, 
  Smartphone, 
  Monitor, 
  Music, 
  Image as ImageIcon, 
  Link as LinkIcon, 
  FileAudio,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { storage, ref, uploadBytes, uploadBytesResumable, getDownloadURL } from '../firebase/config';
import { compressImage } from '../utils/imageCompressor';

const YoutubeIcon = ({ size = 18, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className="inline mr-1.5 shrink-0">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const slugify = (text, fallback = 'soundtrack') => {
  if (!text || typeof text !== 'string') return fallback;
  const clean = text
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return clean.substring(0, 36) || fallback;
};

const getAudioMimeType = (ext) => {
  switch (ext) {
    case 'mp3': return 'audio/mpeg';
    case 'm4a': return 'audio/mp4';
    case 'wav': return 'audio/wav';
    case 'aac': return 'audio/aac';
    case 'ogg': return 'audio/ogg';
    case 'flac': return 'audio/flac';
    case 'mp4': return 'audio/mp4';
    default: return 'audio/mpeg';
  }
};

const detectAudioFormat = async (file) => {
  try {
    const slice = file.slice(0, 16);
    const buffer = await slice.arrayBuffer();
    const bytes = new Uint8Array(buffer);

    // ID3v2 tag (MP3)
    if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
      return { ext: 'mp3', mime: 'audio/mpeg' };
    }
    // MPEG Audio frame sync: 0xFF 0xFB, 0xFF 0xF3, 0xFF 0xF2, 0xFF 0xE3
    if (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0) {
      return { ext: 'mp3', mime: 'audio/mpeg' };
    }
    // MP4 / M4A (AAC / ALAC): "ftyp" at offset 4
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
      return { ext: 'm4a', mime: 'audio/mp4' };
    }
    // RIFF WAV
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
      return { ext: 'wav', mime: 'audio/wav' };
    }
    // Ogg container
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
      return { ext: 'ogg', mime: 'audio/ogg' };
    }
    // FLAC
    if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
      return { ext: 'flac', mime: 'audio/flac' };
    }
  } catch (_) {}

  // Fallback to filename extension
  const rawExt = (file.name.split('.').pop() || '').toLowerCase().trim();
  if (['mp3', 'm4a', 'wav', 'aac', 'ogg', 'flac', 'mp4'].includes(rawExt)) {
    return { ext: rawExt, mime: getAudioMimeType(rawExt) };
  }
  return { ext: 'mp3', mime: 'audio/mpeg' };
};

const executeArchiveUpload = (file, remotePath, onProgress, mimeTypeOverride) => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    // Normalize path to prevent double slashes or malformed encoding
    const cleanPath = remotePath
      .split('/')
      .filter(Boolean)
      .map(part => encodeURIComponent(part))
      .join('/');
    const url = `https://s3.us.archive.org/muthuramalingam_a-vault/${cleanPath}`;

    xhr.open('PUT', url, true);
    // Standard Internet Archive S3 REST upload headers
    xhr.setRequestHeader('authorization', 'LOW sftYc6GkCtNMjk7H:lR6TOMtJUAnE7tZg');
    xhr.setRequestHeader('x-archive-size-hint', String(file.size));
    xhr.setRequestHeader('x-archive-ignore-preexisting-bucket', '1');
    xhr.setRequestHeader('x-archive-interactive-priority', '1');
    // Disable server derive validator that rejects non-standard mobile files
    xhr.setRequestHeader('x-archive-queue-derive', '0');

    const ext = cleanPath.split('.').pop()?.toLowerCase() || 'mp3';
    xhr.setRequestHeader('content-type', mimeTypeOverride || getAudioMimeType(ext));

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        const pct = Math.round((e.loaded / e.total) * 100);
        onProgress(pct);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(`https://archive.org/download/muthuramalingam_a-vault/${cleanPath}`);
      } else {
        let errorDetail = xhr.statusText || 'Upload rejected';
        try {
          if (xhr.responseText) {
            const parser = new DOMParser();
            const xml = parser.parseFromString(xhr.responseText, 'application/xml');
            const msg = xml.querySelector('Message')?.textContent || xml.querySelector('Code')?.textContent;
            if (msg) {
              errorDetail = msg;
            } else {
              const textClean = xhr.responseText.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 150);
              if (textClean) errorDetail = textClean;
            }
          }
        } catch (_) {}
        reject(new Error(`Vault upload error: ${errorDetail} (${xhr.status})`));
      }
    };

    xhr.onerror = () => {
      reject(new Error("Network connection error. Please verify your internet connection."));
    };

    xhr.ontimeout = () => {
      reject(new Error("Upload timed out. The file might be too large for your current network."));
    };
    xhr.timeout = 360000; // 6 minutes for large mobile audio files

    xhr.send(file);
  });
};

const uploadFileToArchiveS3 = async (file, remotePath, onProgress, mimeTypeOverride) => {
  try {
    return await executeArchiveUpload(file, remotePath, onProgress, mimeTypeOverride);
  } catch (err) {
    console.warn("Primary Vault S3 upload attempt failed, attempting fallback path...", err);
    // Retry once with a clean flat path to bypass any nested folder restrictions
    const ext = remotePath.split('.').pop()?.toLowerCase() || 'mp3';
    const fallbackPath = `audio_uploads/track_${Date.now().toString(36)}.${ext}`;
    return await executeArchiveUpload(file, fallbackPath, onProgress, mimeTypeOverride);
  }
};

export default function AdminModal({
  isOpen,
  onClose,
  onSaveTrack,
  tracks = []
}) {
  // Mode: 'direct' (Mobile friendly direct MP3/URL) | 'youtube' (PC Python bridge)
  const [activeTab, setActiveTab] = useState('direct');
  const [isBridgeOnline, setIsBridgeOnline] = useState(false);
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Existing movies for quick autocomplete
  const existingMovies = useMemo(() => {
    const movieSet = new Set();
    tracks.forEach(t => {
      if (t.movie && typeof t.movie === 'string' && t.movie.trim()) {
        movieSet.add(t.movie.trim());
      }
    });
    return Array.from(movieSet).sort((a, b) => a.localeCompare(b));
  }, [tracks]);

  // Check Python bridge connectivity on open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const checkBridge = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 900);
        const res = await fetch('http://127.0.0.1:5001/api/status', { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (isMounted && data.status === 'online') {
          setIsBridgeOnline(true);
        }
      } catch {
        if (isMounted) {
          setIsBridgeOnline(false);
          setActiveTab('direct'); // Default to direct upload if bridge offline
        }
      }
    };
    checkBridge();
    return () => { isMounted = false; };
  }, [isOpen]);

  // -------------------------------------------------------------
  // DIRECT UPLOAD STATE (Mobile / Standalone)
  // -------------------------------------------------------------
  const [directAudioType, setDirectAudioType] = useState('file'); // 'file' | 'url'
  const [directAudioFile, setDirectAudioFile] = useState(null);
  const [directAudioDuration, setDirectAudioDuration] = useState(250);
  const [directAudioUrl, setDirectAudioUrl] = useState('');

  const [directCoverBase64, setDirectCoverBase64] = useState('');
  const [directCoverUrl, setDirectCoverUrl] = useState('');

  const [directForm, setDirectForm] = useState({
    title: '',
    movie: '',
    composer: '',
    artist: '',
    actors: '',
    genre: 'Soundtrack',
    mood: 'Melody Hits'
  });

  // -------------------------------------------------------------
  // YOUTUBE BRIDGE STATE (Laptop Python)
  // -------------------------------------------------------------
  const [ytUrl, setYtUrl] = useState('');
  const [ytStage, setYtStage] = useState('input'); // 'input' | 'preview_edit' | 'done'
  const [ytIsFetching, setYtIsFetching] = useState(false);
  const [ytIsUploading, setYtIsUploading] = useState(false);
  const [ytEditMeta, setYtEditMeta] = useState({
    title: '',
    movie: '',
    actors: '',
    composer: '',
    artist: '',
    genre: 'Soundtrack',
    mood: 'Melody Hits',
    thumbnailUrl: '',
    duration: 250
  });
  const [ytUploadResult, setYtUploadResult] = useState(null);

  // Common UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const [successCreatedTrack, setSuccessCreatedTrack] = useState(null);

  if (!isOpen) return null;

  // -------------------------------------------------------------
  // DIRECT UPLOAD HANDLERS
  // -------------------------------------------------------------
  const handleDirectAudioPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDirectAudioFile(file);

    // Auto-fill title if empty
    if (!directForm.title) {
      const baseName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setDirectForm(prev => ({ ...prev, title: baseName }));
    }

    // Try calculating exact duration in browser memory
    try {
      const tempAudio = new Audio();
      tempAudio.src = URL.createObjectURL(file);
      tempAudio.onloadedmetadata = () => {
        if (tempAudio.duration && !isNaN(tempAudio.duration)) {
          setDirectAudioDuration(Math.round(tempAudio.duration));
        }
      };
    } catch (_) {}
  };

  const handleDirectCoverPick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setStatusMessage('Compressing cover artwork...');
      const compressed = await compressImage(file, 500, 500, 0.82);
      setDirectCoverBase64(compressed);
      setStatusMessage('');
    } catch (err) {
      alert('Failed to process image: ' + err.message);
    }
  };

  const handleDirectSubmit = async (e) => {
    e.preventDefault();
    if (!directForm.title.trim()) {
      alert('Please enter a Song Title.');
      return;
    }

    if (directAudioType === 'file' && !directAudioFile) {
      alert('Please select an audio file from your device.');
      return;
    }
    if (directAudioType === 'url' && !directAudioUrl.trim()) {
      alert('Please enter a direct audio streaming URL.');
      return;
    }

    setIsSubmitting(true);
    setUploadProgress(15);
    setStatusMessage('Preparing track for Vault...');

    // Request Screen Wake Lock so mobile display does not sleep during upload
    let wakeLockSentinel = null;
    try {
      if ('wakeLock' in navigator) {
        wakeLockSentinel = await navigator.wakeLock.request('screen');
      }
    } catch (_) {}

    try {
      let finalAudioUrl = directAudioUrl.trim();

      // 1. Upload audio file if chosen (Direct Archive.org S3 upload from browser without Python)
      if (directAudioType === 'file' && directAudioFile) {
        const sizeMb = (directAudioFile.size / (1024 * 1024)).toFixed(1);
        setStatusMessage(`Uploading audio to Vault: 0.0 / ${sizeMb} MB (0%)...`);
        setUploadProgress(10);

        const detected = await detectAudioFormat(directAudioFile);
        const fileExt = detected.ext;
        const mimeType = detected.mime;

        const movieSlug = slugify(directForm.movie || 'Sound Vault', 'vault');
        const songSlug = slugify(directForm.title, 'song_' + Date.now().toString(36));
        const uniqueId = Date.now().toString(36);
        // Clean 2-level path: "movie_slug/song_slug_uniqueid.ext"
        const remoteAudioPath = `${movieSlug}/${songSlug}_${uniqueId}.${fileExt}`;

        try {
          finalAudioUrl = await uploadFileToArchiveS3(
            directAudioFile,
            remoteAudioPath,
            (pct) => {
              const currentMb = ((directAudioFile.size * pct / 100) / (1024 * 1024)).toFixed(1);
              if (pct >= 100) {
                setUploadProgress(92);
                setStatusMessage(`Audio uploaded. Verifying in Vault`);
              } else {
                setUploadProgress(Math.round(10 + pct * 0.78));
                setStatusMessage(`Uploading audio : ${currentMb} / ${sizeMb} MB`);
              }
            },
            mimeType
          );
          setUploadProgress(90);
        } catch (uploadErr) {
          console.warn("Direct Vault S3 upload error:", uploadErr);
          throw new Error("Could not upload audio file: " + uploadErr.message);
        }
      } else {
        setUploadProgress(85);
      }

      // 2. Cover artwork: use client-compressed base64 instantly (0ms delay)
      const finalCoverUrl = directCoverBase64 || directCoverUrl.trim() || '/logo.png';
      setUploadProgress(92);

      // 3. Match canonical movie
      const matchedMovie = existingMovies.find(
        m => m.toLowerCase() === (directForm.movie || '').trim().toLowerCase()
      );
      const canonicalMovie = matchedMovie || (directForm.movie || '').trim() || 'Sound Vault';

      // 4. Save track to Firestore
      setStatusMessage('Saving track to Vault database...');
      setUploadProgress(95);
      const trackToSave = {
        title: directForm.title.trim(),
        movie: canonicalMovie,
        actors: directForm.actors.trim(),
        composer: directForm.composer.trim(),
        artist: directForm.artist.trim(),
        genre: directForm.genre || 'Soundtrack',
        mood: directForm.mood || 'Melody Hits',
        duration: directAudioDuration || 240,
        audioUrl: finalAudioUrl,
        coverUrl: finalCoverUrl,
        source: directAudioType === 'file' ? 'archive_direct' : 'direct_url'
      };

      await onSaveTrack(trackToSave);
      setSuccessCreatedTrack(trackToSave);
      setUploadProgress(100);
      setStatusMessage('Song successfully saved to Vault!');
    } catch (err) {
      setUploadProgress(0);
      setStatusMessage('Error: ' + err.message);
    } finally {
      if (wakeLockSentinel) {
        try {
          await wakeLockSentinel.release();
        } catch (_) {}
      }
      setIsSubmitting(false);
    }
  };

  const resetDirectForm = () => {
    setDirectAudioFile(null);
    setDirectAudioUrl('');
    setDirectCoverBase64('');
    setDirectCoverUrl('');
    setDirectForm({
      title: '',
      movie: '',
      composer: '',
      artist: '',
      actors: '',
      genre: 'Soundtrack',
      mood: 'Melody Hits'
    });
    setSuccessCreatedTrack(null);
    setUploadProgress(0);
    setStatusMessage('');
  };

  // -------------------------------------------------------------
  // YOUTUBE BRIDGE HANDLERS
  // -------------------------------------------------------------
  const handleYtFetchInfo = async (e) => {
    e.preventDefault();
    if (!ytUrl) {
      alert('Please enter a YouTube video URL.');
      return;
    }
    setYtIsFetching(true);
    setStatusMessage('Fetching song credits from YouTube...');
    try {
      const res = await fetch('http://127.0.0.1:5001/api/extract-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ytUrl })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setYtEditMeta({
          ...data.data,
          projectIdentifier: 'muthuramalingam_a-vault'
        });
        setYtStage('preview_edit');
        setStatusMessage('Review or edit details below before uploading.');
      } else {
        setStatusMessage('Fetch error: ' + (data.error || 'Could not extract metadata'));
      }
    } catch (err) {
      setStatusMessage('Error contacting local Python bridge: ' + err.message);
    } finally {
      setYtIsFetching(false);
    }
  };

  const handleYtConfirmUpload = async (e) => {
    e.preventDefault();
    setYtIsUploading(true);
    setUploadProgress(15);
    setStatusMessage('1/2 Downloading audio & uploading to Archive.org folders...');

    const progressTimer = setInterval(() => {
      setUploadProgress(prev => (prev < 80 ? prev + 5 : prev));
    }, 600);

    try {
      const matchedMovie = existingMovies.find(
        m => m.toLowerCase() === (ytEditMeta.movie || '').trim().toLowerCase()
      );
      const canonicalMovie = matchedMovie || (ytEditMeta.movie || '').trim();

      const payload = {
        ...ytEditMeta,
        movie: canonicalMovie,
        url: ytUrl,
        projectIdentifier: 'muthuramalingam_a-vault'
      };

      const res = await fetch('http://127.0.0.1:5001/api/upload-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success && result.audioUrl) {
        clearInterval(progressTimer);
        setUploadProgress(90);
        setStatusMessage('2/2 Saving track to your Firebase database...');
        const trackToSave = {
          title: ytEditMeta.title.trim(),
          movie: canonicalMovie,
          actors: ytEditMeta.actors,
          composer: ytEditMeta.composer,
          artist: ytEditMeta.artist,
          genre: ytEditMeta.genre,
          mood: ytEditMeta.mood,
          duration: ytEditMeta.duration || 260,
          audioUrl: result.audioUrl,
          coverUrl: result.coverUrl || ytEditMeta.thumbnailUrl,
          archiveDetailsUrl: result.archiveDetailsUrl,
          archivePath: result.remoteAudioPath,
          source: 'archive.org'
        };

        await onSaveTrack(trackToSave);
        setUploadProgress(100);
        setYtUploadResult(result);
        setYtStage('done');
        setStatusMessage('Song uploaded to Archive.org and permanently saved to Vault!');
      } else {
        clearInterval(progressTimer);
        setUploadProgress(0);
        setStatusMessage('Upload error: ' + (result.error || 'Failed to complete upload'));
      }
    } catch (err) {
      clearInterval(progressTimer);
      setUploadProgress(0);
      setStatusMessage('Error during upload: ' + err.message);
    } finally {
      clearInterval(progressTimer);
      setYtIsUploading(false);
    }
  };

  const resetYtAll = () => {
    setYtStage('input');
    setYtUrl('');
    setYtUploadResult(null);
    setUploadProgress(0);
    setStatusMessage('');
  };

  return (
    <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs flex items-center justify-center p-3.5 z-50 select-none animate-[modalPop_0.2s_ease-out]">
      <div 
        className="w-full max-w-md bg-white rounded-3xl p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        {/* Header with Close */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center font-bold">
              <Music size={16} />
            </div>
            <div>
              <h3 className="text-md font-extrabold text-slate-900 font-display">
                Add New Track to Vault
              </h3>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
            title="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Tab Switcher: Direct Mobile Upload vs YouTube Importer */}
        <div className="flex items-center gap-1.5 p-2 bg-slate-100 rounded-2xl mb-3.5">
          <button
            type="button"
            onClick={() => { setActiveTab('direct'); setStatusMessage(''); }}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'direct'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Smartphone size={14} className={activeTab === 'direct' ? 'text-amber-500' : ''} />
            <span>Direct Upload</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('youtube'); setStatusMessage(''); }}
            className={`flex-1 py-2 px-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'youtube'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <YoutubeIcon size={14} />
            <span>YouTube Bridge</span>
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TAB 1: DIRECT UPLOAD (MOBILE & STANDALONE - NO PYTHON NEEDED)             */}
        {/* ========================================================================= */}
        {activeTab === 'direct' && (
          <div>
            {successCreatedTrack ? (
              /* Success Screen */
              <div className="text-center py-4 flex flex-col gap-3">
                <CheckCircle2 size={44} className="text-emerald-500 mx-auto animate-[modalPop_0.3s_ease-out]" />
                <div>
                  <h4 className="text-sm font-black text-slate-900 font-display">
                    Track Added to Vault!
                  </h4>
                </div>

                <div className="flex gap-2.5 items-center p-2.5 bg-slate-50 rounded-2xl border border-slate-100 max-w-lg text-left">
                  <img 
                    src={successCreatedTrack.coverUrl || '/logo.png'} 
                    alt="Cover" 
                    className="w-12 h-12 rounded-xl object-cover shrink-0" 
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{successCreatedTrack.title}</p>
                    <p className="text-[11px] mt-1 text-slate-500 truncate">{successCreatedTrack.movie}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2 mt-2">
                  <button
                    type="button"
                    onClick={resetDirectForm}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
                  >
                    + Add Another Song
                  </button>
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            ) : (
              /* Direct Input Form */
              <form onSubmit={handleDirectSubmit} className="flex flex-col gap-3">
                
                {/* 1. Audio Source Selector */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      * 1. Audio Source
                    </label>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                      <button
                        type="button"
                        onClick={() => setDirectAudioType('file')}
                        className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                          directAudioType === 'file' ? 'bg-amber-100 text-amber-800 font-bold' : 'hover:bg-slate-100'
                        }`}
                      >
                        MP3 File
                      </button>
                      <span>|</span>
                      <button
                        type="button"
                        onClick={() => setDirectAudioType('url')}
                        className={`px-2 py-0.5 rounded-md cursor-pointer transition-colors ${
                          directAudioType === 'url' ? 'bg-amber-100 text-amber-800 font-bold' : 'hover:bg-slate-100'
                        }`}
                      >
                        Audio URL
                      </button>
                    </div>
                  </div>

                  {directAudioType === 'file' ? (
                    <div>
                      <input
                        type="file"
                        ref={audioInputRef}
                        accept="audio/*,.mp3,.m4a,.wav,.aac,.ogg"
                        onChange={handleDirectAudioPick}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => audioInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="w-full p-3 rounded-2xl border-2 border-dashed border-amber-300 hover:border-amber-400 bg-amber-50/40 hover:bg-amber-50 text-slate-700 flex flex-col items-center justify-center gap-1 transition-all active:scale-[0.99] cursor-pointer"
                      >
                        <FileAudio size={22} className="text-amber-500" />
                        <span className="text-xs font-bold text-slate-900">
                          {directAudioFile ? directAudioFile.name : 'Choose Audio File from Mobile'}
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">
                          {directAudioFile 
                            ? `${(directAudioFile.size / (1024 * 1024)).toFixed(2)} MB • ~${directAudioDuration}s` 
                            : 'Supports MP3, M4A, WAV, AAC'}
                        </span>
                      </button>
                    </div>
                  ) : (
                    <div className="relative">
                      <input
                        type="url"
                        placeholder="https://archive.org/download/.../song.mp3"
                        value={directAudioUrl}
                        onChange={e => setDirectAudioUrl(e.target.value)}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2.5 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden transition-all"
                      />
                    </div>
                  )}
                </div>

                {/* 2. Cover Artwork */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    2. Cover Artwork
                  </label>
                  <div className="flex gap-2.5 items-center bg-slate-50 p-2 rounded-2xl border border-slate-200/80">
                    <img 
                      src={directCoverBase64 || directCoverUrl || '/logo.png'} 
                      alt="Cover Preview" 
                      className="w-15 h-15 rounded-xl object-cover shrink-0 border border-slate-200 bg-white shadow-2xs" 
                    />
                    <div className="flex-1 flex flex-col gap-1.5 min-w-0">
                      <input
                        type="file"
                        ref={coverInputRef}
                        accept="image/*"
                        onChange={handleDirectCoverPick}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => coverInputRef.current?.click()}
                        disabled={isSubmitting}
                        className="py-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-xs font-bold flex items-center justify-center gap-1.5 shadow-2xs transition-all active:scale-95 cursor-pointer"
                      >
                        <ImageIcon size={13} className="text-amber-500" />
                        <span>Pick Photo from Mobile</span>
                      </button>
                      <input
                        type="url"
                        placeholder="Or paste image URL"
                        value={directCoverUrl}
                        onChange={e => { setDirectCoverUrl(e.target.value); setDirectCoverBase64(''); }}
                        disabled={isSubmitting}
                        className="w-full px-2 py-1 bg-white text-[11px] rounded-lg border border-slate-200 focus:border-amber-400 outline-hidden text-center"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Track Details */}
                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">* Song Title</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Kadhale Kadhale"
                      value={directForm.title}
                      onChange={e => setDirectForm({ ...directForm, title: e.target.value })}
                      disabled={isSubmitting}
                      className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Movie / Album</label>
                      <input
                        type="text"
                        list="existing-movies-list"
                        placeholder="e.g. 96"
                        value={directForm.movie}
                        onChange={e => setDirectForm({ ...directForm, movie: e.target.value })}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden"
                      />
                      <datalist id="existing-movies-list">
                        {existingMovies.map(m => (
                          <option key={m} value={m} />
                        ))}
                      </datalist>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Music Director</label>
                      <input
                        type="text"
                        placeholder="e.g. Govind Vasantha"
                        value={directForm.composer}
                        onChange={e => setDirectForm({ ...directForm, composer: e.target.value })}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Actors / Cast</label>
                      <input
                        type="text"
                        placeholder="e.g. Vijay Sethupathi, Trisha"
                        value={directForm.actors}
                        onChange={e => setDirectForm({ ...directForm, actors: e.target.value })}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden"
                      />
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Singers</label>
                      <input
                        type="text"
                        placeholder="e.g. Chinmayi, Govind"
                        value={directForm.artist}
                        onChange={e => setDirectForm({ ...directForm, artist: e.target.value })}
                        disabled={isSubmitting}
                        className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Genre</label>
                      <div className="relative">
                        <select
                          value={directForm.genre}
                          onChange={e => setDirectForm({ ...directForm, genre: e.target.value })}
                          disabled={isSubmitting}
                          className="w-full pl-3 pr-8 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200/80 focus:border-amber-400 outline-hidden cursor-pointer appearance-none transition-colors"
                        >
                          <option value="Soundtrack">Soundtrack</option>
                          <option value="Melody">Melody</option>
                          <option value="Folk">Folk</option>
                          <option value="Classical">Classical</option>
                          <option value="Pop">Pop</option>
                          <option value="Rock">Rock</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Mood / Category</label>
                      <div className="relative">
                        <select
                          value={directForm.mood}
                          onChange={e => setDirectForm({ ...directForm, mood: e.target.value })}
                          disabled={isSubmitting}
                          className="w-full pl-3 pr-8 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200/80 focus:border-amber-400 outline-hidden cursor-pointer appearance-none transition-colors"
                        >
                          <option value="Melody Hits">🎵 Melody Hits</option>
                          <option value="Love Failure">💔 Love Failure</option>
                          <option value="Energetic">⚡ Energetic / Kuthu</option>
                          <option value="Midnight Chill">🌙 Midnight Chill</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <ChevronDown size={14} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="mt-1 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Saving Track to Vault...</span>
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      <span>Save Track to Vault</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: YOUTUBE IMPORTER (REQUIRES LAPTOP PYTHON BRIDGE)                   */}
        {/* ========================================================================= */}
        {activeTab === 'youtube' && (
          <div>
            {!isBridgeOnline && (
              <div className="mb-3 p-2.5 rounded-xl bg-amber-50 border border-amber-200/80 text-amber-900 text-[11px] leading-relaxed flex items-start gap-2">
                <AlertCircle size={15} className="text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Python Bridge is offline on this device.</p>
                  <p className="text-slate-600 mt-0.5">
                    If you are on your laptop, run: <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">py scripts/yt_archive_bridge.py</code>. If you are on your phone, use the <strong>Direct Upload</strong> tab above.
                  </p>
                </div>
              </div>
            )}

            {/* STAGE 1: Paste Link & Fetch */}
            {ytStage === 'input' && (
              <form onSubmit={handleYtFetchInfo} className="flex flex-col gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                    * Paste YouTube Song URL
                  </label>
                  <input
                    type="url"
                    required
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={ytUrl}
                    onChange={e => setYtUrl(e.target.value)}
                    disabled={ytIsFetching}
                    className="w-full px-3 py-2.5 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={ytIsFetching}
                  className="mt-1 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
                >
                  {ytIsFetching ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Fetching Details...</span>
                    </>
                  ) : (
                    <>
                      <span>Fetch Song Details & Preview</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {/* STAGE 2: Review & Edit Metadata */}
            {ytStage === 'preview_edit' && (
              <form onSubmit={handleYtConfirmUpload} className="flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Edit3 size={15} className="text-amber-500" />
                  <span className="text-xs font-bold text-slate-900">
                    Review & Edit Before Uploading
                  </span>
                </div>

                <div className="flex gap-2.5 items-center bg-slate-50 p-2 rounded-2xl border border-slate-200">
                  <img 
                    src={ytEditMeta.thumbnailUrl || '/logo.png'} 
                    alt="Thumb" 
                    className="w-13 h-13 rounded-xl object-cover shrink-0 border border-slate-200 bg-white" 
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">{ytEditMeta.title || 'Untitled'}</p>
                    <p className="text-[11px] text-slate-500 truncate">{ytEditMeta.movie || 'Sound Vault'}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex flex-col gap-1">
                    <label className="text-[11px] font-bold text-slate-600">Song Title</label>
                    <input
                      type="text"
                      required
                      value={ytEditMeta.title}
                      onChange={e => setYtEditMeta({ ...ytEditMeta, title: e.target.value })}
                      disabled={ytIsUploading}
                      className="w-full px-3 py-2 bg-slate-100 text-xs font-semibold rounded-xl outline-hidden"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Movie</label>
                      <input
                        type="text"
                        value={ytEditMeta.movie}
                        onChange={e => setYtEditMeta({ ...ytEditMeta, movie: e.target.value })}
                        disabled={ytIsUploading}
                        className="w-full px-3 py-2 bg-slate-100 text-xs font-semibold rounded-xl outline-hidden"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Composer</label>
                      <input
                        type="text"
                        value={ytEditMeta.composer}
                        onChange={e => setYtEditMeta({ ...ytEditMeta, composer: e.target.value })}
                        disabled={ytIsUploading}
                        className="w-full px-3 py-2 bg-slate-100 text-xs font-semibold rounded-xl outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setYtStage('input')}
                    disabled={ytIsUploading}
                    className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={ytIsUploading}
                    className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white flex items-center justify-center gap-1.5 transition-all active:scale-95"
                  >
                    {ytIsUploading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload size={14} />
                        <span>Confirm & Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STAGE 3: Done */}
            {ytStage === 'done' && ytUploadResult && (
              <div className="text-center py-4 flex flex-col gap-3">
                <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
                <h4 className="text-sm font-black text-slate-900 font-display">
                  Song Uploaded Successfully!
                </h4>
                <p className="text-xs text-slate-500">
                  Uploaded to: <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[11px]">{ytUploadResult.remoteAudioPath}</code>
                </p>

                <div className="flex flex-col gap-2 mt-2">
                  <a
                    href={ytUploadResult.archiveDetailsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-slate-800 transition-all active:scale-95"
                  >
                    <span>Inspect in Archive.org</span>
                    <ExternalLink size={13} />
                  </a>

                  <button
                    onClick={resetYtAll}
                    className="w-full py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-all active:scale-95 cursor-pointer"
                  >
                    + Add Another Song
                  </button>

                  <button
                    onClick={onClose}
                    className="w-full py-2.5 rounded-xl bg-slate-100 text-slate-800 text-xs font-bold hover:bg-slate-200 transition-all active:scale-95 cursor-pointer"
                  >
                    Done & Close
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Real-time Upload Progress Bar Section */}
        {(isSubmitting || ytIsUploading || (uploadProgress > 0 && uploadProgress <= 100)) && (
          <div className="mt-3.5 p-3.5 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 flex flex-col gap-2.5 animate-[modalPop_0.25s_ease-out]">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="flex items-center gap-2 text-slate-200 truncate">
                <Upload size={14} className={`text-amber-400 shrink-0 ${uploadProgress < 100 ? 'animate-bounce' : ''}`} />
                <span className="truncate">{statusMessage || 'Uploading song to Vault...'}</span>
              </span>
              <span className="font-mono text-amber-400 ml-2 text-xs font-bold shrink-0">{uploadProgress}%</span>
            </div>
            
            <div className="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden p-0.5 border border-slate-700/60">
              <div 
                className="h-full bg-gradient-to-r from-amber-400 via-orange-500 to-emerald-400 rounded-full transition-all duration-300 shadow-[0_0_12px_rgba(251,191,36,0.6)]"
                style={{ width: `${Math.max(uploadProgress, 5)}%` }}
              />
            </div>
            {uploadProgress < 100 && (
              <p className="text-[10px] text-amber-300/80 font-medium text-center tracking-wide">
                Please keep this app active while uploading.
              </p>
            )}
          </div>
        )}

        {/* Status Message (when not actively uploading) */}
        {statusMessage && !isSubmitting && !ytIsUploading && uploadProgress === 0 && (
          <div className={`mt-3 p-2.5 rounded-xl text-[11px] leading-relaxed ${
            statusMessage.includes('Success') || statusMessage.includes('successfully') || statusMessage.includes('saved to Vault')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
              : statusMessage.includes('Error')
              ? 'bg-rose-50 text-rose-800 border border-rose-200/50'
              : 'bg-slate-50 text-slate-600 border border-slate-100'
          }`}>
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}
