import { useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Image as ImageIcon, Upload, Trash2, Loader2, AlertTriangle, X } from 'lucide-react';
import { useTripFiles } from '../../hooks/useTripFiles';
import EmptyState from '../EmptyState';

export default function GallerySection({ tripId }: { tripId: string }) {
  const { files, loading, uploading, error, upload, remove } = useTripFiles(tripId, 'gallery');
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    void upload(fileList[0]);
  };

  return (
    <div className="max-w-4xl space-y-5">
      <div className="card p-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="font-display text-lg font-700 text-ink-900">Gallery</h2>
            <p className="text-xs text-ink-600 mt-0.5">Photos from your trip — visible only to you.</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="btn-primary text-sm shrink-0"
          >
            {uploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
        </div>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-500/10 border border-rose-500/20 px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={13} className="text-rose-400 mt-0.5 shrink-0" />
            <p className="text-xs text-rose-300">{error}</p>
          </div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="skeleton aspect-square rounded-xl" style={{ animationDelay: `${i * 60}ms` }} />)}
        </div>
      ) : files.length === 0 ? (
        <div className="card">
          <EmptyState icon={<ImageIcon size={22} />} title="No photos yet" description="Upload photos to build a visual record of this trip." />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence initial={false}>
            {files.map((f) => (
              <motion.div
                key={f.path}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
                className="group relative aspect-square rounded-xl overflow-hidden border border-glass/10 bg-ink-200/40 cursor-pointer"
                onClick={() => setPreview(f.url)}
              >
                <img src={f.url} alt="" className="h-full w-full object-cover" loading="lazy" />
                <button
                  onClick={(e) => { e.stopPropagation(); void remove(f.path); }}
                  className="absolute top-1.5 right-1.5 rounded-lg p-1.5 bg-ink-950/70 text-white opacity-0 group-hover:opacity-100 transition hover:bg-rose-500/80"
                  aria-label="Delete photo"
                >
                  <Trash2 size={13} />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Lightbox */}
      <AnimatePresence>
        {preview && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink-950/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreview(null)}
          >
            <motion.img
              src={preview}
              alt=""
              className="max-h-[85vh] max-w-full rounded-2xl shadow-pop"
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
            />
            <button
              onClick={() => setPreview(null)}
              className="absolute top-5 right-5 rounded-lg p-2 bg-glass/10 text-white hover:bg-glass/20 transition"
              aria-label="Close preview"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
