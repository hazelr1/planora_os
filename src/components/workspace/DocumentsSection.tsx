import { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FileText, Upload, Download, Trash2, Loader2, AlertTriangle } from 'lucide-react';
import { useTripFiles } from '../../hooks/useTripFiles';
import EmptyState from '../EmptyState';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Strips the leading "{timestamp}-" the upload hook adds to avoid collisions. */
function displayName(name: string): string {
  return name.replace(/^\d+-/, '');
}

export default function DocumentsSection({ tripId }: { tripId: string }) {
  const { files, loading, uploading, error, upload, remove } = useTripFiles(tripId, 'documents');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    void upload(fileList[0]);
  };

  return (
    <div className="max-w-2xl space-y-5">
      <div className="card p-6">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="font-display text-lg font-700 text-ink-900">Documents</h2>
            <p className="text-xs text-ink-600 mt-0.5">Tickets, reservations, visas, and other trip files — visible only to you.</p>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-outline w-full mt-4 justify-center"
        >
          {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
          {uploading ? 'Uploading…' : 'Upload a document'}
        </button>

        {error && (
          <div className="mt-3 rounded-lg bg-rose-500/10 px-3 py-2 flex items-start gap-2">
            <AlertTriangle size={13} className="text-rose-700 dark:text-rose-400 mt-0.5 shrink-0" />
            <p className="text-xs text-rose-700 dark:text-rose-300">{error}</p>
          </div>
        )}
      </div>

      <div className="card p-6">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => <div key={i} className="skeleton h-12" style={{ animationDelay: `${i * 60}ms` }} />)}
          </div>
        ) : files.length === 0 ? (
          <EmptyState icon={<FileText size={22} />} title="No documents yet" description="Upload boarding passes, hotel confirmations, or visa paperwork." />
        ) : (
          <ul className="space-y-2">
            <AnimatePresence initial={false}>
              {files.map((f) => (
                <motion.li
                  key={f.path}
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="flex items-center gap-3 rounded-xl bg-ink-200/40 px-4 py-3"
                >
                  <FileText size={16} className="text-brand-700 dark:text-brand-300 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-ink-800 truncate">{displayName(f.name)}</p>
                    <p className="text-xs text-ink-500">{formatSize(f.size)}</p>
                  </div>
                  <a
                    href={f.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded-lg p-2 text-ink-500 hover:text-ink-800 hover:bg-glass/5 transition shrink-0"
                    aria-label={`Download ${displayName(f.name)}`}
                  >
                    <Download size={15} />
                  </a>
                  <button
                    onClick={() => void remove(f.path)}
                    className="rounded-lg p-2 text-ink-500 hover:text-rose-700 dark:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
                    aria-label={`Delete ${displayName(f.name)}`}
                  >
                    <Trash2 size={15} />
                  </button>
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>
    </div>
  );
}
