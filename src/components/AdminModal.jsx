import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  X, 
  RefreshCw, 
  Upload, 
  CheckCircle2, 
  ExternalLink, 
  Edit3, 
  Smartphone, 
  Music, 
  Image as ImageIcon, 
  FileAudio,
  AlertCircle,
  ChevronDown
} from 'lucide-react';
import { auth } from '../firebase/config';
import { compressImage } from '../utils/imageCompressor';
import AutocompleteInput from './AutocompleteInput';

const YoutubeIcon = ({ size = 18, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className="inline mr-1.5 shrink-0">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
);

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001').replace(/\/+$/, '');

const getAuthToken = async () => {
  try {
    return (await auth.currentUser?.getIdToken()) || '';
  } catch {
    return '';
  }
};

const uploadAudioToBackend = async (file, formFields, onProgress) => {
  const token = await getAuthToken();
  return new Promise((resolve, reject) => {
    try {
      const xhr = new XMLHttpRequest();
      const url = `${API_BASE_URL}/api/archive-upload`;

      xhr.open('POST', url, true);
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const pct = Math.round((e.loaded / e.total) * 100);
          onProgress(pct);
        }
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && data.success) {
            resolve(data);
          } else {
            reject(new Error(data.error || `Upload rejected (${xhr.status})`));
          }
        } catch {
          reject(new Error(`Server error (${xhr.status}): ${xhr.responseText.slice(0, 100)}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network connection error. Please verify your connection to the backend."));
      xhr.ontimeout = () => reject(new Error("Upload timed out. The file might be too large for current network."));
      xhr.timeout = 360000;

      const formData = new FormData();
      formData.append('audio', file);
      formData.append('movie', formFields.movie || 'Sound Vault');
      formData.append('title', formFields.title || 'Unknown Track');
      formData.append('composer', formFields.composer || '');
      formData.append('artist', formFields.artist || '');
      formData.append('actors', formFields.actors || '');

      xhr.send(formData);
    } catch (err) {
      reject(err);
    }
  });
};

export default function AdminModal({
  isOpen,
  onClose,
  onSaveTrack,
  tracks = []
}) {
  // Mode: 'direct' (Mobile friendly direct MP3/URL) | 'youtube' (PC/Cloud Node.js backend)
  const [activeTab, setActiveTab] = useState('direct');
  const [isBridgeOnline, setIsBridgeOnline] = useState(false);
  const audioInputRef = useRef(null);
  const coverInputRef = useRef(null);

  // Smart Autocomplete Suggestions derived from real-time tracks
  const suggestionData = useMemo(() => {
    const titles = new Set();
    const movies = new Set();
    const composers = new Set();
    const actors = new Set();
    const artists = new Set();

    tracks.forEach(t => {
      if (t.title && typeof t.title === 'string' && t.title.trim()) {
        titles.add(t.title.trim());
      }
      if (t.movie && typeof t.movie === 'string' && t.movie.trim()) {
        movies.add(t.movie.trim());
      }
      if (t.composer && typeof t.composer === 'string' && t.composer.trim()) {
        composers.add(t.composer.trim());
      }
      if (t.actors && typeof t.actors === 'string' && t.actors.trim()) {
        t.actors.split(',').forEach(a => {
          const cleanAct = a.trim();
          if (cleanAct) actors.add(cleanAct);
        });
      }
      if (t.artist && typeof t.artist === 'string' && t.artist.trim()) {
        t.artist.split(/[,&/]/).forEach(a => {
          const cleanArt = a.trim();
          if (cleanArt) artists.add(cleanArt);
        });
      }
    });

    return {
      titles: Array.from(titles).sort((a, b) => a.localeCompare(b)),
      movies: Array.from(movies).sort((a, b) => a.localeCompare(b)),
      composers: Array.from(composers).sort((a, b) => a.localeCompare(b)),
      actors: Array.from(actors).sort((a, b) => a.localeCompare(b)),
      artists: Array.from(artists).sort((a, b) => a.localeCompare(b))
    };
  }, [tracks]);

  // Check Node.js backend connectivity on open
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const checkBridge = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res = await fetch(`${API_BASE_URL}/api/status`, { signal: controller.signal });
        clearTimeout(timeoutId);
        const data = await res.json();
        if (isMounted && (data.status === 'online' || data.server === 'running')) {
          setIsBridgeOnline(true);
        }
      } catch {
        if (isMounted) {
          setIsBridgeOnline(false);
          setActiveTab('direct'); // Default to direct upload if backend offline
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

      // 1. Upload audio file if chosen (via Node.js backend using server-side Archive.org credentials)
      if (directAudioType === 'file' && directAudioFile) {
        const sizeMb = (directAudioFile.size / (1024 * 1024)).toFixed(1);
        setStatusMessage(`Uploading audio to Vault: 0.0 / ${sizeMb} MB (0%)...`);
        setUploadProgress(10);

        const matchedMovie = suggestionData.movies.find(
          m => m.toLowerCase() === (directForm.movie || '').trim().toLowerCase()
        );
        const canonicalMovie = matchedMovie || (directForm.movie || '').trim() || 'Sound Vault';

        try {
          const uploadRes = await uploadAudioToBackend(
            directAudioFile,
            { ...directForm, movie: canonicalMovie },
            (pct) => {
              const currentMb = ((directAudioFile.size * pct / 100) / (1024 * 1024)).toFixed(1);
              if (pct >= 100) {
                setUploadProgress(92);
                setStatusMessage('Audio uploaded to Vault. Verifying...');
              } else {
                setUploadProgress(Math.round(10 + pct * 0.78));
                setStatusMessage(`Uploading audio: ${currentMb} / ${sizeMb} MB (${pct}%)`);
              }
            }
          );
          finalAudioUrl = uploadRes.audioUrl;
          setUploadProgress(90);
        } catch (uploadErr) {
          console.warn("Direct Vault backend upload error:", uploadErr);
          throw new Error("Could not upload audio file: " + uploadErr.message);
        }
      } else {
        setUploadProgress(85);
      }

      // 2. Cover artwork: use client-compressed base64 instantly (0ms delay)
      const finalCoverUrl = directCoverBase64 || directCoverUrl.trim() || '/logo.png';
      setUploadProgress(92);

      // 3. Match canonical movie
      const matchedMovie = suggestionData.movies.find(
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
      const token = await getAuthToken();
      const res = await fetch(`${API_BASE_URL}/api/extract-info`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ url: ytUrl })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setYtEditMeta({
          ...data.data,
          genre: data.data.genre || 'Soundtrack',
          mood: data.data.mood || 'Melody Hits',
          projectIdentifier: 'muthuramalingam_a-vault'
        });
        setYtStage('preview_edit');
        setStatusMessage('Review or edit details below before uploading.');
      } else {
        setStatusMessage('Fetch error: ' + (data.error || 'Could not extract metadata'));
      }
    } catch (err) {
      setStatusMessage('Error contacting backend server: ' + err.message);
    } finally {
      setYtIsFetching(false);
    }
  };

  const handleYtConfirmUpload = async (e) => {
    e.preventDefault();
    setYtIsUploading(true);
    setUploadProgress(15);
    setStatusMessage('1/2 Initiating audio processing on backend...');

    try {
      const token = await getAuthToken();
      const matchedMovie = suggestionData.movies.find(
        m => m.toLowerCase() === (ytEditMeta.movie || '').trim().toLowerCase()
      );
      const canonicalMovie = matchedMovie || (ytEditMeta.movie || '').trim() || 'Sound Vault';

      const payload = {
        ...ytEditMeta,
        movie: canonicalMovie,
        url: ytUrl
      };

      const res = await fetch(`${API_BASE_URL}/api/upload-track`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (!res.ok || (!data.success && !data.audioUrl)) {
        throw new Error(data.error || 'Failed to start upload job');
      }

      let result = null;

      // Handle async background job polling (ideal for Render and mobile networks)
      if (data.jobId) {
        setStatusMessage(data.stage || 'Processing audio on server...');
        setUploadProgress(data.progress || 20);

        const pollStartTime = Date.now();
        while (!result) {
          if (Date.now() - pollStartTime > 180000) {
            throw new Error('Upload job timed out after 3 minutes.');
          }

          await new Promise(r => setTimeout(r, 1500));
          const jobRes = await fetch(`${API_BASE_URL}/api/jobs/${data.jobId}`, {
            headers: {
              ...(token ? { 'Authorization': `Bearer ${token}` } : {})
            }
          });
          const jobData = await jobRes.json();
          if (!jobRes.ok || !jobData.success) {
            throw new Error(jobData.error || 'Failed to poll upload job');
          }

          const currentJob = jobData.job;
          setUploadProgress(currentJob.progress || 50);
          setStatusMessage(currentJob.stage || 'Processing in progress...');

          if (currentJob.status === 'completed' && currentJob.result) {
            result = currentJob.result;
            break;
          } else if (currentJob.status === 'failed') {
            throw new Error(currentJob.error || 'Background upload failed.');
          }
        }
      } else {
        // Direct synchronous response
        result = data;
      }

      if (result && result.audioUrl) {
        setUploadProgress(92);
        setStatusMessage('2/2 Saving track to your Firebase database...');
        const trackToSave = {
          title: ytEditMeta.title.trim(),
          movie: canonicalMovie,
          actors: ytEditMeta.actors || '',
          composer: ytEditMeta.composer || '',
          artist: ytEditMeta.artist || '',
          genre: ytEditMeta.genre || 'Soundtrack',
          mood: ytEditMeta.mood || 'Melody Hits',
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
        throw new Error('Upload finished but audio URL was missing.');
      }
    } catch (err) {
      setUploadProgress(0);
      setStatusMessage('Error during upload: ' + err.message);
    } finally {
      setYtIsUploading(false);
    }
  };

  const resetYtAll = () => {
    setYtStage('input');
    setYtUrl('');
    setYtEditMeta({
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
    setYtUploadResult(null);
    setUploadProgress(0);
    setStatusMessage('');
  };

  const resetAllState = () => {
    resetYtAll();
    resetDirectForm();
    setSuccessCreatedTrack(null);
    setUploadProgress(0);
    setStatusMessage('');
    setIsSubmitting(false);
    setYtIsFetching(false);
    setYtIsUploading(false);
  };

  const handleCloseModal = () => {
    resetAllState();
    onClose();
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
            onClick={handleCloseModal}
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
                    onClick={handleCloseModal}
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

                {/* 3. Track Details with Smart Autocomplete */}
                <div className="flex flex-col gap-2">
                  <AutocompleteInput
                    label="* Song Title"
                    required
                    placeholder="e.g. Kadhale Kadhale"
                    value={directForm.title}
                    onChange={val => setDirectForm(prev => ({ ...prev, title: val }))}
                    suggestions={suggestionData.titles}
                    disabled={isSubmitting}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <AutocompleteInput
                      label="Movie / Album"
                      placeholder="e.g. 96"
                      value={directForm.movie}
                      onChange={val => setDirectForm(prev => ({ ...prev, movie: val }))}
                      suggestions={suggestionData.movies}
                      disabled={isSubmitting}
                    />

                    <AutocompleteInput
                      label="Music Director"
                      placeholder="e.g. Govind Vasantha"
                      value={directForm.composer}
                      onChange={val => setDirectForm(prev => ({ ...prev, composer: val }))}
                      suggestions={suggestionData.composers}
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <AutocompleteInput
                      label="Actors / Cast"
                      isMultiValue
                      placeholder="e.g. Vijay Sethupathi, Trisha"
                      value={directForm.actors}
                      onChange={val => setDirectForm(prev => ({ ...prev, actors: val }))}
                      suggestions={suggestionData.actors}
                      disabled={isSubmitting}
                    />

                    <AutocompleteInput
                      label="Singers"
                      isMultiValue
                      placeholder="e.g. Chinmayi, Govind"
                      value={directForm.artist}
                      onChange={val => setDirectForm(prev => ({ ...prev, artist: val }))}
                      suggestions={suggestionData.artists}
                      disabled={isSubmitting}
                    />
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
                          <option value="Devotional">Devotional</option>
                          <option value="Indie">Indie</option>
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
                          <option value="Mass">🔥 Mass & Folk</option>
                          <option value="Love">❤️ Love & Romance</option>
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
                  <p className="font-bold">Backend Service is offline or sleeping.</p>
                  <p className="text-slate-600 mt-0.5">
                    If running locally, start: <code className="bg-amber-100 px-1 py-0.2 rounded font-mono">npm run backend:dev</code>. If on Render free tier, please allow ~45s for the server to wake up, or use the <strong>Direct Upload</strong> tab above.
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

            {/* STAGE 2: Review & Edit Metadata with Smart Autocomplete */}
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
                  <AutocompleteInput
                    label="Song Title *"
                    required
                    value={ytEditMeta.title}
                    onChange={val => setYtEditMeta(prev => ({ ...prev, title: val }))}
                    suggestions={suggestionData.titles}
                    disabled={ytIsUploading}
                  />

                  <div className="grid grid-cols-2 gap-2">
                    <AutocompleteInput
                      label="Movie"
                      value={ytEditMeta.movie}
                      onChange={val => setYtEditMeta(prev => ({ ...prev, movie: val }))}
                      suggestions={suggestionData.movies}
                      disabled={ytIsUploading}
                    />

                    <AutocompleteInput
                      label="Composer"
                      value={ytEditMeta.composer}
                      onChange={val => setYtEditMeta(prev => ({ ...prev, composer: val }))}
                      suggestions={suggestionData.composers}
                      disabled={ytIsUploading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <AutocompleteInput
                      label="Actors / Cast"
                      isMultiValue
                      value={ytEditMeta.actors || ''}
                      onChange={val => setYtEditMeta(prev => ({ ...prev, actors: val }))}
                      suggestions={suggestionData.actors}
                      disabled={ytIsUploading}
                    />

                    <AutocompleteInput
                      label="Singers"
                      isMultiValue
                      value={ytEditMeta.artist || ''}
                      onChange={val => setYtEditMeta(prev => ({ ...prev, artist: val }))}
                      suggestions={suggestionData.artists}
                      disabled={ytIsUploading}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[11px] font-bold text-slate-600">Genre (Song Type)</label>
                      <div className="relative">
                        <select
                          value={ytEditMeta.genre || 'Soundtrack'}
                          onChange={e => setYtEditMeta(prev => ({ ...prev, genre: e.target.value }))}
                          disabled={ytIsUploading}
                          className="w-full pl-3 pr-8 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200/80 focus:border-amber-400 outline-hidden cursor-pointer appearance-none transition-colors"
                        >
                          <option value="Soundtrack">Soundtrack</option>
                          <option value="Melody">Melody</option>
                          <option value="Folk">Folk</option>
                          <option value="Classical">Classical</option>
                          <option value="Pop">Pop</option>
                          <option value="Rock">Rock</option>
                          <option value="Devotional">Devotional</option>
                          <option value="Indie">Indie</option>
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
                          value={ytEditMeta.mood || 'Melody Hits'}
                          onChange={e => setYtEditMeta(prev => ({ ...prev, mood: e.target.value }))}
                          disabled={ytIsUploading}
                          className="w-full pl-3 pr-8 py-2 bg-slate-100 hover:bg-slate-200/70 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200/80 focus:border-amber-400 outline-hidden cursor-pointer appearance-none transition-colors"
                        >
                          <option value="Melody Hits">🎵 Melody Hits</option>
                          <option value="Love Failure">💔 Love Failure</option>
                          <option value="Energetic">⚡ Energetic / Kuthu</option>
                          <option value="Midnight Chill">🌙 Midnight Chill</option>
                          <option value="Mass">🔥 Mass & Folk</option>
                          <option value="Love">❤️ Love & Romance</option>
                        </select>
                        <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                          <ChevronDown size={14} />
                        </div>
                      </div>
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
                    onClick={handleCloseModal}
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
