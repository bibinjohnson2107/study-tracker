import React, { useState } from 'react';
import { Note } from '../types';
import { AdvancedNoteWorkspace } from './AdvancedNoteWorkspace';
import { FileText, Sparkles, Plus, ChevronRight, ChevronDown, Calendar, Clock, Trash2 } from 'lucide-react';
import api from '../api/client';

interface TopicNotesFeedProps {
  topicId: number;
  notes: Note[];
  onNotesChange: () => void;
}

export const TopicNotesFeed: React.FC<TopicNotesFeedProps> = ({
  topicId,
  notes,
  onNotesChange,
}) => {
  const [isSectionCollapsed, setIsSectionCollapsed] = useState(false);
  const [activeNewWorkspace, setActiveNewWorkspace] = useState(false);

  const handleDeleteNote = async (noteId: number) => {
    if (confirm("Are you sure you want to delete this note workspace?")) {
      try {
        await api.delete(`/notes/${noteId}/`);
        onNotesChange();
      } catch (err) {
        console.error("Failed to delete note:", err);
      }
    }
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return { dateStr: '', timeStr: '' };
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { dateStr, timeStr };
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Study Notes & Resource Workspaces
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Unified workspace feed containing written content, embedded videos, images, links & files
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            {notes.length} {notes.length === 1 ? 'Workspace' : 'Workspaces'}
          </span>

          <button
            type="button"
            onClick={() => setIsSectionCollapsed(!isSectionCollapsed)}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all"
          >
            {isSectionCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            {isSectionCollapsed ? 'Expand Workspaces' : 'Collapse Workspaces'}
          </button>
        </div>
      </div>

      {!isSectionCollapsed && (
        <div className="space-y-8">
          {notes.length === 0 && !activeNewWorkspace ? (
            <div className="p-10 text-center border border-dashed border-slate-800 rounded-3xl bg-slate-900/40 space-y-4">
              <Sparkles className="w-10 h-10 text-cyan-400 mx-auto opacity-80" />
              <div className="space-y-1">
                <h4 className="text-base font-bold text-slate-200">No notes or resources posted yet</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Create an interactive workspace below to take notes, embed YouTube videos, attach PDFs, audio files, and formulas.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setActiveNewWorkspace(true)}
                className="px-6 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Create New Workspace
              </button>
            </div>
          ) : (
            <div className="space-y-8">
              {notes.map((note, index) => {
                const { dateStr, timeStr } = formatDateTime(note.updated_at || note.created_at);
                return (
                  <div key={note.id} className="space-y-3">
                    {/* Header Bar for each note entry */}
                    <div className="flex items-center justify-between gap-3 px-2">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-400">
                        <span className="w-6 h-6 rounded-lg bg-slate-800 text-cyan-400 flex items-center justify-center text-[11px]">
                          #{index + 1}
                        </span>
                        <span>Workspace Entry</span>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 font-semibold bg-slate-900 px-3 py-1 rounded-xl border border-slate-800">
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
                      topicId={topicId}
                      initialContent={note.content}
                      onSaved={() => onNotesChange()}
                      onDelete={() => handleDeleteNote(note.id)}
                    />
                  </div>
                );
              })}
            </div>
          )}

          {/* Create Additional Workspace Section */}
          {notes.length > 0 && !activeNewWorkspace && (
            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setActiveNewWorkspace(true)}
                className="px-5 py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 font-bold text-xs transition-all inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Add Another Note Workspace
              </button>
            </div>
          )}

          {activeNewWorkspace && (
            <div className="space-y-3 pt-4 border-t border-slate-800/80">
              <div className="flex items-center justify-between px-2">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> New Workspace Entry
                </span>

                <button
                  onClick={() => setActiveNewWorkspace(false)}
                  className="text-xs text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
              </div>

              <AdvancedNoteWorkspace
                topicId={topicId}
                initialContent=""
                onSaved={() => {
                  setActiveNewWorkspace(false);
                  onNotesChange();
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
