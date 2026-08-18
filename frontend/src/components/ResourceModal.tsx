import React, { useState } from 'react';
import { X, Link as LinkIcon, Video, Image, FileText, Upload } from 'lucide-react';
import api from '../api/client';

interface ResourceModalProps {
  topicId: number;
  isOpen: boolean;
  onClose: () => void;
  onAdded: () => void;
}

export const ResourceModal: React.FC<ResourceModalProps> = ({
  topicId,
  isOpen,
  onClose,
  onAdded,
}) => {
  const [title, setTitle] = useState('');
  const [resourceType, setResourceType] = useState<'LINK' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'>('LINK');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      if (file) {
        const formData = new FormData();
        formData.append('topic', topicId.toString());
        formData.append('title', title.trim());
        formData.append('resource_type', resourceType);
        if (url) formData.append('url', url.trim());
        formData.append('file', file);

        await api.post('/resources/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/resources/', {
          topic: topicId,
          title: title.trim(),
          resource_type: resourceType,
          url: url.trim(),
        });
      }

      setTitle('');
      setUrl('');
      setFile(null);
      onAdded();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add resource.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <LinkIcon className="w-5 h-5 text-cyan-400" />
            Add Learning Resource
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-medium">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Resource Type
            </label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: 'LINK', label: 'Link', icon: LinkIcon },
                { type: 'VIDEO', label: 'Video', icon: Video },
                { type: 'IMAGE', label: 'Image', icon: Image },
                { type: 'DOCUMENT', label: 'Document', icon: FileText },
              ].map((item) => {
                const Icon = item.icon;
                const active = resourceType === item.type;
                return (
                  <button
                    key={item.type}
                    type="button"
                    onClick={() => setResourceType(item.type as any)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-semibold transition-all ${
                      active
                        ? 'bg-cyan-500/10 border-cyan-500/50 text-cyan-400 shadow-md shadow-cyan-500/10'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Title
            </label>
            <input
              type="text"
              placeholder="e.g. Python Decorators Deep Dive Tutorial"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              URL / Link
            </label>
            <input
              type="url"
              placeholder="https://youtube.com/watch?v=... or https://docs.python.org/..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
              Attach File (Optional)
            </label>
            <div className="relative border border-dashed border-slate-800 rounded-xl p-4 text-center bg-slate-950/40 hover:border-slate-700 transition-colors">
              <input
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
              <Upload className="w-6 h-6 text-slate-500 mx-auto mb-1" />
              <span className="text-xs text-slate-400">
                {file ? file.name : 'Click or drop a file (PDF, PNG, DOCX)'}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
            >
              {submitting ? 'Adding...' : 'Add Resource'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
