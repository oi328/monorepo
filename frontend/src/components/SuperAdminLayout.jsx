import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import SuperAdminSidebar from '../shared/components/SuperAdminSidebar';
import SuperAdminTopbar from '../shared/components/SuperAdminTopbar';
import { useTranslation } from 'react-i18next';

export default function SuperAdminLayout() {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // Force direction based on language
    document.documentElement.dir = isRTL ? 'rtl' : 'ltr';
    document.body.dir = isRTL ? 'rtl' : 'ltr';
  }, [isRTL]);

  // Handle auto-collapse on mobile/tablet
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setCollapsed(true);
      } else {
        setCollapsed(false);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial check
    
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex overflow-hidden">
      
      {/* Sidebar */}
      <SuperAdminSidebar 
        isOpen={isMobileSidebarOpen} 
        onClose={() => setIsMobileSidebarOpen(false)} 
        collapsed={collapsed}
        setCollapsed={setCollapsed}
      />

      {/* Main Content Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ease-in-out
          ${isRTL 
            ? (collapsed ? 'md:mr-[88px] mr-0' : 'md:mr-[280px] mr-0') 
            : (collapsed ? 'md:ml-[88px] ml-0' : 'md:ml-[280px] ml-0')
          }
      `}>
        
        {/* Topbar */}
        <SuperAdminTopbar 
          onMobileToggle={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)} 
          mobileSidebarOpen={isMobileSidebarOpen}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
