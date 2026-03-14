import { useState, useEffect } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@shared/context/ThemeProvider';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Key, 
  Settings2, 
  Share2, 
  AlertOctagon, 
  Database, 
  ArrowLeftRight, 
  X,
  Menu,
  ShieldCheck
} from 'lucide-react';
import lightLogo from '@assets/be-souhola-logo-light.png';
import darkLogo from '@assets/be-souhola-logo-dark.png';
import lightLogoCollapse from '@assets/be-souhola-logo-light-collapse.png';
import darkLogoCollapse from '@assets/be-souhola-logo-dark-collapse.png';

export default function SuperAdminSidebar({ isOpen, onClose, collapsed, setCollapsed }) {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const { resolvedTheme } = useTheme();
  
  const isLight = resolvedTheme === 'light';
  const isRTL = i18n.language === 'ar';
  
  // Decide which logo to show
  const currentLogo = collapsed 
    ? (resolvedTheme === 'dark' ? darkLogoCollapse : lightLogoCollapse)
    : (resolvedTheme === 'dark' ? darkLogo : lightLogo);

  // Styling constants
  const asideTone = isLight ? 'bg-white border-r border-gray-200' : 'bg-[#0f172a] border-r border-gray-800';
  const activeLink = isLight 
    ? 'bg-blue-50 text-blue-600 font-medium' 
    : 'bg-blue-900/20 text-blue-400 font-medium';
  const baseLink = `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800 text-sm ${isLight ? 'text-gray-700' : 'text-gray-300'}`;

  // Menu Items Definition
  const menuItems = [
    { 
      title: 'Admin Dashboard', 
      path: '/system/dashboard', 
      icon: <LayoutDashboard size={20} /> 
    },
    { 
      title: 'Tenant Management', 
      path: '/system/tenants', 
      icon: <Users size={20} /> 
    },
    { 
      title: 'Subscription Plans', 
      path: '/system/subscriptions', // We will map this route
      icon: <Key size={20} /> 
    },
    { 
      title: 'Modules Management', 
      path: '/system/modules', // We will map this route
      icon: <Settings2 size={20} /> 
    },
    { 
      title: 'Administration Settings', 
      path: '/system/settings', // We will map this route
      icon: <Settings size={20} /> 
    },
    { 
      title: 'Global Integrations', 
      path: '/system/integrations', 
      icon: <Share2 size={20} /> 
    },
    { 
      title: 'Error Log', 
      path: '/system/error-log', 
      icon: <AlertOctagon size={20} /> 
    },
    { 
      title: 'Backup', 
      path: '/system/backup', 
      icon: <Database size={20} /> 
    },
    { 
      title: 'Transactions', 
      path: '/system/transactions', 
      icon: <ArrowLeftRight size={20} /> 
    },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside 
        className={`fixed inset-y-0 ${isRTL ? 'right-0 border-l' : 'left-0 border-r'} z-50 flex flex-col transition-all duration-300 ease-in-out
          ${isOpen ? 'translate-x-0' : (isRTL ? 'translate-x-full' : '-translate-x-full')} 
          md:translate-x-0 
          ${collapsed ? 'w-[88px]' : 'w-[280px]'}
          ${asideTone}
        `}
      >
        {/* Header / Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-800">
            <div className={`flex items-center gap-2 overflow-hidden ${collapsed ? 'justify-center w-full' : ''}`}>
                <img src={currentLogo} alt="Logo" className="h-8 object-contain" />
                {!collapsed && (
                    <div className="flex flex-col">
                        <span className="font-bold text-sm leading-tight whitespace-nowrap">Super Admin</span>
                        <span className="text-[10px] text-gray-500">Control Panel</span>
                    </div>
                )}
            </div>
            
            {/* Collapse Toggle (Desktop) */}
            <button 
                onClick={() => setCollapsed(!collapsed)}
                className="hidden md:flex p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
                {isRTL 
                    ? (collapsed ? <Menu size={18} /> : <Menu size={18} />) 
                    : (collapsed ? <Menu size={18} /> : <Menu size={18} />)
                }
            </button>

            {/* Close Button (Mobile) */}
            <button 
                onClick={onClose}
                className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
            >
                <X size={20} />
            </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
            {menuItems.map((item) => (
                <NavLink
                    key={item.path}
                    to={item.path}
                    onClick={() => {
                        if (window.innerWidth < 768) onClose();
                    }}
                    className={({ isActive }) => `
                        ${baseLink} 
                        ${isActive ? activeLink : ''}
                        ${collapsed ? 'justify-center px-0' : ''}
                    `}
                    title={collapsed ? t(item.title) : ''}
                >
                    <span className={`${collapsed ? '' : 'min-w-[20px]'}`}>
                        {item.icon}
                    </span>
                    {!collapsed && (
                        <span className="truncate">{t(item.title)}</span>
                    )}
                </NavLink>
            ))}
        </nav>

        {/* Footer / User Info (Optional) */}
        {!collapsed && (
            <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <ShieldCheck size={16} />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                        <span className="text-xs font-medium truncate">System Administrator</span>
                        <span className="text-[10px] text-gray-500 truncate">v1.0.0</span>
                    </div>
                </div>
            </div>
        )}
      </aside>
    </>
  );
}
