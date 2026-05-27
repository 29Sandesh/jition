import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { useAuth } from "./lib/AuthContext";

// Lazy-loaded pages to trigger Vite code splitting and dramatically decrease initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Tasks = lazy(() => import("./pages/Tasks").then(m => ({ default: m.Tasks })));
const Docs = lazy(() => import("./pages/Docs").then(m => ({ default: m.Docs })));
const Planner = lazy(() => import("./pages/Planner").then(m => ({ default: m.Planner })));
const ChatPage = lazy(() => import("./pages/ChatPage").then(m => ({ default: m.ChatPage })));
const HierarchyPage = lazy(() => import("./pages/HierarchyPage").then(m => ({ default: m.HierarchyPage })));

const SettingsPage = lazy(() => import("./pages/SettingsPage").then(m => ({ default: m.SettingsPage })));
const TrashPage = lazy(() => import("./pages/TrashPage").then(m => ({ default: m.TrashPage })));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage").then(m => ({ default: m.NotificationsPage })));
const HelpPage = lazy(() => import("./pages/HelpPage").then(m => ({ default: m.HelpPage })));
const SharePage = lazy(() => import("./pages/SharePage").then(m => ({ default: m.SharePage })));
const EditDashboardPage = lazy(() => import("./pages/EditDashboardPage").then(m => ({ default: m.EditDashboardPage })));
const TimelinePage = lazy(() => import("./pages/TimelinePage").then(m => ({ default: m.TimelinePage })));
const ActivityPage = lazy(() => import("./pages/ActivityPage").then(m => ({ default: m.ActivityPage })));
const HistoryPage = lazy(() => import("./pages/HistoryPage").then(m => ({ default: m.HistoryPage })));
const NewPagePage = lazy(() => import("./pages/NewPagePage").then(m => ({ default: m.NewPagePage })));
const AuthPage = lazy(() => import("./pages/AuthPage").then(m => ({ default: m.AuthPage })));
const OnboardingPage = lazy(() => import("./pages/OnboardingPage").then(m => ({ default: m.OnboardingPage })));

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  if (!user.companyId) return <Navigate to="/onboarding" />;
  
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={
        <div className="h-screen w-full flex items-center justify-center bg-white dark:bg-background">
          <div className="flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
            <p className="text-label-md font-bold text-on-surface-variant">Loading workspace...</p>
          </div>
        </div>
      }>
        <Routes>
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/onboarding" element={<OnboardingPage />} />
          
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="hierarchy" element={<HierarchyPage />} />
            <Route path="docs" element={<Docs />} />
            <Route path="planner" element={<Planner />} />
            <Route path="messages" element={<ChatPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="trash" element={<TrashPage />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="help" element={<HelpPage />} />
            <Route path="share" element={<SharePage />} />
            <Route path="edit-dashboard" element={<EditDashboardPage />} />
            <Route path="timeline" element={<TimelinePage />} />
            <Route path="activity" element={<ActivityPage />} />
            <Route path="history" element={<HistoryPage />} />
            <Route path="new-page" element={<NewPagePage />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
