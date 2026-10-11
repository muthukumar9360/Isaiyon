import React, { useState } from 'react';
import { X, RefreshCw, Upload, CheckCircle2, ExternalLink, Sparkles, Edit3 } from 'lucide-react';

const YoutubeIcon = ({ size = 18, color = '#ef4444' }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ display: 'inline', marginRight: 6 }}>
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.5 12 3.5 12 3.5s-7.505 0-9.377.55a3.016 3.016 0 0 0-2.122 2.136C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.55 9.376.55 9.376.55s7.505 0 9.377-.55a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
  </svg>
);

export default function AdminModal({
  isOpen,
  onClose,
  onSaveTrack
}) {
  const [ytUrl, setYtUrl] = useState('');
  const [projectIdentifier, setProjectIdentifier] = useState('muthuramalingam_a-vault');
  
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <YoutubeIcon size={20} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-main)' }}>
              Direct YouTube to Archive Importer
            </h3>
          </div>
          <button className="ctrl-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* STAGE 1: Paste Link & Fetch */}
        {stage === 'input' && (
          <form onSubmit={handleFetchInfo}>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14, lineHeight: 1.4 }}>
              Paste any Tamil / YouTube song URL. We will fetch all song credits so you can review and edit before uploading.
            </p>

            <div className="form-group">
              <label className="form-label">YouTube Song URL *</label>
              <input 
                type="url" 
                className="form-input"
                required
                placeholder="https://www.youtube.com/watch?v=..."
                value={ytUrl}
                onChange={e => setYtUrl(e.target.value)}
                disabled={isFetching}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Target Archive.org Project Folder</label>
              <input 
                type="text" 
                className="form-input"
                value={projectIdentifier}
                onChange={e => setProjectIdentifier(e.target.value)}
                disabled={isFetching}
              />
            </div>

            <button type="submit" className="btn-primary" disabled={isFetching} style={{ marginTop: 8 }}>
              {isFetching ? (
                <>
                  <RefreshCw size={15} className="spin" style={{ display: 'inline', marginRight: 6 }} />
                  Fetching Details...
                </>
              ) : (
                <>
                  <Sparkles size={15} style={{ display: 'inline', marginRight: 6 }} />
                  Fetch Song Details & Preview
                </>
              )}
            </button>
          </form>
        )}

        {/* STAGE 2: Review & Edit Metadata Before Storing */}
        {stage === 'preview_edit' && (
          <form onSubmit={handleConfirmUpload}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Edit3 size={15} color="var(--accent-gold)" />
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text-main)' }}>
                Review & Edit Before Uploading
              </span>
            </div>

            {/* Thumbnail Preview */}
            {editMeta.thumbnailUrl && (
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', background: '#f8fafc', padding: 8, borderRadius: 10, marginBottom: 12 }}>
                <img src={editMeta.thumbnailUrl} alt="Thumb" style={{ width: 64, height: 64, borderRadius: 8, objectFit: 'cover' }} />
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  <div><strong>Folder destination:</strong></div>
                  <code>{projectIdentifier}/{editMeta.movie || 'Movie'}/{editMeta.title || 'Song'}/</code>
                </div>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Movie / Film / Album Name *</label>
              <input 
                type="text" 
                className="form-input"
                required
                placeholder="e.g. Unnai Ninaithu or Yaaradi Nee Mohini"
                value={editMeta.movie}
                onChange={e => setEditMeta({ ...editMeta, movie: e.target.value })}
                disabled={isUploading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Song Title *</label>
              <input 
                type="text" 
                className="form-input"
                required
                placeholder="e.g. Ennai Thalaatiya Varuvala"
                value={editMeta.title}
                onChange={e => setEditMeta({ ...editMeta, title: e.target.value })}
                disabled={isUploading}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Starring / Actors</label>
              <input 
                type="text" 
                className="form-input"
                placeholder="e.g. Suriya, Laila, Sneha or Dhanush, Nayanthara"
                value={editMeta.actors}
                onChange={e => setEditMeta({ ...editMeta, actors: e.target.value })}
                disabled={isUploading}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <div className="form-group">
                <label className="form-label">Music Director</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. Sirpy, Yuvan"
                  value={editMeta.composer}
                  onChange={e => setEditMeta({ ...editMeta, composer: e.target.value })}
                  disabled={isUploading}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Singers</label>
                <input 
                  type="text" 
                  className="form-input"
                  placeholder="e.g. Hariharan"
                  value={editMeta.artist}
                  onChange={e => setEditMeta({ ...editMeta, artist: e.target.value })}
                  disabled={isUploading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Mood / Category</label>
              <select 
                className="form-input"
                value={editMeta.mood}
                onChange={e => setEditMeta({ ...editMeta, mood: e.target.value })}
                disabled={isUploading}
              >
                <option value="Love Failure">💔 Love Failure</option>
                <option value="Melody Hits">🎵 Melody Hits</option>
                <option value="Energetic">⚡ Energetic / Kuthu</option>
                <option value="Midnight Chill">🌙 Midnight Chill</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button 
                type="button" 
                className="ctrl-btn" 
                onClick={() => setStage('input')}
                disabled={isUploading}
                style={{ padding: '8px 12px', border: '1px solid var(--border-subtle)', borderRadius: 8, fontSize: '0.78rem' }}
              >
                Back
              </button>

              <button 
                type="submit" 
                className="btn-primary" 
                disabled={isUploading}
                style={{ flex: 1 }}
              >
                {isUploading ? (
                  <>
                    <RefreshCw size={15} className="spin" style={{ display: 'inline', marginRight: 6 }} />
                    Uploading to Archive.org...
                  </>
                ) : (
                  <>
                    <Upload size={15} style={{ display: 'inline', marginRight: 6 }} />
                    Confirm & Upload to Archive.org & Save
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* STAGE 3: Done */}
        {stage === 'done' && uploadResult && (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <CheckCircle2 size={42} color="var(--accent-emerald)" style={{ margin: '0 auto 10px' }} />
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: 6 }}>
              Song Uploaded Successfully!
            </h4>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 14 }}>
              Uploaded to: <code>{uploadResult.remoteAudioPath}</code>
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <a 
                href={uploadResult.archiveDetailsUrl} 
                target="_blank" 
                rel="noreferrer"
                className="btn-primary"
                style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
              >
                <span>Inspect in Archive.org UI</span>
                <ExternalLink size={14} />
              </a>

              <button 
                className="ctrl-btn"
                onClick={resetAll}
                style={{ padding: 10, fontSize: '0.8rem', color: 'var(--accent-gold)' }}
              >
                + Add Another Song
              </button>
            </div>
          </div>
        )}

        {/* Status Message */}
        {statusMessage && (
          <div style={{
            marginTop: 14,
            padding: 8,
            borderRadius: 8,
            fontSize: '0.72rem',
            background: statusMessage.includes('Success') || statusMessage.includes('permanently') ? 'rgba(5, 150, 105, 0.1)' : '#f8fafc',
            color: statusMessage.includes('Success') || statusMessage.includes('permanently') ? 'var(--accent-emerald)' : 'var(--text-muted)',
            lineHeight: 1.4
          }}>
            {statusMessage}
          </div>
        )}
      </div>
    </div>
  );
}
