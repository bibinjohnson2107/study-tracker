import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, Plus, Clock, History, Trash2, X, Calendar, Sparkles } from 'lucide-react';
import api from '../api/client';

interface StudySession {
  id: number;
  topic: number;
  started_at: string;
  ended_at: string;
  duration_seconds: number;
  notes?: string;
  created_at: string;
}

interface StudyTimerWidgetProps {
  topicId: number;
  totalStudySeconds: number;
  onSessionLogged: () => void;
}

export const StudyTimerWidget: React.FC<StudyTimerWidgetProps> = ({
  topicId,
  totalStudySeconds,
  onSessionLogged,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [startTime, setStartTime] = useState<Date | null>(null);
  
  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [manualMinutes, setManualMinutes] = useState(30);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [logging, setLogging] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    let interval: any = null;
    if (isRunning) {
      interval = setInterval(() => {
        setSeconds((prev) => prev + 1);
      }, 1000);
    } else if (!isRunning && seconds !== 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [isRunning, seconds]);

  const fetchSessionLogs = async () => {
    if (!topicId) return;
    setLoadingSessions(true);
    try {
      const res = await api.get(`/sessions/?topic_id=${topicId}`);
      const data = Array.isArray(res.data) ? res.data : [];
      // Sort latest first
      data.sort((a: StudySession, b: StudySession) => 
        new Date(b.created_at || b.started_at).getTime() - new Date(a.created_at || a.started_at).getTime()
      );
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch session logs:", err);
    } finally {
      setLoadingSessions(false);
    }
  };

  const handleOpenLogs = () => {
    fetchSessionLogs();
    setShowLogsModal(true);
  };

  const handleDeleteSession = async (sessionId: number) => {
    if (confirm("Are you sure you want to delete this session log?")) {
      setDeletingId(sessionId);
      try {
        await api.delete(`/sessions/${sessionId}/`);
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        onSessionLogged();
      } catch (err) {
        console.error("Failed to delete study session:", err);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const handleStart = () => {
    setIsRunning(true);
    if (!startTime) setStartTime(new Date());
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleStop = async () => {
    setIsRunning(false);
    if (seconds > 0 && startTime) {
      setLogging(true);
      const endedAt = new Date();
      try {
        await api.post('/sessions/', {
          topic: topicId,
          started_at: startTime.toISOString(),
          ended_at: endedAt.toISOString(),
          duration_seconds: seconds,
        });
        setSeconds(0);
        setStartTime(null);
        onSessionLogged();
      } catch (err) {
        console.error("Failed to log session:", err);
      } finally {
        setLogging(false);
      }
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (manualMinutes <= 0) return;

    setLogging(true);
    const duration = manualMinutes * 60;
    const ended = new Date();
    const started = new Date(ended.getTime() - duration * 1000);

    try {
      await api.post('/sessions/', {
        topic: topicId,
        started_at: started.toISOString(),
        ended_at: ended.toISOString(),
        duration_seconds: duration,
      });
      setShowManualModal(false);
      onSessionLogged();
    } catch (err) {
      console.error("Failed to log manual session:", err);
    } finally {
      setLogging(false);
    }
  };

  const formatTimer = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;
    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatTotalHours = (totalSecs: number) => {
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    if (hrs === 0 && mins === 0) return '0m';
    if (hrs === 0) return `${mins}m`;
    return `${hrs}h ${mins}m`;
  };

  const formatDateTime = (isoString?: string) => {
    if (!isoString) return { dateStr: '', timeStr: '' };
    const d = new Date(isoString);
    const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    return { dateStr, timeStr };
  };

  return (
    <div className={`sticky top-[68px] z-20 bg-slate-900/95 backdrop-blur-md border rounded-3xl p-4 sm:p-5 shadow-2xl transition-all ${
      isRunning ? 'border-cyan-500/50 shadow-cyan-500/10' : 'border-slate-800'
    }`}>
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Title & Digital Display */}
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-extrabold text-slate-100">Study Timer</h3>
              {isRunning && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                </span>
              )}
            </div>
            <div className="text-2xl sm:text-3xl font-mono font-extrabold tracking-wider text-cyan-400">
              {formatTimer(seconds)}
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap justify-center sm:justify-end">
          {!isRunning ? (
            <button
              type="button"
              onClick={handleStart}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-sky-400 hover:from-cyan-400 hover:to-sky-300 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20"
            >
              <Play className="w-3.5 h-3.5 fill-slate-950" />
              {seconds > 0 ? 'Resume' : 'Start Session'}
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePause}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-amber-500/20"
            >
              <Pause className="w-3.5 h-3.5 fill-slate-950" />
              Pause
            </button>
          )}

          {seconds > 0 && (
            <button
              type="button"
              onClick={handleStop}
              disabled={logging}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30 font-bold text-xs transition-all"
            >
              <Square className="w-3.5 h-3.5 fill-rose-400" />
              Stop & Save
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowManualModal(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 transition-colors"
            title="Log past session manually"
          >
            <Plus className="w-3.5 h-3.5 text-cyan-400" />
            Manual Log
          </button>

          {/* Interactive Total Time & Logs Button */}
          <button
            type="button"
            onClick={handleOpenLogs}
            className="px-3.5 py-2 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-cyan-500/40 text-slate-300 font-bold text-xs flex items-center gap-2 transition-all shadow-inner group"
            title="Click to view all timer logs and details"
          >
            <History className="w-3.5 h-3.5 text-cyan-400 group-hover:rotate-12 transition-transform" />
            <span>Total: <strong className="text-cyan-400 font-extrabold">{formatTotalHours(totalStudySeconds + seconds)}</strong></span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-normal">Logs</span>
          </button>
        </div>

      </div>

      {/* MODAL 1: Timer Logs & Details Modal */}
      {showLogsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-100">Study Session Logs</h4>
                  <p className="text-xs text-slate-400">
                    Total Time Logged: <span className="text-cyan-400 font-bold">{formatTotalHours(totalStudySeconds)}</span>
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Session List */}
            {loadingSessions ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-7 w-7 border-t-2 border-b-2 border-cyan-400"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-950/40 space-y-2">
                <Clock className="w-8 h-8 text-cyan-400 mx-auto opacity-70" />
                <p className="text-xs text-slate-400">No study sessions logged yet for this topic.</p>
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto space-y-3 pr-1">
                {sessions.map((sess, idx) => {
                  const { dateStr, timeStr } = formatDateTime(sess.started_at || sess.created_at);
                  const durationFormatted = formatTotalHours(sess.duration_seconds);

                  return (
                    <div
                      key={sess.id}
                      className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-3 shadow-md hover:border-slate-700 transition-all"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            Session #{sessions.length - idx}
                          </span>
                          <span className="text-xs font-extrabold text-slate-200">
                            {durationFormatted}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-slate-400">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-cyan-400" />
                            {dateStr}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-sky-400" />
                            {timeStr}
                          </span>
                        </div>
                      </div>

                      {/* Delete Option */}
                      <button
                        type="button"
                        onClick={() => handleDeleteSession(sess.id)}
                        disabled={deletingId === sess.id}
                        className="p-2 rounded-xl bg-slate-900 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/30 transition-all"
                        title="Delete timer log"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="pt-2 border-t border-slate-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowLogsModal(false)}
                className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Log Manual Session Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-base font-bold text-slate-100">Log Past Study Session</h4>
              <button
                type="button"
                onClick={() => setShowManualModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-slate-400 mb-1.5">
                  Duration (Minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={manualMinutes}
                  onChange={(e) => setManualMinutes(parseInt(e.target.value) || 0)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logging}
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20"
                >
                  Log Session
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
