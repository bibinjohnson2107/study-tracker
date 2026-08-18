import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { StudyProvider } from './context/StudyContext';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { ImportRoadmap } from './pages/ImportRoadmap';
import { ReviewRoadmap } from './pages/ReviewRoadmap';
import { RoadmapView } from './pages/RoadmapView';
import { TopicView } from './pages/TopicView';
import { SearchPage } from './pages/SearchPage';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <StudyProvider>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-cyan-500 selection:text-slate-950 font-sans">
        <Navbar />
        <div className="flex-1 flex max-w-[1600px] w-full mx-auto px-2 md:px-4">
          <Sidebar />
          <main className="flex-1 p-4 md:p-8 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </StudyProvider>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/import" element={<ProtectedLayout><ImportRoadmap /></ProtectedLayout>} />
          <Route path="/review" element={<ProtectedLayout><ReviewRoadmap /></ProtectedLayout>} />
          <Route path="/roadmap/:id" element={<ProtectedLayout><RoadmapView /></ProtectedLayout>} />
          <Route path="/topics/:id" element={<ProtectedLayout><TopicView /></ProtectedLayout>} />
          <Route path="/search" element={<ProtectedLayout><SearchPage /></ProtectedLayout>} />
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
