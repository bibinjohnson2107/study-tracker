import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, Upload, Sparkles, AlertCircle, X } from 'lucide-react';
import api from '../api/client';

export const ImportRoadmap: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'PASTE' | 'UPLOAD'>('PASTE');
  const [pastedText, setPastedText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (activeTab === 'PASTE' && !pastedText.trim()) {
      setError('Please paste your study roadmap text.');
      return;
    }
    if (activeTab === 'UPLOAD' && !selectedFile) {
      setError('Please select a roadmap document to upload.');
      return;
    }

    setLoading(true);

    try {
      let res;
      if (activeTab === 'UPLOAD' && selectedFile) {
        const formData = new FormData();
        formData.append('source_type', 'UPLOAD');
        formData.append('file', selectedFile);
        res = await api.post('/roadmaps/import/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        res = await api.post('/roadmaps/import/', {
          source_type: 'PASTE',
          text: pastedText,
        });
      }

      // Navigate to Review Roadmap page with parsed output & goal ID
      navigate('/review', {
        state: {
          goalId: res.data.goal_id,
          importId: res.data.import_id,
          structure: res.data.structure,
          originalText: res.data.original_text,
        },
      });
    } catch (err: any) {
      setError(err.response?.data?.error || "We couldn't understand this roadmap. Try again or edit the content manually.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      <div className="text-center max-w-xl mx-auto space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center mx-auto text-cyan-400">
          <Sparkles className="w-6 h-6" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">Import Study Roadmap</h1>
        <p className="text-sm text-slate-400">
          Paste or upload a complete roadmap from ChatGPT, Claude, Gemini, or custom documents.
        </p>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-2 flex items-center gap-2 max-w-md mx-auto">
        <button
          type="button"
          onClick={() => { setActiveTab('PASTE'); setError(''); }}
          className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'PASTE'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          Option A — Paste Text
        </button>

        <button
          type="button"
          onClick={() => { setActiveTab('UPLOAD'); setError(''); }}
          className={`flex-1 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'UPLOAD'
              ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          Option B — Upload File
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400 mx-auto"></div>
          <h3 className="text-lg font-bold text-slate-100">Analyzing your study roadmap...</h3>
          <p className="text-xs text-slate-400">Identifying modules, topics, and subtopics hierarchy...</p>
        </div>
      ) : (
        <form onSubmit={handleImport} className="space-y-6">
          {activeTab === 'PASTE' ? (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400">
                Paste Roadmap Content (Plain Text, Markdown, Lists, Headings)
              </label>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                rows={14}
                placeholder={`Example:

Python GenAI Developer

1. Python Fundamentals
   - Variables
   - Data Types
   - Control Flow
   - Functions

2. Object Oriented Programming
   - Classes
   - Inheritance`}
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-sm text-slate-100 font-mono placeholder-slate-600 focus:outline-none focus:border-cyan-500 resize-y"
              />
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl text-center space-y-4">
              <div className="border-2 border-dashed border-slate-800 hover:border-cyan-500/50 rounded-2xl p-10 bg-slate-950/40 transition-colors relative">
                <input
                  type="file"
                  accept=".txt,.md,.pdf,.docx"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-10 h-10 text-cyan-400 mx-auto mb-3" />
                <h4 className="text-base font-bold text-slate-200">
                  {selectedFile ? selectedFile.name : 'Upload Roadmap File'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Supported formats: <span className="text-slate-300 font-semibold">.txt, .md, .pdf, .docx</span>
                </p>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-all flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Cancel
            </button>

            <button
              type="submit"
              className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-cyan-500/25 flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Analyze & Review Roadmap
            </button>
          </div>
        </form>
      )}

    </div>
  );
};
