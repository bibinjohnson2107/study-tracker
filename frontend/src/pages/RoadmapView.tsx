import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { StudyGoal, Module, Topic } from '../types';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import { GeneralNotesAndImportedText } from '../components/GeneralNotesAndImportedText';
import { ChevronDown, ChevronRight, BookOpen, Layers, ArrowRight, Trash2 } from 'lucide-react';
import api from '../api/client';

export const RoadmapView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { setActiveGoal, deleteGoal } = useStudy();

  const [goal, setGoal] = useState<StudyGoal | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsedModules, setCollapsedModules] = useState<{ [key: number]: boolean }>({});

  const fetchGoalDetail = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/goals/${id}/`);
      setGoal(res.data);
      setActiveGoal(res.data);
    } catch (err) {
      console.error("Failed to fetch goal detail:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoalDetail();
  }, [id]);

  const toggleModule = (modId: number) => {
    setCollapsedModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const handleDeleteGoal = async () => {
    if (!goal) return;
    if (confirm(`Are you sure you want to delete "${goal.title}" and all its modules, topics, notes, and study records?`)) {
      try {
        await deleteGoal(goal.id);
        navigate('/');
      } catch (err) {
        console.error("Failed to delete goal:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Study goal not found.</p>
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-cyan-500 text-slate-950 font-bold rounded-xl text-xs">
          Back to Dashboard
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      
      {/* Goal Header & Overall Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl space-y-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Study Goal Roadmap
            </span>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1">
              {goal.title}
            </h1>
            {goal.description && (
              <p className="text-sm text-slate-400 mt-2">{goal.description}</p>
            )}
          </div>

          <button
            onClick={handleDeleteGoal}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 font-semibold text-xs transition-all"
            title="Delete Roadmap"
          >
            <Trash2 className="w-4 h-4" />
            Delete Roadmap
          </button>
        </div>

        <div className="pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span>Overall Roadmap Progress</span>
            <span className="font-bold text-slate-200">
              {goal.completed_topics_count} / {goal.total_topics_count} Topics Completed
            </span>
          </div>
          <ProgressBar progress={goal.progress_percentage} size="lg" />
        </div>
      </div>

      {/* General Notes & Imported Text Section */}
      <GeneralNotesAndImportedText
        goalId={goal.id}
        originalText={goal.original_text}
      />

      {/* Modules List */}
      <div className="space-y-6">
        {goal.modules?.map((module: Module) => {
          const isCollapsed = collapsedModules[module.id];
          return (
            <div
              key={module.id}
              className="bg-slate-900/80 border border-slate-800 rounded-3xl overflow-hidden shadow-xl"
            >
              {/* Module Header Bar */}
              <div
                onClick={() => toggleModule(module.id)}
                className="p-5 bg-slate-900 hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between gap-4 select-none"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400">
                    <Layers className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-100">{module.title}</h3>
                    <span className="text-xs text-slate-400">
                      {module.completed_topics_count} / {module.total_topics_count} topics completed ({module.progress_percentage}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-24 hidden sm:block">
                    <ProgressBar progress={module.progress_percentage} size="sm" showPercentage={false} />
                  </div>
                  {isCollapsed ? (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  )}
                </div>
              </div>

              {/* Topics list */}
              {!isCollapsed && (
                <div className="p-4 border-t border-slate-800/60 divide-y divide-slate-800/40">
                  {module.topics?.map((topic: Topic) => (
                    <div
                      key={topic.id}
                      onClick={() => navigate(`/topics/${topic.id}`)}
                      className="py-3.5 px-3 rounded-2xl hover:bg-slate-800/50 cursor-pointer transition-all flex items-center justify-between gap-4 group"
                    >
                      <div className="flex items-center gap-3">
                        <BookOpen className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                        <div>
                          <h4 className="text-sm font-semibold text-slate-200 group-hover:text-cyan-400 transition-colors">
                            {topic.title}
                          </h4>
                          {topic.total_subtopics_count > 0 && (
                            <span className="text-xs text-slate-500">
                              {topic.completed_subtopics_count}/{topic.total_subtopics_count} subtopics
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <StatusBadge status={topic.status} size="sm" />
                        <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          );
        })}
      </div>

    </div>
  );
};
