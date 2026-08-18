import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { ProgressBar } from '../components/ProgressBar';
import { StatusBadge } from '../components/StatusBadge';
import { Plus, ArrowRight, BookOpen, CheckCircle2, Clock, Sparkles, Layers, Trash2 } from 'lucide-react';
import api from '../api/client';
import { Topic } from '../types';

export const Dashboard: React.FC = () => {
  const { goals, loading, setActiveGoal, deleteGoal } = useStudy();
  const [activeTopics, setActiveTopics] = useState<Topic[]>([]);
  const [completedTopics, setCompletedTopics] = useState<Topic[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchRecentTopics = async () => {
      try {
        const inProgressRes = await api.get('/topics/?status=IN_PROGRESS');
        setActiveTopics(inProgressRes.data.slice(0, 6));

        const completedRes = await api.get('/topics/?status=COMPLETED');
        setCompletedTopics(completedRes.data.slice(0, 6));
      } catch (err) {
        console.error("Failed to fetch dashboard topics:", err);
      }
    };
    fetchRecentTopics();
  }, [goals]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <div className="w-20 h-20 rounded-3xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-cyan-500/10">
          <Sparkles className="w-10 h-10 text-cyan-400" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-100 mb-3">
          You haven't created a study goal yet.
        </h2>
        <p className="text-slate-400 text-sm max-w-md mx-auto mb-8">
          Upload or paste any LLM study roadmap (from ChatGPT, Claude, Gemini) and let AI turn it into an interactive study workspace.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/import"
            className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-bold text-sm transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Import Study Roadmap
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-10">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-100 tracking-tight">
            My Study Goals
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track your roadmaps, daily progress, and topic notes.
          </p>
        </div>

        <Link
          to="/import"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20"
        >
          <Plus className="w-4 h-4" />
          Import Roadmap
        </Link>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className="bg-slate-900/80 border border-slate-800 hover:border-cyan-500/40 rounded-3xl p-6 shadow-xl hover:shadow-cyan-500/5 transition-all group flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-100 group-hover:text-cyan-400 transition-colors">
                      {goal.title}
                    </h3>
                    <span className="text-xs text-slate-400">
                      {goal.completed_topics_count} / {goal.total_topics_count} topics completed
                    </span>
                  </div>
                </div>

                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    if (confirm(`Delete study goal "${goal.title}"?`)) {
                      await deleteGoal(goal.id);
                    }
                  }}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                  title="Delete Goal"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="my-5">
                <ProgressBar progress={goal.progress_percentage} size="md" />
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                {goal.modules?.length || 0} Modules
              </span>
              <button
                onClick={() => {
                  setActiveGoal(goal);
                  navigate(`/roadmap/${goal.id}`);
                }}
                className="flex items-center gap-1.5 text-xs font-bold text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Currently Studying Topics */}
      {activeTopics.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            Currently Studying
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => navigate(`/topics/${topic.id}`)}
                className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 cursor-pointer transition-all hover:translate-y-[-2px] space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-cyan-400 uppercase tracking-wider truncate max-w-[180px]">
                    {topic.module_title}
                  </span>
                  <StatusBadge status={topic.status} size="sm" />
                </div>
                <h4 className="text-sm font-bold text-slate-100 line-clamp-1">{topic.title}</h4>
                <div className="text-xs text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800/60">
                  <span>{topic.completed_subtopics_count}/{topic.total_subtopics_count} subtopics</span>
                  <span className="text-cyan-400 font-semibold flex items-center gap-1">
                    Study <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recently Completed Topics */}
      {completedTopics.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Recently Completed
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {completedTopics.map((topic) => (
              <div
                key={topic.id}
                onClick={() => navigate(`/topics/${topic.id}`)}
                className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 rounded-2xl p-4 cursor-pointer transition-all space-y-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                    {topic.module_title}
                  </span>
                  <StatusBadge status={topic.status} size="sm" />
                </div>
                <h4 className="text-sm font-bold text-slate-200 line-clamp-1">{topic.title}</h4>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};
