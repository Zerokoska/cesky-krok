import { HashRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { Loading } from './components/ui';
import { AppProvider, useApp } from './data/context';
import { Home } from './pages/Home';
import { HomeworkPage } from './pages/HomeworkPage';
import { LessonPage } from './pages/LessonPage';
import { Login } from './pages/Login';
import { StepPage } from './pages/StepPage';
import { TeacherPage } from './pages/TeacherPage';
import { TestPage } from './pages/TestPage';
import { VocabPage } from './pages/VocabPage';

function RequireAuth() {
  const { profile, ready } = useApp();
  if (!ready) return <Loading />;
  if (!profile) return <Navigate to="/login" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route
              element={
                <ErrorBoundary>
                  <Layout />
                </ErrorBoundary>
              }
            >
              <Route index element={<Home />} />
              <Route path="lekce/:lessonId" element={<LessonPage />} />
              <Route path="lekce/:lessonId/krok/:stepId" element={<StepPage />} />
              <Route path="lekce/:lessonId/slovicka" element={<VocabPage />} />
              <Route path="lekce/:lessonId/test" element={<TestPage />} />
              <Route path="ukoly" element={<HomeworkPage />} />
              <Route path="ucitel" element={<TeacherPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Route>
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
