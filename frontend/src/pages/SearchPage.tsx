import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, BookOpen, Layers, FileText, Link as LinkIcon, ArrowRight, Calendar, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import api from '../api/client';

export const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const query = searchParams.get('q') || '';
  const [results, setResults] = useState<any>({ modules: [], topics: [], subtopics: [], notes: [], resources: [] });
  const [loading, setLoading] = useState(false);
  const [collapsedNotes, setCollapsedNotes] = useState<{ [key: number]: boolean }>({});
  const navigate = useNavigate();

  const toggleNoteCollapse = (e: React.MouseEvent, noteId: number) => {
    e.stopPropagation();
    setCollapsedNotes((prev) => ({ ...prev, [noteId]: !prev[noteId] }));
  };

  useEffect(() => {
    const fetchResults = async () => {
      if (!query.trim()) return;
      setLoading(true);
      try {
        const res = await api.get(`/search/?q=${encodeURIComponent(query)}`);
        setResults(res.data);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [query]);

  return (
    <div className="max-w-5xl mx-auto py-6 space-y-8">
      <div className="border-b border-slate-800 pb-4">
        <h1 className="text-2xl font-extrabold text-slate-100 flex items-center gap-3">
          <Search className="w-6 h-6 text-cyan-400" />
          Search Results for "{query}"
        </h1>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-cyan-400"></div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* Topics */}
          {results.topics?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase text-slate-400">Topics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.topics.map((topic: any) => (
                  <div
                    key={topic.id}
                    onClick={() => navigate(`/topics/${topic.id}`)}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all flex items-center justify-between"
                  >
                    <div>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase">{topic.module_title}</span>
                      <h4 className="text-sm font-bold text-slate-100">{topic.title}</h4>
                    </div>
                    <ArrowRight className="w-4 h-4 text-cyan-400" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {results.notes?.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase text-slate-400">Notes</h3>
              <div className="space-y-4">
                {results.notes.map((note: any) => {
                  const isNoteCollapsed = !!collapsedNotes[note.id];
                  return (
                    <div
                      key={note.id}
                      onClick={() => navigate(`/topics/${note.topic}`)}
                      className="p-5 rounded-3xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all space-y-3 shadow-xl"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
                        <span className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                          <FileText className="w-3.5 h-3.5" /> Topic Note
                        </span>

                        <div className="flex items-center gap-3">
                          {(note.updated_at || note.created_at) && (
                            <div className="flex items-center gap-3 text-xs font-semibold text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800">
                              <span className="flex items-center gap-1.5 text-cyan-400">
                                <Calendar className="w-3.5 h-3.5" />
                                {new Date(note.updated_at || note.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </span>
                              <span className="text-slate-600">•</span>
                              <span className="flex items-center gap-1.5 text-sky-400">
                                <Clock className="w-3.5 h-3.5" />
                                {new Date(note.updated_at || note.created_at).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </span>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={(e) => toggleNoteCollapse(e, note.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-slate-800 transition-colors"
                            title={isNoteCollapsed ? "Expand note" : "Collapse note"}
                          >
                            {isNoteCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      {isNoteCollapsed ? (
                        <div className="text-xs text-slate-400 italic font-mono truncate">
                          {note.content.substring(0, 90)}... <span className="text-cyan-400 not-italic font-semibold ml-1">(Collapsed)</span>
                        </div>
                      ) : (
                        <pre className="text-sm text-slate-200 font-mono leading-relaxed whitespace-pre-wrap font-normal">
                          {note.content}
                        </pre>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Resources */}
          {results.resources?.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-bold uppercase text-slate-400">Resources</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {results.resources.map((res: any) => (
                  <div
                    key={res.id}
                    onClick={() => navigate(`/topics/${res.topic}`)}
                    className="p-4 rounded-2xl bg-slate-900 border border-slate-800 hover:border-cyan-500/50 cursor-pointer transition-all"
                  >
                    <span className="text-[10px] font-bold text-cyan-400 uppercase">{res.resource_type}</span>
                    <h4 className="text-sm font-bold text-slate-100">{res.title}</h4>
                  </div>
                ))}
              </div>
            </div>
          )}

          {results.topics?.length === 0 && results.notes?.length === 0 && results.resources?.length === 0 && (
            <div className="text-center py-12 text-slate-400">
              No matching results found for "{query}".
            </div>
          )}

        </div>
      )}
    </div>
  );
};
