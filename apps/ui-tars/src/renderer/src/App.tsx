/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { Route, HashRouter, Routes } from 'react-router';
import { lazy, Suspense } from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from 'next-themes';

import { MainLayout } from './layouts/MainLayout';

import './styles/globals.css';

const Home = lazy(() => import('./pages/home'));
const LocalOperator = lazy(() => import('./pages/local'));
const FreeRemoteOperator = lazy(() => import('./pages/remote/free'));
// const PaidRemoteOperator = lazy(() => import('./pages/remote/paid'));
const Dashboard = lazy(() => import('./pages/dashboard'));
const AgentPage = lazy(() => import('./pages/agent'));
const AgentWorkspace = lazy(() => import('./pages/agent/workspace'));

const ChatPage = lazy(() => import('./pages/chat'));
const Widget = lazy(() => import('./pages/widget'));
const Bubble = lazy(() => import('./pages/bubble'));

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <HashRouter>
        <Suspense
          fallback={
            <div className="loading-container">
              <div className="loading-spinner" />
            </div>
          }
        >
          <Routes>
            <Route element={<MainLayout />}>
              <Route path="/" element={<Home />} />
              <Route path="/local" element={<LocalOperator />} />
              <Route path="/free-remote" element={<FreeRemoteOperator />} />
              {/* <Route path="/paid-remote" element={<PaidRemoteOperator />} /> */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/agent/:agentType" element={<AgentPage />} />
              <Route path="/agent/:agentType/workspace" element={<AgentWorkspace />} />
            </Route>

            <Route path="/widget" element={<Widget />} />
            <Route path="/bubble" element={<Bubble />} />
          </Routes>
          <Toaster
            position="top-right"
            offset={{ top: '48px' }}
            mobileOffset={{ top: '48px' }}
          />
        </Suspense>
      </HashRouter>
    </ThemeProvider>
  );
}
