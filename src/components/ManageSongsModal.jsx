import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Edit3, 
  Trash2, 
  Save, 
  CheckCircle2, 
  SlidersHorizontal, 
  Music, 
  Film, 
  User, 
  Users, 
  Tag, 
  Sparkles, 
  ExternalLink,
  ChevronLeft,
  Upload
} from 'lucide-react';
import { FALLBACK_ARTWORK } from '../constants/fallbackArt';

export default function ManageSongsModal({
  isOpen,
  onClose,
  tracks = [],
  onUpdateTrack,
  onDeleteTrack
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTrackId, setEditingTrackId] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // Extract unique movie names for autocomplete
  const existingMovies = useMemo(() => {
    const set = new Set();
    tracks.forEach(t => {
      if (t.movie && typeof t.movie === 'string' && t.movie.trim()) {
        set.add(t.movie.trim());
      }
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [tracks]);

  // Filtered tracks
  const filteredTracks = useMemo(() => {
    if (!searchQuery.trim()) return tracks;
    const q = searchQuery.toLowerCase();
    return tracks.filter(t => 
      (t.title && t.title.toLowerCase().includes(q)) ||
      (t.movie && t.movie.toLowerCase().includes(q)) ||
      (t.artist && t.artist.toLowerCase().includes(q)) ||
      (t.composer && t.composer.toLowerCase().includes(q)) ||
      (t.actors && t.actors.toLowerCase().includes(q)) ||
      (t.genre && t.genre.toLowerCase().includes(q))
    );
  }, [tracks, searchQuery]);

  if (!isOpen) return null;

  const handleStartEdit = (track) => {
    setEditingTrackId(track.id);
    setEditForm({
      title: track.title || '',
      movie: track.movie || '',
      artist: track.artist || '',
      composer: track.composer || '',
      actors: track.actors || '',
      genre: track.genre || 'Soundtrack',
      mood: track.mood || 'Vibrant',
      audioUrl: track.audioUrl || '',
      coverUrl: track.coverUrl || '',
      duration: track.duration || 260
    });
    setSuccessMsg('');
  };

  const handleCancelEdit = () => {
    setEditingTrackId(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingTrackId || !editForm) return;

    setIsSaving(true);
    try {
      await onUpdateTrack(editingTrackId, editForm);
      setSuccessMsg(`Updated "${editForm.title}" successfully!`);
      setTimeout(() => {
        setSuccessMsg('');
        setEditingTrackId(null);
        setEditForm(null);
      }, 1500);
    } catch (err) {
      alert('Failed to update track: ' + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadNewPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const b64 = reader.result;
      setEditForm(prev => ({ ...prev, coverUrl: b64 }));
      setIsUploadingPhoto(true);
      try {
        const res = await fetch('http://127.0.0.1:5001/api/update-cover', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            movie: editForm.movie,
            title: editForm.title,
            imageBase64: b64,
            projectIdentifier: 'muthuramalingam_a-vault'
          })
        });
        const data = await res.json();
        if (data.success && data.coverUrl) {
          setEditForm(prev => ({ ...prev, coverUrl: data.coverUrl }));
          if (editingTrackId) {
            await onUpdateTrack(editingTrackId, { coverUrl: data.coverUrl });
          }
          setSuccessMsg('Thumbnail updated in Archive.org & Vault successfully!');
          setTimeout(() => setSuccessMsg(''), 3000);
        } else {
          if (editingTrackId) {
            await onUpdateTrack(editingTrackId, { coverUrl: b64 });
          }
          setSuccessMsg('Thumbnail updated in Vault!');
          setTimeout(() => setSuccessMsg(''), 3000);
        }
      } catch (err) {
        if (editingTrackId) {
          await onUpdateTrack(editingTrackId, { coverUrl: b64 });
        }
        setSuccessMsg('Thumbnail updated in Vault!');
        setTimeout(() => setSuccessMsg(''), 3000);
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteConfirmed = async (trackId) => {
    try {
      await onDeleteTrack(trackId);
      setDeleteConfirmId(null);
      if (editingTrackId === trackId) {
        handleCancelEdit();
      }
    } catch (err) {
      alert('Failed to delete track: ' + err.message);
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 z-50 select-none animate-[modalPop_0.2s_ease-out]" 
      onClick={onClose}
    >
      <div 
        className="w-full max-w-lg bg-white rounded-3xl p-5 shadow-2xl flex flex-col max-h-[92vh] overflow-hidden relative border border-slate-200" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <SlidersHorizontal size={16} />
            </div>
            <div>
              <h3 className="text-md font-black text-slate-900 font-display flex items-center gap-1.5">
                <span>Manage Vault Songs</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800">
                  {tracks.length} Songs
                </span>
              </h3>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center transition-all active:scale-90 cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Global Datalist for Movies */}
        <datalist id="manage-existing-movies">
          {existingMovies.map(m => (
            <option key={m} value={m} />
          ))}
        </datalist>

        {/* Success Banner */}
        {successMsg && (
          <div className="my-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-[modalPop_0.2s_ease-out]">
            <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* MAIN BODY: Either Edit Mode OR List Mode */}
        {editingTrackId && editForm ? (
          /* EDIT SINGLE TRACK FORM */
          <div className="flex-1 overflow-y-auto py-3">

            <form onSubmit={handleSaveEdit} className="flex flex-col gap-3">
              {/* Song Thumbnail & Upload Controls Card - Zero empty space, crystal-clear layout */}
              <div className="p-3 bg-gradient-to-br from-slate-50 via-amber-50/25 to-slate-50 rounded-2xl border border-slate-200/90 flex flex-col gap-2.5 shadow-2xs">
                {/* Header title for artwork section */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload size={13} className="text-amber-500" />
                    <span>Song Thumbnail</span>
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    JPG, PNG 
                  </span>
                </div>

                <div className="flex gap-3 items-center">
                  {/* Thumbnail Preview with Quick Hover Change */}
                  <div className="relative group shrink-0">
                    <img 
                      src={editForm.coverUrl || FALLBACK_ARTWORK} 
                      alt="Thumb" 
                      className="w-30 h-18 rounded-2xl object-cover shadow-sm border border-slate-200 ring-2 ring-amber-400/20"
                      onError={(e) => { e.currentTarget.src = FALLBACK_ARTWORK; }}
                    />
                    <label 
                      className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold cursor-pointer"
                      title="Upload new photo"
                    >
                      <Upload size={14} />
                      <span>Browse</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        disabled={isUploadingPhoto}
                        className="hidden" 
                        onChange={handleUploadNewPhoto}
                      />
                    </label>
                  </div>

                  {/* Upload Controls & URL input - occupying full width with purpose */}
                  <div className="min-w-0 flex-1 flex flex-col gap-2">
                    {/* Primary Upload Button */}
                    <label className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 active:scale-98 text-white text-xs font-bold shadow-xs cursor-pointer transition-all">
                      <Upload size={13} strokeWidth={2.5} />
                      <span>{isUploadingPhoto ? 'Uploading to Archive.org...' : 'Upload Thumbnail'}</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        disabled={isUploadingPhoto}
                        className="hidden" 
                        onChange={handleUploadNewPhoto}
                      />
                    </label>

                    {/* Direct Cover Image URL field */}
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        placeholder="Or paste artwork image URL..."
                        value={editForm.coverUrl}
                        onChange={e => setEditForm({ ...editForm, coverUrl: e.target.value })}
                        className="w-full px-2.5 py-1.5 bg-white text-[11px] font-medium rounded-xl border border-slate-200 focus:border-amber-400 outline-hidden text-slate-800 placeholder:text-slate-400 truncate shadow-2xs"
                      />
                    </div>
                  </div>
                </div>

                {/* Storage Target info banner */}
                <div className="bg-amber-50/80 border border-amber-200/60 px-2.5 py-1 rounded-xl flex items-center justify-between text-[10px]">
                  <span className="font-bold text-amber-800 shrink-0">Storage Path:</span>
                  <code className="text-amber-900 font-mono text-[10px] truncate ml-2 font-semibold select-all">
                    muthuramalingam_a-vault/{(editForm.movie || 'Movie').trim()}/{(editForm.title || 'Song').trim()}/cover.jpg
                  </code>
                </div>
              </div>

              {/* Title */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Music size={12} className="text-amber-500" />
                  <span>Song Title *</span>
                </label>
                <input 
                  type="text" 
                  required
                  value={editForm.title}
                  onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:border-amber-400 outline-hidden"
                />
              </div>

              {/* Movie */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Film size={12} className="text-amber-500" />
                  <span>Movie / Album * (Pick from list to reuse folder)</span>
                </label>
                <input 
                  type="text" 
                  required
                  list="manage-existing-movies"
                  placeholder="Select or enter movie name"
                  value={editForm.movie}
                  onChange={e => setEditForm({ ...editForm, movie: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:border-amber-400 outline-hidden [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:opacity-0"
                />
              </div>

              {/* Composer & Artist */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-500" />
                    <span>Composer</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. A. R. Rahman"
                    value={editForm.composer}
                    onChange={e => setEditForm({ ...editForm, composer: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:border-amber-400 outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <User size={12} className="text-amber-500" />
                    <span>Artist / Singers</span>
                  </label>
                  <input 
                    type="text" 
                    placeholder="e.g. Hariharan, Shankar Mahadevan"
                    value={editForm.artist}
                    onChange={e => setEditForm({ ...editForm, artist: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:border-amber-400 outline-hidden"
                  />
                </div>
              </div>

              {/* Actors */}
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                  <Users size={12} className="text-amber-500" />
                  <span>Featured Actors / Cast</span>
                </label>
                <input 
                  type="text" 
                  placeholder="e.g. Ajith Kumar, Tabu, Aishwarya Rai"
                  value={editForm.actors}
                  onChange={e => setEditForm({ ...editForm, actors: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:border-amber-400 outline-hidden"
                />
              </div>

              {/* Genre & Mood */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700 flex items-center gap-1">
                    <Tag size={12} className="text-amber-500" />
                    <span>Genre</span>
                  </label>
                  <input 
                    type="text" 
                    value={editForm.genre}
                    onChange={e => setEditForm({ ...editForm, genre: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:border-amber-400 outline-hidden"
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[11px] font-bold text-slate-700">Mood / Vibe</label>
                  <input 
                    type="text" 
                    value={editForm.mood}
                    onChange={e => setEditForm({ ...editForm, mood: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-slate-200 focus:border-amber-400 outline-hidden"
                  />
                </div>
              </div>


              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer active:scale-95"
                >
                  <Save size={14} />
                  <span>{isSaving ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* SONGS LIST MODE */
          <div className="flex-1 flex flex-col min-h-0 pt-3">
            {/* Search Filter */}
            <div className="relative mb-3">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text"
                placeholder="Search song, movie, artist, or composer..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-2 bg-slate-100 focus:bg-white text-xs font-semibold rounded-xl border border-transparent focus:border-amber-400 outline-hidden transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  Clear
                </button>
              )}
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1 flex flex-col gap-2">
              {filteredTracks.length === 0 ? (
                <div className="text-center py-10 text-slate-400 text-xs font-medium">
                  No tracks found matching "{searchQuery}"
                </div>
              ) : (
                filteredTracks.map(track => (
                  <div 
                    key={track.id}
                    className="p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/80 flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <img 
                        src={track.coverUrl || FALLBACK_ARTWORK} 
                        alt="Art" 
                        className="w-11 h-11 rounded-xl object-cover shadow-2xs shrink-0"
                        onError={(e) => { e.currentTarget.src = FALLBACK_ARTWORK; }}
                      />
                      <div className="min-w-0">
                        <h4 className="text-xs font-black text-slate-900 truncate">
                          {track.title || 'Untitled Track'}
                        </h4>
                        <p className="text-[11px] text-amber-700 font-bold truncate">
                          {track.movie || 'Unknown Movie'}
                        </p>
                        <p className="text-[10px] text-slate-500 truncate">
                          {track.composer || track.artist || 'Unknown Artist'}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {deleteConfirmId === track.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-200 animate-[modalPop_0.15s_ease-out]">
                          <span className="text-[10px] text-red-700 font-bold px-1">Delete?</span>
                          <button
                            onClick={() => handleDeleteConfirmed(track.id)}
                            className="px-2 py-1 rounded-lg bg-red-600 text-white text-[10px] font-bold hover:bg-red-700 active:scale-95 cursor-pointer"
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(null)}
                            className="px-2 py-1 rounded-lg bg-slate-200 text-slate-700 text-[10px] font-bold hover:bg-slate-300 active:scale-95 cursor-pointer"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => handleStartEdit(track)}
                            title="Edit Song"
                            className="px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-500 hover:text-white text-amber-800 border border-amber-200/80 flex items-center gap-1 text-[11px] font-bold transition-all active:scale-90 shadow-2xs cursor-pointer"
                          >
                            <Edit3 size={12} />
                            <span>Edit</span>
                          </button>
                          <button
                            onClick={() => setDeleteConfirmId(track.id)}
                            title="Delete Track"
                            className="w-7 h-7 rounded-xl bg-white hover:bg-red-500 hover:text-white text-slate-500 hover:border-red-400 border border-slate-200 flex items-center justify-center transition-all active:scale-90 shadow-2xs cursor-pointer"
                          >
                            <Trash2 size={13} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
