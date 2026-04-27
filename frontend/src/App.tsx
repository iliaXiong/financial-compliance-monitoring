import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from './components/common';
import { ProtectedRoute } from './components/auth';
import { Layout } from './components/layout';
import { Dashboard } from './pages/Dashboard';
import { ComponentDemo } from './pages/ComponentDemo';
import { Tasks } from './pages/Tasks';
import { Results } from './pages/Results';
import { Settings } from './pages/Settings';

export function AppRoutes() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <ProtectedRoute>
      <Layout
        userName="测试用户"
        activeRoute={location.pathname}
        onNavigate={(route) => navigate(route)}
        onLogout={() => console.log('退出登录')}
      >
        <Routes>
          <Route path="/" element={<Navigate to="/tasks" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/demo" element={<ComponentDemo />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/results" element={<Results />} />
          <Route path="/results/:executionId" element={<Results />} />
          <Route path="/settings" element={<Settings />} />
          {/* 404 Not Found Route */}
          <Route path="*" element={
            <div className="flex items-center justify-center min-h-screen">
              <div className="text-center">
                <h1 className="text-6xl font-bold text-gray-300 mb-4">404</h1>
                <p className="text-xl text-gray-600 mb-6">页面未找到</p>
                <button
                  onClick={() => navigate('/tasks')}
                  className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
                >
                  返回首页
                </button>
              </div>
            </div>
          } />
        </Routes>
      </Layout>
    </ProtectedRoute>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
