import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/client';
import { StudyGoal } from '../types';
import { useAuth } from './AuthContext';

interface StudyContextType {
  goals: StudyGoal[];
  activeGoal: StudyGoal | null;
  loading: boolean;
  setActiveGoal: (goal: StudyGoal | null) => void;
  fetchGoals: () => Promise<void>;
  refreshActiveGoal: (goalId?: number) => Promise<void>;
  toggleSubtopic: (subtopicId: number) => Promise<void>;
  createGoal: (title: string, description?: string) => Promise<StudyGoal>;
  deleteGoal: (id: number) => Promise<void>;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

export const StudyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<StudyGoal[]>([]);
  const [activeGoal, setActiveGoal] = useState<StudyGoal | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const fetchGoals = async () => {
    if (!user) {
      setGoals([]);
      setActiveGoal(null);
      return;
    }
    setLoading(true);
    try {
      const res = await api.get('/goals/');
      const goalList: StudyGoal[] = res.data;
      setGoals(goalList);
      
      if (goalList.length > 0) {
        // Keep active goal or default to first
        setActiveGoal((prev) => {
          if (!prev) return goalList[0];
          const found = goalList.find(g => g.id === prev.id);
          return found || goalList[0];
        });
      } else {
        setActiveGoal(null);
      }
    } catch (err) {
      console.error("Failed to fetch goals:", err);
    } finally {
      setLoading(false);
    }
  };

  const refreshActiveGoal = async (goalId?: number) => {
    const targetId = goalId || activeGoal?.id;
    if (!targetId) return;
    try {
      const res = await api.get(`/goals/${targetId}/`);
      const updatedGoal = res.data;
      setActiveGoal(updatedGoal);
      setGoals((prevGoals) => prevGoals.map(g => g.id === updatedGoal.id ? updatedGoal : g));
    } catch (err) {
      console.error("Failed to refresh goal:", err);
    }
  };

  const toggleSubtopic = async (subtopicId: number) => {
    try {
      await api.post(`/subtopics/${subtopicId}/toggle_complete/`);
      await refreshActiveGoal();
    } catch (err) {
      console.error("Failed to toggle subtopic:", err);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  const createGoal = async (title: string, description: string = '') => {
    const res = await api.post('/goals/', { title, description });
    const newGoal = res.data;
    await fetchGoals();
    setActiveGoal(newGoal);
    return newGoal;
  };

  const deleteGoal = async (id: number) => {
    await api.delete(`/goals/${id}/`);
    await fetchGoals();
  };

  return (
    <StudyContext.Provider value={{ goals, activeGoal, loading, setActiveGoal, fetchGoals, refreshActiveGoal, toggleSubtopic, createGoal, deleteGoal }}>
      {children}
    </StudyContext.Provider>
  );
};

export const useStudy = () => {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within StudyProvider');
  return context;
};
