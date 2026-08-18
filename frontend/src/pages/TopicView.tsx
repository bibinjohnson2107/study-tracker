import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Topic, Note, Subtopic } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TopicNotesFeed } from '../components/TopicNotesFeed';
import { StudyTimerWidget } from '../components/StudyTimerWidget';
import { CheckCircle2, ChevronRight, BookOpen } from 'lucide-react';
import api from '../api/client';

export const TopicView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [topic, setTopic] = useState<Topic | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTopicDetail = async () => {
    if (!id) return;
    try {
      const topicRes = await api.get(`/topics/${id}/`);
      setTopic(topicRes.data);

      const noteRes = await api.get(`/notes/by-topic/${id}/`);
      const notesList = Array.isArray(noteRes.data) ? noteRes.data : (noteRes.data ? [noteRes.data] : []);
      setNotes(notesList);
    } catch (err) {
      console.error("Failed to fetch topic details:", err);
    } fontally: {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTopicDetail();
  }, [id]);

  const handleUpdateStatus = async (newStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED') => {
    if (!id) return;
    try {
      const res = await api.post(`/topics/${id}/update_status/`, { status: newStatus });
      setTopic(res.data);
    } catch (err) {
      console.error("Failed to update status:", err);
    }
  };

  const handleToggleSubtopic = async (subId: number) => {
    try {
      await api.post(`/subtopics/${subId}/toggle_complete/`);
      fetchTopicDetail();
    } catch (err) {
      console.error("Failed to toggle subtopic:", err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!topic) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-400">Topic not found.</p>
      </div>
    );
  }

  const isCompleted = topic.status === 'COMPLETED';
  const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
        <Link to="/" className="hover:text-slate-200">Dashboard</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <Link to={`/roadmap/${topic.goal_id}`} className="hover:text-slate-200">{topic.goal_title}</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-slate-400">{topic.module_title}</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span className="text-cyan-400">{topic.title}</span>
      </nav>

      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 lg:p-8 shadow-2xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-400">
              Module: {topic.module_title}
            </span>
            <h1 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1">
              {topic.title}
            </h1>
          </div>

          <div className="flex items-center gap-3">
            <StatusBadge status={topic.status} />

            <button
              onClick={() => handleUpdateStatus(isCompleted ? 'IN_PROGRESS' : 'COMPLETED')}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 shadow-lg ${
                isCompleted
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                  : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              {isCompleted ? 'Reopen Topic' : 'Mark Topic as Complete'}
            </button>
          </div>
        </div>
      </div>

      {/* Top Study Timer Bar */}
      <StudyTimerWidget
        topicId={topic.id}
        totalStudySeconds={topic.total_study_time_seconds || 0}
        onSessionLogged={fetchTopicDetail}
      />

      {/* Main Content Layout */}
      <div className={`grid grid-cols-1 ${hasSubtopics ? 'lg:grid-cols-12' : ''} gap-8 items-start`}>
        
        {/* Left Subtopics Checklist Column if subtopics exist */}
        {hasSubtopics && (
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 sticky top-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-cyan-400" />
                  Subtopics
                </h3>
                <span className="text-xs font-semibold text-cyan-400">
                  {topic.completed_subtopics_count} / {topic.total_subtopics_count} ({topic.progress_percentage}%)
                </span>
              </div>

              <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
                {topic.subtopics.map((sub: Subtopic) => {
                  const isSubDone = sub.status === 'COMPLETED';
                  return (
                    <div
                      key={sub.id}
                      onClick={() => handleToggleSubtopic(sub.id)}
                      className={`flex items-center gap-3 p-3 rounded-2xl border cursor-pointer transition-all ${
                        isSubDone
                          ? 'bg-emerald-500/5 border-emerald-500/20 text-slate-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-200 hover:border-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSubDone}
                        onChange={() => {}}
                        className="w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 bg-slate-900"
                      />
                      <span className={`text-xs font-medium ${isSubDone ? 'line-through text-slate-500' : ''}`}>
                        {sub.title}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Unified Multimedia Note & Resource Workspace */}
        <div className={hasSubtopics ? 'lg:col-span-8' : 'w-full'}>
          <TopicNotesFeed
            topicId={topic.id}
            notes={notes}
            onNotesChange={fetchTopicDetail}
          />
        </div>

      </div>

    </div>
  );
};
