import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useStudy } from '../context/StudyContext';
import { BookOpen, Search, LogOut, Plus, ChevronDown, Trash2 } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const { goals, activeGoal, setActiveGoal, deleteGoal } = useStudy();
  const [searchQuery, setSearchQuery] = useState('');
  const [showGoalMenu, setShowGoalMenu] = useState(false);
  const navigate = useNavigate();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const handleDeleteFromDropdown = async (e: React.MouseEvent, goalId: number, goalTitle: string) => {
    e.stopPropagation();
    if (confirm(`Delete study goal "${goalTitle}"?`)) {
      await deleteGoal(goalId);
      if (activeGoal?.id === goalId) {
        navigate('/');
      }
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-3 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        
        {/* Brand logo & Active Goal dropdown */}
        <div className="flex items-center gap-6">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <BookOpen className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <span className="text-lg font-bold bg-gradient-to-r from-white via-slate-100 to-cyan-400 bg-clip-text text-transparent">
                AI Study Tracker
              </span>
              <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-semibold">Workspace</span>
            </div>
          </Link>

          {/* Goal Selector */}
          {goals.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowGoalMenu(!showGoalMenu)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-sm text-slate-200 transition-colors"
              >
                <span className="max-w-[160px] truncate font-medium">
                  {activeGoal ? activeGoal.title : 'Select Study Goal'}
                </span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {showGoalMenu && (
                <div className="absolute left-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-3 py-1 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    My Study Goals
                  </div>
                  {goals.map((g) => (
                    <div
                      key={g.id}
                      onClick={() => {
                        setActiveGoal(g);
                        setShowGoalMenu(false);
                        navigate(`/roadmap/${g.id}`);
                      }}
                      className={`w-full px-3 py-2 text-sm hover:bg-slate-800/80 cursor-pointer transition-colors flex items-center justify-between group/item ${
                        activeGoal?.id === g.id ? 'text-cyan-400 font-semibold bg-slate-800/40' : 'text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col truncate pr-2">
                        <span className="truncate">{g.title}</span>
                        <span className="text-[10px] text-slate-500">{g.progress_percentage}% completed</span>
                      </div>

                      <button
                        onClick={(e) => handleDeleteFromDropdown(e, g.id, g.title)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-700/60 opacity-0 group-hover/item:opacity-100 transition-opacity"
                        title="Delete Roadmap"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  <div className="border-t border-slate-800 mt-1 pt-1 px-2">
                    <Link
                      to="/import"
                      onClick={() => setShowGoalMenu(false)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Import New Roadmap
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Global Search Bar */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-md hidden md:block">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search topics, modules, notes, resources..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-full pl-10 pr-4 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/80 transition-all"
            />
          </div>
        </form>

        {/* User actions */}
        <div className="flex items-center gap-3">
          <Link
            to="/import"
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-sm transition-all shadow-md shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Import Roadmap</span>
          </Link>

          {user && (
            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="hidden lg:flex items-center gap-2 text-sm text-slate-300">
                <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-cyan-400">
                  {user.username[0]?.toUpperCase()}
                </div>
                <span className="font-medium text-slate-200">{user.username}</span>
              </div>
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

      </div>
    </header>
  );
};
