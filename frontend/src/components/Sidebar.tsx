import React, { useState, useEffect, useMemo } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useStudy } from '../context/StudyContext';
import { StudyGoal, Module, Topic, Subtopic } from '../types';
import { 
  LayoutDashboard, 
  Map, 
  FilePlus, 
  Layers, 
  ChevronDown, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Circle, 
  Search, 
  ChevronsUpDown,
  Check,
  ListTree,
  X
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { goals, activeGoal, setActiveGoal, toggleSubtopic } = useStudy();
  const location = useLocation();
  const navigate = useNavigate();

  const [searchQuery, setSearchQuery] = useState('');
  const [collapsedModules, setCollapsedModules] = useState<Record<number, boolean>>({});
  const [expandedTopics, setExpandedTopics] = useState<Record<number, boolean>>({});
  const [showGoalDropdown, setShowGoalDropdown] = useState(false);

  // Auto-expand module and topic when user navigates to a topic view
  useEffect(() => {
    if (!activeGoal || !location.pathname.startsWith('/topics/')) return;
    
    const topicIdMatch = location.pathname.match(/\/topics\/(\d+)/);
    if (!topicIdMatch) return;
    const currentTopicId = parseInt(topicIdMatch[1], 10);

    for (const module of activeGoal.modules || []) {
      for (const topic of module.topics || []) {
        if (topic.id === currentTopicId) {
          // Ensure parent module is expanded
          setCollapsedModules((prev) => ({ ...prev, [module.id]: false }));
          // Ensure topic subtopics are expanded
          setExpandedTopics((prev) => ({ ...prev, [topic.id]: true }));
          break;
        }
      }
    }
  }, [location.pathname, activeGoal]);

  const toggleModuleCollapse = (moduleId: number) => {
    setCollapsedModules((prev) => ({ ...prev, [moduleId]: !prev[moduleId] }));
  };

  const toggleTopicExpand = (topicId: number) => {
    setExpandedTopics((prev) => ({ ...prev, [topicId]: !prev[topicId] }));
  };

  const expandAll = () => {
    setCollapsedModules({});
    if (activeGoal?.modules) {
      const topicExpState: Record<number, boolean> = {};
      activeGoal.modules.forEach(m => {
        m.topics?.forEach(t => {
          if (t.subtopics && t.subtopics.length > 0) {
            topicExpState[t.id] = true;
          }
        });
      });
      setExpandedTopics(topicExpState);
    }
  };

  const collapseAll = () => {
    if (activeGoal?.modules) {
      const modCollState: Record<number, boolean> = {};
      activeGoal.modules.forEach(m => {
        modCollState[m.id] = true;
      });
      setCollapsedModules(modCollState);
      setExpandedTopics({});
    }
  };

  // Filter modules/topics/subtopics based on search query
  const filteredModules = useMemo(() => {
    if (!activeGoal?.modules) return [];
    if (!searchQuery.trim()) return activeGoal.modules;

    const query = searchQuery.toLowerCase();

    return activeGoal.modules.map(module => {
      const moduleMatches = module.title.toLowerCase().includes(query) || 
                            (module.description && module.description.toLowerCase().includes(query));

      const matchingTopics = (module.topics || []).filter(topic => {
        const topicMatches = topic.title.toLowerCase().includes(query) || 
                             (topic.description && topic.description.toLowerCase().includes(query));
        const subtopicMatches = (topic.subtopics || []).some(sub => 
          sub.title.toLowerCase().includes(query)
        );
        return topicMatches || subtopicMatches || moduleMatches;
      });

      if (moduleMatches || matchingTopics.length > 0) {
        return {
          ...module,
          topics: matchingTopics
        };
      }
      return null;
    }).filter(Boolean) as Module[];
  }, [activeGoal, searchQuery]);

  const isSearching = searchQuery.trim().length > 0;

  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
    { label: 'Import Roadmap', icon: FilePlus, path: '/import' },
  ];

  if (activeGoal) {
    navItems.push(
      { label: 'Roadmap View', icon: Map, path: `/roadmap/${activeGoal.id}` }
    );
  }

  return (
    <aside className="w-80 bg-slate-900/80 border-r border-slate-800/80 p-3 flex flex-col justify-between hidden md:flex h-[calc(100vh-65px)] sticky top-[65px] select-none text-slate-200">
      
      {/* Top Section */}
      <div className="flex-1 flex flex-col min-h-0 space-y-4">
        
        {/* Navigation items */}
        <div className="shrink-0 space-y-1">
          <div className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Navigation
          </div>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Active Goal Header & Switcher */}
        {activeGoal && (
          <div className="shrink-0 space-y-2 pt-2 border-t border-slate-800/60">
            <div className="flex items-center justify-between px-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <span>Current Goal</span>
              {goals.length > 1 && (
                <button 
                  onClick={() => setShowGoalDropdown(!showGoalDropdown)}
                  className="text-cyan-400 hover:underline flex items-center gap-0.5 font-bold"
                >
                  Switch <ChevronsUpDown className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* Goal Dropdown Selector if multiple goals exist */}
            {showGoalDropdown && goals.length > 1 && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-1.5 space-y-1 mb-2 shadow-2xl">
                {goals.map(g => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setActiveGoal(g);
                      setShowGoalDropdown(false);
                      navigate(`/roadmap/${g.id}`);
                    }}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between transition-colors ${
                      g.id === activeGoal.id
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-slate-300 hover:bg-slate-800/80'
                    }`}
                  >
                    <span className="truncate">{g.title}</span>
                    {g.id === activeGoal.id && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 ml-2" />}
                  </button>
                ))}
              </div>
            )}

            {/* Active Goal Card */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/90 space-y-2 shadow-inner">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-slate-100 text-xs font-bold truncate">
                  <Layers className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate" title={activeGoal.title}>{activeGoal.title}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>{activeGoal.completed_topics_count} / {activeGoal.total_topics_count} topics</span>
                <span className="font-semibold text-cyan-400">{activeGoal.progress_percentage}%</span>
              </div>

              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-cyan-400 h-full transition-all duration-300 shadow-sm shadow-cyan-500/50"
                  style={{ width: `${activeGoal.progress_percentage}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Roadmap Topics & Subtopics Outline */}
        {activeGoal && (
          <div className="flex-1 flex flex-col min-h-0 pt-2 border-t border-slate-800/60">
            
            {/* Outline Header & Search */}
            <div className="shrink-0 space-y-2 mb-2 px-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <ListTree className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Roadmap Topics</span>
                </div>

                <div className="flex items-center gap-1 text-[10px]">
                  <button
                    onClick={expandAll}
                    className="text-slate-400 hover:text-cyan-400 px-1.5 py-0.5 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors"
                    title="Expand all modules and topics"
                  >
                    Expand
                  </button>
                  <button
                    onClick={collapseAll}
                    className="text-slate-400 hover:text-cyan-400 px-1.5 py-0.5 rounded bg-slate-800/50 hover:bg-slate-800 transition-colors"
                    title="Collapse all modules and topics"
                  >
                    Collapse
                  </button>
                </div>
              </div>

              {/* Filter / Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter topics & subtopics..."
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 transition-all"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Tree View of Modules, Topics & Subtopics */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2 text-xs">
              {filteredModules.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs italic">
                  {isSearching ? 'No matching topics found.' : 'No modules created yet.'}
                </div>
              ) : (
                filteredModules.map((module) => {
                  const isModuleCollapsed = !isSearching && collapsedModules[module.id];
                  const moduleCompletedCount = (module.topics || []).filter(t => t.status === 'COMPLETED').length;
                  const moduleTotalCount = (module.topics || []).length;

                  return (
                    <div 
                      key={module.id} 
                      className="bg-slate-950/40 border border-slate-800/60 rounded-xl overflow-hidden"
                    >
                      {/* Module Header */}
                      <div
                        onClick={() => toggleModuleCollapse(module.id)}
                        className="px-2.5 py-2 bg-slate-900/90 hover:bg-slate-800/80 cursor-pointer flex items-center justify-between gap-2 select-none transition-colors"
                      >
                        <div className="flex items-center gap-1.5 font-bold text-slate-200 text-xs truncate">
                          {isModuleCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                          )}
                          <span className="truncate" title={module.title}>{module.title}</span>
                        </div>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 shrink-0">
                          {moduleCompletedCount}/{moduleTotalCount}
                        </span>
                      </div>

                      {/* Module Topics List */}
                      {!isModuleCollapsed && (
                        <div className="py-1 px-1.5 space-y-1 divide-y divide-slate-800/30">
                          {module.topics?.map((topic) => {
                            const isTopicActive = location.pathname === `/topics/${topic.id}`;
                            const isTopicExpanded = isSearching || expandedTopics[topic.id];
                            const hasSubtopics = topic.subtopics && topic.subtopics.length > 0;

                            return (
                              <div key={topic.id} className="pt-1 first:pt-0">
                                {/* Topic Row */}
                                <div
                                  className={`group flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer transition-all ${
                                    isTopicActive
                                      ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 font-bold shadow-sm'
                                      : 'hover:bg-slate-800/60 text-slate-300'
                                  }`}
                                  onClick={() => navigate(`/topics/${topic.id}`)}
                                >
                                  <div className="flex items-center gap-2 min-w-0 flex-1">
                                    {/* Topic Status Icon */}
                                    {topic.status === 'COMPLETED' ? (
                                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    ) : topic.status === 'IN_PROGRESS' ? (
                                      <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                    ) : (
                                      <Circle className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                    )}

                                    <span 
                                      className={`truncate text-[11.5px] ${
                                        topic.status === 'COMPLETED' ? 'line-through text-slate-400' : ''
                                      }`}
                                      title={topic.title}
                                    >
                                      {topic.title}
                                    </span>
                                  </div>

                                  {/* Subtopics Expand Toggle Button */}
                                  {hasSubtopics && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleTopicExpand(topic.id);
                                      }}
                                      className="p-0.5 rounded text-slate-500 hover:text-slate-200 hover:bg-slate-700/50 transition-colors shrink-0"
                                      title={isTopicExpanded ? "Hide subtopics" : "Show subtopics"}
                                    >
                                      {isTopicExpanded ? (
                                        <ChevronDown className="w-3 h-3 text-cyan-400" />
                                      ) : (
                                        <ChevronRight className="w-3 h-3" />
                                      )}
                                    </button>
                                  )}
                                </div>

                                {/* Subtopics Tree */}
                                {hasSubtopics && isTopicExpanded && (
                                  <div className="ml-4 pl-2.5 my-1 border-l border-slate-800 space-y-1">
                                    {topic.subtopics.map((sub: Subtopic) => {
                                      const isSubDone = sub.status === 'COMPLETED';
                                      return (
                                        <div
                                          key={sub.id}
                                          className="group/sub flex items-center justify-between gap-2 px-1.5 py-1 rounded-md hover:bg-slate-800/40 text-[11px] transition-all cursor-pointer"
                                          onClick={() => navigate(`/topics/${topic.id}`)}
                                        >
                                          <div className="flex items-center gap-2 min-w-0 flex-1">
                                            {/* Subtopic Checkbox */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleSubtopic(sub.id);
                                              }}
                                              className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all shrink-0 ${
                                                isSubDone
                                                  ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                                  : 'border-slate-700 hover:border-cyan-400 bg-slate-900'
                                              }`}
                                              title={isSubDone ? "Mark incomplete" : "Mark complete"}
                                            >
                                              {isSubDone && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                            </button>

                                            <span 
                                              className={`truncate ${
                                                isSubDone 
                                                  ? 'line-through text-slate-500' 
                                                  : 'text-slate-400 group-hover/sub:text-slate-200'
                                              }`}
                                              title={sub.title}
                                            >
                                              {sub.title}
                                            </span>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

      </div>

      {/* Footer */}
      <div className="shrink-0 border-t border-slate-800/80 pt-2.5 px-2 text-[10px] text-slate-500 flex items-center justify-between">
        <span>AI Study Tracker</span>
        <span>v1.0</span>
      </div>

    </aside>
  );
};
