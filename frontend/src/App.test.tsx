import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App, { AppRoutes } from './App';

// Mock the pages to avoid complex dependencies
jest.mock('./pages/Dashboard', () => ({
  Dashboard: () => <div>Dashboard Page</div>,
}));

jest.mock('./pages/Tasks', () => ({
  Tasks: () => <div>Tasks Page</div>,
}));

jest.mock('./pages/Results', () => ({
  Results: () => <div>Results Page</div>,
}));

jest.mock('./pages/Settings', () => ({
  Settings: () => <div>Settings Page</div>,
}));

jest.mock('./pages/ComponentDemo', () => ({
  ComponentDemo: () => <div>Component Demo Page</div>,
}));

describe('App Routing', () => {
  it('should redirect root path to /dashboard', async () => {
    render(<App />);
    
    await waitFor(() => {
      expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
  });

  it('should render Dashboard page on /dashboard route', () => {
    render(
      <MemoryRouter initialEntries={['/dashboard']}>
        <AppRoutes />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('should render Tasks page on /tasks route', () => {
    render(
      <MemoryRouter initialEntries={['/tasks']}>
        <AppRoutes />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Tasks Page')).toBeInTheDocument();
  });

  it('should render Results page on /results route', () => {
    render(
      <MemoryRouter initialEntries={['/results']}>
        <AppRoutes />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Results Page')).toBeInTheDocument();
  });

  it('should render Settings page on /settings route', () => {
    render(
      <MemoryRouter initialEntries={['/settings']}>
        <AppRoutes />
      </MemoryRouter>
    );
    
    expect(screen.getByText('Settings Page')).toBeInTheDocument();
  });

  it('should render 404 page for unknown routes', () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <AppRoutes />
      </MemoryRouter>
    );
    
    expect(screen.getByText('404')).toBeInTheDocument();
    expect(screen.getByText('页面未找到')).toBeInTheDocument();
  });
});

describe('ErrorBoundary', () => {
  // Suppress console.error for this test
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  it('should catch errors and display error UI', () => {
    const ThrowError = () => {
      throw new Error('Test error');
    };

    // We need to wrap in ErrorBoundary directly for this test
    const { ErrorBoundary } = require('./components/common');
    
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('应用程序出错')).toBeInTheDocument();
    expect(screen.getByText(/抱歉，应用程序遇到了一个错误/)).toBeInTheDocument();
  });
});
