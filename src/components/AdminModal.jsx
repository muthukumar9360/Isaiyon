import React, { useState } from 'react';
import { X, RefreshCw, Upload, CheckCircle2, ExternalLink, Sparkles, Edit3 } from 'lucide-react';

const YoutubeIcon = ({ size = 18, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} className="inline mr-1.5 shrink-0">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export default function AdminModal({
  isOpen,
  onClose,
  onSaveTrack
}) {
  const [ytUrl, setYtUrl] = useState('');
  const [projectIdentifier] = useState('muthuramalingam_a-vault');
  
  // Two-step flow: 'input' -> 'preview_edit' -> 'uploading' -> 'done'
  const [stage, setStage] = useState('input');
  const [isFetching, setIsFetching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  
  // Editable fields
  const [editMeta, setEditMeta] = useState({
    title: '',
    movie: '',
    actors: '',
    composer: '',
    artist: '',
    genre: 'Soundtrack',
    mood: 'Melody Hits',
    thumbnailUrl: '',
    duration: 250,
    id: ''
  });

  const [uploadResult, setUploadResult] = useState(null);

  if (!isOpen) return null;

  // Step 1: Fetch metadata from YouTube without downloading yet
  const handleFetchInfo = async (e) => {
    e.preventDefault();
    if (!ytUrl) {
      alert('Please enter a YouTube video URL.');
      return;
    }

    setIsFetching(true);
    setStatusMessage('Fetching song credits & parsing Movie, Cast, Composer...');

    try {
      const res = await fetch('http://127.0.0.1:5001/api/extract-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: ytUrl })
      });
      const data = await res.json();

      if (data.success && data.data) {
        setEditMeta({
          ...data.data,
          projectIdentifier
        });
        setStage('preview_edit');
        setStatusMessage('Information fetched! Review or edit details below before uploading.');
      } else {
        setStatusMessage('Fetch error: ' + (data.error || 'Could not extract metadata'));
      }
    } catch (err) {
      setStatusMessage('Error contacting local bridge: ' + err.message);
    } finally {
      setIsFetching(false);
    }
  };

  // Step 2: Confirm & Upload with edited fields
  const handleConfirmUpload = async (e) => {
    e.preventDefault();
    setIsUploading(true);
    setStatusMessage('1/2 Downloading audio & uploading to Archive.org folders ({Movie}/{Song}/)...');

    try {
      const payload = {
        ...editMeta,
        url: ytUrl,
        projectIdentifier
      };

      const res = await fetch('http://127.0.0.1:5001/api/upload-track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await res.json();

      if (result.success && result.audioUrl) {
        setStatusMessage('2/2 Saving track to your Firebase database...');

        const trackToSave = {
          title: editMeta.title,
          movie: editMeta.movie,
          actors: editMeta.actors,
          composer: editMeta.composer,
          artist: editMeta.artist,
          genre: editMeta.genre,
          mood: editMeta.mood,
          duration: editMeta.duration || 260,
          audioUrl: result.audioUrl,
          coverUrl: result.coverUrl || editMeta.thumbnailUrl,
          archiveDetailsUrl: result.archiveDetailsUrl,
          archivePath: result.remoteAudioPath,
          source: 'archive.org'
        };

        await onSaveTrack(trackToSave);
        setUploadResult(result);
        setStage('done');
        setStatusMessage('Song uploaded to Archive.org and permanently saved to Vault!');
      } else {
        setStatusMessage('Upload error: ' + (result.error || 'Failed to complete upload'));
      }
    } catch (err) {
      setStatusMessage('Error during upload: ' + err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const resetAll = () => {
    setStage('input');
    setYtUrl('');
    setUploadResult(null);
    setStatusMessage('');
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none animate-[modalPop_0.2s_ease-out]" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto relative" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
          <div className="flex items-center gap-2">
            <YoutubeIcon size={20} />
            <h3 className="text-sm font-extrabold text-slate-900 font-display">
              YouTube to Archive Importer
            </h3>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90"
          >
            <X size={15} />
          </button>
        </div>

        {/* STAGE 1: Paste Link & Fetch */}
        {stage === 'input' && (
          <form onSubmit={handleFetchInfo} className="flex flex-col gap-3">
            <p className="text-xs text-slate-500 leading-relaxed">
              Paste any Tamil / YouTube song URL. We will extract song credits so you can review before uploading to your vault.
            </p>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                YouTube Song URL *
              </label>
              <input 
                type="url" 
                required
                placeholder="https://www.youtube.com/watch?v=..."
                value={ytUrl}
                onChange={e => setYtUrl(e.target.value)}
                disabled={isFetching}
                className="w-full px-3 py-2.5 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 focus:ring-3 focus:ring-amber-400/10 outline-hidden transition-all"
              />
            </div>

            <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200/60 text-xs">
              <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Sound Vault Destination</span>
              <span className="text-amber-900 font-semibold">{projectIdentifier}</span>
            </div>

            <button 
              type="submit" 
              disabled={isFetching}
              className="mt-1 w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs font-bold shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
            >
              {isFetching ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Fetching Details...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Fetch Song Details & Preview</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* STAGE 2: Review & Edit Metadata Before Storing */}
        {stage === 'preview_edit' && (
          <form onSubmit={handleConfirmUpload} className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Edit3 size={15} className="text-amber-500" />
              <span className="text-xs font-bold text-slate-900">
                Review & Edit Before Uploading
              </span>
            </div>

            {/* Thumbnail Preview */}
            {editMeta.thumbnailUrl && (
              <div className="flex gap-3 items-center bg-slate-50 p-2 rounded-xl border border-slate-100">
                <img src={editMeta.thumbnailUrl} alt="Thumb" className="w-14 h-14 rounded-lg object-cover shadow-2xs shrink-0" />
                <div className="text-[11px] text-slate-500 min-w-0">
                  <div className="font-bold text-slate-700">Folder destination:</div>
                  <code className="text-[10px] text-amber-700 block truncate">{projectIdentifier}/{editMeta.movie || 'Movie'}/{editMeta.title || 'Song'}/</code>
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600">Movie / Album *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Unnai Ninaithu or Yaaradi Nee Mohini"
                value={editMeta.movie}
                onChange={e => setEditMeta({ ...editMeta, movie: e.target.value })}
                disabled={isUploading}
                className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600">Song Title *</label>
              <input 
                type="text" 
                required
                placeholder="e.g. Ennai Thalaatiya Varuvala"
                value={editMeta.title}
                onChange={e => setEditMeta({ ...editMeta, title: e.target.value })}
                disabled={isUploading}
                className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600">Starring / Actors</label>
              <input 
                type="text" 
                placeholder="e.g. Suriya, Laila or Dhanush, Nayanthara"
                value={editMeta.actors}
                onChange={e => setEditMeta({ ...editMeta, actors: e.target.value })}
                disabled={isUploading}
                className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">Music Director</label>
                <input 
                  type="text" 
                  placeholder="e.g. Sirpy, Yuvan"
                  value={editMeta.composer}
                  onChange={e => setEditMeta({ ...editMeta, composer: e.target.value })}
                  disabled={isUploading}
                  className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-600">Singers</label>
                <input 
                  type="text" 
                  placeholder="e.g. Hariharan"
                  value={editMeta.artist}
                  onChange={e => setEditMeta({ ...editMeta, artist: e.target.value })}
                  disabled={isUploading}
                  className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-bold text-slate-600">Mood / Category</label>
              <select 
                value={editMeta.mood}
                onChange={e => setEditMeta({ ...editMeta, mood: e.target.value })}
                disabled={isUploading}
                className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden cursor-pointer"
              >
                <option value="Love Failure">💔 Love Failure</option>
                <option value="Melody Hits">🎵 Melody Hits</option>
                <option value="Energetic">⚡ Energetic / Kuthu</option>
                <option value="Midnight Chill">🌙 Midnight Chill</option>
              </select>
            </div>

            <div className="flex gap-2 mt-2">
              <button 
                type="button" 
                onClick={() => setStage('input')}
                disabled={isUploading}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-all active:scale-95"
              >
                Back
              </button>

              <button 
                type="submit" 
                disabled={isUploading}
                className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white shadow-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
              >
                {isUploading ? (
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
        {stage === 'done' && uploadResult && (
          <div className="text-center py-4 flex flex-col gap-3">
            <CheckCircle2 size={40} className="text-emerald-500 mx-auto" />
            <h4 className="text-sm font-black text-slate-900 font-display">
              Song Uploaded Successfully!
            </h4>
            <p className="text-xs text-slate-500">
              Uploaded to: <code className="text-slate-700 bg-slate-100 px-1 py-0.5 rounded text-[11px]">{uploadResult.remoteAudioPath}</code>
            </p>

            <div className="flex flex-col gap-2 mt-2">
              <a 
                href={uploadResult.archiveDetailsUrl} 
                target="_blank" 
                rel="noreferrer"
                className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs hover:bg-slate-800 transition-all active:scale-95"
              >
                <span>Inspect in Archive.org</span>
                <ExternalLink size={13} />
              </a>

              <button 
                onClick={resetAll}
                className="w-full py-2 rounded-xl bg-amber-50 text-amber-700 text-xs font-bold hover:bg-amber-100 transition-all active:scale-95"
              >
                + Add Another Song
              </button>
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div className={`mt-3 p-2.5 rounded-xl text-[11px] leading-relaxed ${
            statusMessage.includes('Success') || statusMessage.includes('permanently')
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200/50'
              : 'bg-slate-50 text-slate-600 border border-slate-100'
          }`}>
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}
