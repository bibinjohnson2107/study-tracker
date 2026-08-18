import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { RoadmapStructure } from '../types';
import { useStudy } from '../context/StudyContext';
import { GeneralNotesAndImportedText } from '../components/GeneralNotesAndImportedText';
import { Check, Plus, Trash2, Layers, BookOpen, Sparkles, X } from 'lucide-react';
import api from '../api/client';

export const ReviewRoadmap: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { fetchGoals, setActiveGoal } = useStudy();

  const stateData = location.state as {
    goalId: number;
    structure: RoadmapStructure;
    originalText?: string;
  };

  if (!stateData || !stateData.structure) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">No roadmap data to review.</p>
        <button
          onClick={() => navigate('/import')}
          className="mt-4 px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs"
        >
          Back to Import
        </button>
      </div>
    );
  }

  const [goalId] = useState(stateData.goalId);
  const [structure, setStructure] = useState<RoadmapStructure>(stateData.structure);
  const [originalText] = useState<string>(stateData.originalText || '');
  const [showOriginalText, setShowOriginalText] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleTitleChange = (newTitle: string) => {
    setStructure({ ...structure, title: newTitle });
  };

  const handleModuleNameChange = (mIdx: number, newTitle: string) => {
    const updated = { ...structure };
    updated.modules[mIdx].title = newTitle;
    setStructure(updated);
  };

  const handleTopicNameChange = (mIdx: number, tIdx: number, newTitle: string) => {
    const updated = { ...structure };
    updated.modules[mIdx].topics[tIdx].title = newTitle;
    setStructure(updated);
  };

  const handleSubtopicNameChange = (mIdx: number, tIdx: number, sIdx: number, newTitle: string) => {
    const updated = { ...structure };
    const topic = updated.modules[mIdx].topics[tIdx];
    if (topic.subtopics) {
      topic.subtopics[sIdx] = newTitle;
      setStructure(updated);
    }
  };

  const handleAddModule = () => {
    setStructure({
      ...structure,
      modules: [
        ...structure.modules,
        { title: 'New Module', topics: [{ title: 'New Topic', subtopics: [] }] }
      ]
    });
  };

  const handleAddTopic = (mIdx: number) => {
    const updated = { ...structure };
    updated.modules[mIdx].topics.push({ title: 'New Topic', subtopics: [] });
    setStructure(updated);
  };

  const handleAddSubtopic = (mIdx: number, tIdx: number) => {
    const updated = { ...structure };
    const topic = updated.modules[mIdx].topics[tIdx];
    if (!topic.subtopics) topic.subtopics = [];
    topic.subtopics.push('New Subtopic');
    setStructure(updated);
  };

  const handleDeleteModule = (mIdx: number) => {
    const updated = { ...structure };
    updated.modules.splice(mIdx, 1);
    setStructure(updated);
  };

  const handleDeleteTopic = (mIdx: number, tIdx: number) => {
    const updated = { ...structure };
    updated.modules[mIdx].topics.splice(tIdx, 1);
    setStructure(updated);
  };

  const handleDeleteSubtopic = (mIdx: number, tIdx: number, sIdx: number) => {
    const updated = { ...structure };
    const topic = updated.modules[mIdx].topics[tIdx];
    if (topic.subtopics) {
      topic.subtopics.splice(sIdx, 1);
      setStructure(updated);
    }
  };

  const handleCancelImport = async () => {
    if (confirm('Cancel importing this roadmap and discard the draft?')) {
      try {
        if (goalId) {
          await api.delete(`/goals/${goalId}/`);
          await fetchGoals();
        }
      } catch (err) {
        console.error("Error discarding draft goal:", err);
      } finally {
        navigate('/');
      }
    }
  };

  const handleConfirmAndCreate = async () => {
    setSaving(true);
    setError('');
    try {
      const res = await api.post(`/goals/${goalId}/confirm_roadmap/`, {
        structure: structure
      });
      await fetchGoals();
      setActiveGoal(res.data);
      navigate(`/roadmap/${goalId}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save roadmap structure.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-cyan-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" /> Review & Edit Structure
          </div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-100">
            Review Roadmap Before Creating
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Adjust module names, topics, and subtopics hierarchy before creating your study workspace.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCancelImport}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors flex items-center gap-1.5"
          >
            <X className="w-4 h-4" /> Cancel
          </button>
          <button
            onClick={handleConfirmAndCreate}
            disabled={saving}
            className="px-6 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-cyan-500/25 flex items-center gap-2 disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Creating Workspace...' : 'Confirm & Create Roadmap'}
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm">
          {error}
        </div>
      )}

      {/* General Notes & Imported Text Section */}
      <GeneralNotesAndImportedText
        goalId={goalId}
        originalText={originalText}
      />

      {/* Title Input */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-2">
        <label className="block text-xs font-bold uppercase text-slate-400">
          Study Goal Title
        </label>
        <input
          type="text"
          value={structure.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-lg font-bold text-slate-100 focus:outline-none focus:border-cyan-500"
        />
      </div>

      {/* Modules Tree list */}
      <div className="space-y-6">
        {structure.modules.map((module, mIdx) => (
          <div key={mIdx} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
            
            {/* Module header */}
            <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3 flex-1">
                <Layers className="w-5 h-5 text-cyan-400 shrink-0" />
                <input
                  type="text"
                  value={module.title}
                  onChange={(e) => handleModuleNameChange(mIdx, e.target.value)}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-base font-bold text-slate-100 flex-1 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleAddTopic(mIdx)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Topic
                </button>
                <button
                  onClick={() => handleDeleteModule(mIdx)}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800"
                  title="Delete Module"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Topics list */}
            <div className="pl-6 space-y-4">
              {module.topics.map((topic, tIdx) => (
                <div key={tIdx} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-3">
                  
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 flex-1">
                      <BookOpen className="w-4 h-4 text-sky-400 shrink-0" />
                      <input
                        type="text"
                        value={topic.title}
                        onChange={(e) => handleTopicNameChange(mIdx, tIdx, e.target.value)}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1 text-sm font-semibold text-slate-200 flex-1 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAddSubtopic(mIdx, tIdx)}
                        className="px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Subtopic
                      </button>
                      <button
                        onClick={() => handleDeleteTopic(mIdx, tIdx)}
                        className="p-1 text-slate-500 hover:text-rose-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Subtopics */}
                  {topic.subtopics && topic.subtopics.length > 0 && (
                    <div className="pl-6 space-y-2 border-l border-slate-800">
                      {topic.subtopics.map((sub, sIdx) => {
                        const subTitle = typeof sub === 'string' ? sub : sub.title;
                        return (
                          <div key={sIdx} className="flex items-center justify-between gap-2">
                            <span className="text-slate-500 text-xs">•</span>
                            <input
                              type="text"
                              value={subTitle}
                              onChange={(e) => handleSubtopicNameChange(mIdx, tIdx, sIdx, e.target.value)}
                              className="bg-slate-900 border border-slate-800/80 rounded px-2.5 py-1 text-xs text-slate-300 flex-1 focus:outline-none focus:border-cyan-500"
                            />
                            <button
                              onClick={() => handleDeleteSubtopic(mIdx, tIdx, sIdx)}
                              className="p-1 text-slate-500 hover:text-rose-400"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                </div>
              ))}
            </div>

          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-4">
        <button
          onClick={handleAddModule}
          className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-400 text-xs font-bold flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> Add Module
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCancelImport}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs flex items-center gap-1.5"
          >
            <X className="w-4 h-4" /> Cancel & Discard
          </button>
          <button
            onClick={handleConfirmAndCreate}
            disabled={saving}
            className="px-8 py-3 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-bold text-sm shadow-xl shadow-cyan-500/25 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Confirm & Create Roadmap
          </button>
        </div>
      </div>
    </div>
  );
};
