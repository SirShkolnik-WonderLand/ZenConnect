'use client';

import { Header } from './Header';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: React.ReactNode;
  title?: string;
  showNavigation?: boolean;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ 
  children, 
  title,
  showNavigation = true 
}) => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header title={title} showNavigation={showNavigation} />
      
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};