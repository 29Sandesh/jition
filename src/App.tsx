/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Dashboard } from "./pages/Dashboard";
import { Tasks } from "./pages/Tasks";
import { Docs } from "./pages/Docs";
import { Planner } from "./pages/Planner";
import { ChatPage } from "./pages/ChatPage";
import {
  SettingsPage,
  TrashPage,
  NotificationsPage,
  HelpPage,
  SharePage,
  EditDashboardPage,
  TimelinePage,
  ActivityPage,
  HistoryPage,
  NewPagePage,
  AuthPage,
  OnboardingPage
} from "./pages/OtherPages";
import { useAuth } from "./lib/AuthContext";
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  
  if (isLoading) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/auth" />;
  if (!user.companyId) return <Navigate to="/onboarding" />;
  
  return <>{children}</>;
}

import { HierarchyPage } from "./pages/HierarchyPage";

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
