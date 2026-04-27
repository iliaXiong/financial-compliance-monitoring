import React from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export interface LayoutProps {
  children: React.ReactNode;
  userName?: string;
  activeRoute?: string;
  onNavigate?: (route: string) => void;
  onLogout?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  userName,
  activeRoute,
  onNavigate,
  onLogout,
}) => {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <Header userName={userName} onLogout={onLogout} />
      
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <Sidebar activeRoute={activeRoute} onNavigate={onNavigate} />
        
        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
