import { useEffect, useRef, useState } from 'react';
import { Plus, Pencil, Trash2, X, StickyNote } from 'lucide-react';
import type { Activity, ActivityCategory, Note } from '../types';
import type { ActivityInput } from '../hooks/useActivityEditor';
import { useFocusTrap } from '../hooks/useFocusTrap';

export type ActivityModalMode = 'add' | 'edit';

export interface ActivityModalData {
  mode: ActivityModalMode;
  activity: Activity | null;
  dayId: string;
  focusNotes?: boolean;
}

interface ActivityModalProps {
  data: ActivityModalData;
  currency: string;
  onClose: () => void;
  onAdd: (dayId: string, input: ActivityInput) => void;
  onEdit: (activityId: string, input: ActivityInput) => void;
  onAddNote: (activityId: string, text: string) => void;
  onEditNote: (activityId: string, noteId: string, text: string) => void;
  onDeleteNote: (activityId: string, noteId: string) => void;
}

const CATEGORIES: ActivityCategory[] = [
  'Food', 'Culture', 'Nature', 'Adventure', 'History', 'Shopping', 'Nightlife', 'Transport', 'Accommodation', 'Other',
];

export default function ActivityModal({
  data,
  currency,
  onClose,
  onAdd,
  onEdit,
  onAddNote,
  onEditNote,
  onDeleteNote,
}: ActivityModalProps) {
  const { mode, activity, dayId, focusNotes } = data;
  const notesRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, true);

  // Form fields
  const [title, setTitle] = useState(activity?.title ?? '');
  const [description, setDescription] = useState(activity?.description ?? '');
  const [time, setTime] = useState(activity?.time ?? '10:00');
  const [location, setLocation] = useState(activity?.location ?? '');
  const [duration, setDuration] = useState(String(activity?.duration ?? 60));
  const [cost, setCost] = useState(String(activity?.cost ?? 0));
  const [category, setCategory] = useState<ActivityCategory>(activity?.category ?? 'Other');
  const [aiReason, setAiReason] = useState(activity?.aiReason ?? '');
  const [noteText, setNoteText] = useState('');

  // Note inline editing
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteText, setEditingNoteText] = useState('');

  // Validation
  const [errors, setErrors] = useState<{ title?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Notes from activity (keep local copy so we can render without re-opening modal)
  const [localNotes, setLocalNotes] = useState<Note[]>(activity?.notes ?? []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [onClose]);

  useEffect(() => {
    if (focusNotes && notesRef.current) {
      setTimeout(() => notesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120);
    }
  }, [focusNotes]);

  const validate = (): boolean => {
    const e: { title?: string } = {};
    if (!title.trim()) e.title = 'Title is required.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildInput = (): ActivityInput => ({
    title: title.trim(),
    description: description.trim(),
    time,
    location: location.trim(),
    duration: Math.max(1, Number(duration) || 60),
    cost: Math.max(0, Number(cost) || 0),
    currency,
    category,
    aiReason: aiReason.trim(),
    noteText: mode === 'add' ? noteText : undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate() || submitting) return;
    setSubmitting(true);
    if (mode === 'add') {
      onAdd(dayId, buildInput());
    } else if (activity) {
      onEdit(activity.id, buildInput());
    }
    onClose();
  };

  const handleAddNote = () => {
    if (!noteText.trim() || !activity) return;
    onAddNote(activity.id, noteText.trim());
    const newNote: Note = { id: `note-${Date.now()}`, text: noteText.trim(), createdAt: new Date().toISOString() };
    setLocalNotes((prev) => [...prev, newNote]);
    setNoteText('');
  };

  const handleSaveNoteEdit = (noteId: string) => {
    if (!editingNoteText.trim() || !activity) return;
    onEditNote(activity.id, noteId, editingNoteText.trim());
    setLocalNotes((prev) => prev.map((n) => n.id === noteId ? { ...n, text: editingNoteText.trim() } : n));
    setEditingNoteId(null);
    setEditingNoteText('');
  };

  const handleDeleteNote = (noteId: string) => {
    if (!activity) return;
    onDeleteNote(activity.id, noteId);
    setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
  };

  const startEditNote = (note: Note) => {
    setEditingNoteId(note.id);
    setEditingNoteText(note.text);
  };

  const titleText = mode === 'edit' ? 'Edit activity' : 'Add activity';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div ref={containerRef} className="relative w-full max-w-xl card max-h-[94vh] overflow-hidden flex flex-col rounded-t-card sm:rounded-card" role="dialog" aria-modal="true" aria-labelledby="activity-modal-title">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-glass/10 shrink-0">
          <h2 id="activity-modal-title" className="font-display text-lg font-700 text-ink-900">{titleText}</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1">
          <div className="px-6 py-5 space-y-4">

            {/* Title */}
            <div>
              <label htmlFor="act-title" className="label">Title *</label>
              <input
                id="act-title"
                className={`input ${errors.title ? 'border-rose-500/40 focus:border-rose-500/60' : ''}`}
                value={title}
                onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined })); }}
                placeholder="Activity title"
                autoFocus={!focusNotes}
                required
              />
              {errors.title && <p className="text-xs text-rose-800 dark:text-rose-400 mt-1">{errors.title}</p>}
            </div>

            {/* Description */}
            <div>
              <label htmlFor="act-description" className="label">Description</label>
              <textarea
                id="act-description"
                className="input min-h-[64px] resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description"
              />
            </div>

            {/* Time + Duration */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="act-time" className="label">Start time</label>
                <input id="act-time" type="time" className="input" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div>
                <label htmlFor="act-duration" className="label">Duration (minutes)</label>
                <input
                  id="act-duration"
                  type="number"
                  min="1"
                  max="1440"
                  className="input"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60"
                />
              </div>
            </div>

            {/* Location */}
            <div>
              <label htmlFor="act-location" className="label">Location</label>
              <input id="act-location" className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Neighborhood or venue" />
            </div>

            {/* Cost + Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="act-cost" className="label">Estimated cost ({currency})</label>
                <input id="act-cost" type="number" min="0" className="input" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label htmlFor="act-category" className="label">Category</label>
                <select id="act-category" className="input" value={category} onChange={(e) => setCategory(e.target.value as ActivityCategory)}>
                  {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* AI reason */}
            <div>
              <label htmlFor="act-reason" className="label">AI recommendation reason</label>
              <textarea
                id="act-reason"
                className="input min-h-[56px] resize-none"
                value={aiReason}
                onChange={(e) => setAiReason(e.target.value)}
                placeholder="Why this activity fits the trip"
              />
            </div>

            {/* Notes section */}
            <div ref={notesRef} className="border-t border-glass/10 pt-4">
              <div className="flex items-center gap-2 mb-3">
                <StickyNote size={14} className="text-ink-500" />
                <span className="label mb-0">Personal notes</span>
              </div>

              {/* Existing notes (edit mode) */}
              {mode === 'edit' && (
                <>
                  {localNotes.length === 0 && (
                    <p className="text-xs text-ink-500 mb-3">No notes yet. Add one below.</p>
                  )}
                  {localNotes.map((note) => (
                    <div key={note.id} className="mb-2 rounded-xl border border-glass/10 bg-ink-200/40 px-3 py-2">
                      {editingNoteId === note.id ? (
                        <div className="space-y-2">
                          <textarea
                            className="input min-h-[56px] resize-none text-xs"
                            value={editingNoteText}
                            onChange={(e) => setEditingNoteText(e.target.value)}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveNoteEdit(note.id)}
                              className="btn-primary text-xs px-3 py-1.5"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingNoteId(null)}
                              className="btn-ghost text-xs px-3 py-1.5"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-2">
                          <p className="text-xs text-ink-700 leading-relaxed flex-1">{note.text}</p>
                          <div className="flex gap-1 shrink-0">
                            <button type="button" onClick={() => startEditNote(note)} className="rounded p-1 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition" aria-label="Edit note">
                              <Pencil size={11} />
                            </button>
                            <button type="button" onClick={() => handleDeleteNote(note.id)} className="rounded p-1 text-ink-500 hover:text-rose-800 dark:text-rose-400 hover:bg-rose-500/10 transition" aria-label="Delete note">
                              <Trash2 size={11} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Add new note in edit mode */}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      className="input text-sm flex-1"
                      placeholder="Add a note..."
                      value={noteText}
                      onChange={(e) => setNoteText(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddNote(); } }}
                    />
                    <button
                      type="button"
                      onClick={handleAddNote}
                      disabled={!noteText.trim()}
                      className="btn-outline px-3"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </>
              )}

              {/* Single note field in add mode */}
              {mode === 'add' && (
                <textarea
                  className="input min-h-[64px] resize-none"
                  placeholder="Optional note for this activity..."
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                />
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 pb-5 pt-2 flex items-center justify-end gap-2 border-t border-glass/10 shrink-0 bg-ink-100/40">
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary">
              {mode === 'add' ? 'Add activity' : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
