import React, { useEffect, useState } from 'react';
import { Note } from '../types';
import { marked } from 'marked';
import { AdvancedNoteWorkspace } from './AdvancedNoteWorkspace';
import { 
  FileText, MessageSquare, Calendar, Clock, Sparkles, Copy, Check, Trash2, Edit3, 
  Save, X, ChevronDown, ChevronUp, ChevronRight, Plus 
} from 'lucide-react';
import api from '../api/client';

interface GeneralNotesAndImportedTextProps {
  goalId: number;
  originalText?: string | null;
}

export const GeneralNotesAndImportedText: React.FC<GeneralNotesAndImportedTextProps> = ({
  goalId,
  originalText = '',
}) => {
  const [activeTab, setActiveTab] = useState<'IMPORTED' | 'GENERAL_NOTES'>('IMPORTED');
  const [generalNotes, setGeneralNotes] = useState<Note[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showFullImported, setShowFullImported] = useState(true);
  const [copiedId, setCopiedId] = useState<number | string | null>(null);
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);
  const [activeNewWorkspace, setActiveNewWorkspace] = useState(false);

  const fetchGeneralNotes = async () => {
    if (!goalId) return;
    setLoadingNotes(true);
    try {
      const res = await api.get(`/notes/by-goal/${goalId}/`);
      setGeneralNotes(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch general notes:", err);
    } finally {
      setLoadingNotes(false);
    }
  };

  useEffect(() => {
    fetchGeneralNotes();
  }, [goalId]);

  const handleDeleteGeneralNote = async (noteId: number) => {
    if (confirm("Are you sure you want to delete this general note workspace?")) {
      try {
        await api.delete(`/notes/${noteId}/`);
        fetchGeneralNotes();
      } catch (err) {
        console.error("Failed to delete general note:", err);
      }
    }
  };

  const handleCopyText = (id: number | string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return { dateStr: '', timeStr: '' };
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { dateStr, timeStr };
  };

  const importedHtml = originalText
    ? (marked.parse(originalText, { async: false }) as string)
    : '';

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
      
      {/* Header & ChatGPT Style Dual Button Switcher */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center justify-between gap-4 flex-1">
          <div>
            <h2 className="text-lg lg:text-xl font-extrabold text-slate-100 flex items-center gap-2.5">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              General Notes & Imported Text
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Access original imported roadmap syllabus or add global goal-level multimedia notes
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsSectionCollapsed(!isSectionCollapsed)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all shrink-0"
          >
            {isSectionCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isSectionCollapsed ? 'Expand Section' : 'Collapse Section'}
          </button>
        </div>

        {/* ChatGPT Style Pill Switcher */}
        <div className="bg-slate-950 border border-slate-800 p-1.5 rounded-2xl flex items-center gap-2 self-start xl:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab('IMPORTED')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'IMPORTED'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Imported Reference Text
            {originalText && (
              <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
                activeTab === 'IMPORTED' ? 'bg-slate-950/20 text-slate-950 font-extrabold' : 'bg-slate-800 text-cyan-400'
              }`}>
                {originalText.length} chars
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('GENERAL_NOTES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'GENERAL_NOTES'
                ? 'bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 shadow-lg shadow-cyan-500/25 scale-[1.02]'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            General Notes Workspace
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-mono ${
              activeTab === 'GENERAL_NOTES' ? 'bg-slate-950/20 text-slate-950 font-extrabold' : 'bg-slate-800 text-cyan-400'
            }`}>
              {generalNotes.length} {generalNotes.length === 1 ? 'workspace' : 'workspaces'}
            </span>
          </button>
        </div>
      </div>

      {!isSectionCollapsed && (
        <>

      {/* TAB 1: Imported Reference Text */}
      {activeTab === 'IMPORTED' && (
        <div className="space-y-4">
          {!originalText ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl">
              <p className="text-xs text-slate-400">No original imported text recorded for this roadmap.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Original Roadmap Prompt & Text Reference
                </span>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleCopyText('imported', originalText)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    {copiedId === 'imported' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                    {copiedId === 'imported' ? 'Copied!' : 'Copy Text'}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowFullImported(!showFullImported)}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 font-bold text-xs flex items-center gap-1.5 transition-all"
                  >
                    {showFullImported ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    {showFullImported ? 'Collapse Text' : 'View Full Text'}
                  </button>
                </div>
              </div>

              {showFullImported && (
                <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-6 shadow-inner">
                  <div
                    className="markdown-body"
                    dangerouslySetInnerHTML={{ __html: importedHtml }}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: General Notes Workspaces */}
      {activeTab === 'GENERAL_NOTES' && (
        <div className="space-y-6">
          {loadingNotes ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400"></div>
            </div>
          ) : generalNotes.length === 0 && !activeNewWorkspace ? (
            <div className="p-8 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-950/40 space-y-4">
              <MessageSquare className="w-8 h-8 text-cyan-400 mx-auto opacity-80" />
              <h4 className="text-sm font-bold text-slate-200">No general note workspaces posted yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Create a multimedia note workspace to write global goal notes, overview strategies, or embed key learning links.
              </p>

              <button
                type="button"
                onClick={() => setActiveNewWorkspace(true)}
                className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-bold text-xs shadow-lg inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create General Note Workspace
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {generalNotes.map((note, index) => {
                const { dateStr, timeStr } = formatDateTime(note.updated_at || note.created_at);
                return (
                  <div key={note.id} className="space-y-3">
                    <div className="flex items-center justify-between gap-3 px-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-cyan-400 flex items-center justify-center text-[11px]">
                          #{index + 1}
                        </span>
                        <span>General Note Entry</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Calendar className="w-3.5 h-3.5" /> {dateStr}
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 text-sky-400">
                          <Clock className="w-3.5 h-3.5" /> {timeStr}
                        </span>
                      </div>
                    </div>

                    <AdvancedNoteWorkspace
                      noteId={note.id}
                      goalId={goalId}
                      initialContent={note.content}
                      onSaved={() => fetchGeneralNotes()}
                      onDelete={() => handleDeleteGeneralNote(note.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {generalNotes.length > 0 && !activeNewWorkspace && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveNewWorkspace(true)}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold text-xs transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add General Workspace Entry
              </button>
            </div>
          )}

          {activeNewWorkspace && (
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> New General Note Workspace
                </span>
                <button
                  onClick={() => setActiveNewWorkspace(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              <AdvancedNoteWorkspace
                goalId={goalId}
                initialContent=""
                onSaved={() => {
                  setActiveNewWorkspace(false);
                  fetchGeneralNotes();
                }}
              />
            </div>
          )}
        </div>
      )}
        </>
      )}

    </div>
  );
};
