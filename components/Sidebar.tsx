import React from 'react';
import { LayoutTemplate, FileText, Home, Settings } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onNavigate: (view: 'DASHBOARD' | 'ARTICLES' | 'COVERS' | 'SETTINGS') => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ activeView, onNavigate }) => {
  const navItems = [
    { id: 'DASHBOARD', label: 'Dashboard', icon: Home },
    { id: 'COVERS', label: 'Portadas', icon: LayoutTemplate },
    { id: 'ARTICLES', label: 'Articles', icon: FileText },
    { id: 'SETTINGS', label: 'Settings', icon: Settings },
  ] as const;

  return (
    <div className="w-20 lg:w-64 bg-slate-900 text-white flex flex-col flex-shrink-0 transition-all duration-300">
      <div className="h-16 flex items-center justify-center lg:justify-start lg:px-6 border-b border-slate-800">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <span className="font-serif font-bold text-xl">D</span>
        </div>
        <span className="ml-3 font-serif font-bold text-lg hidden lg:block tracking-wide">DiarioCMS</span>
      </div>
      
      <nav className="flex-1 py-6 space-y-1 px-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`w-full flex items-center p-3 rounded-lg transition-all duration-200 group relative
              ${activeView === item.id 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
          >
            <item.icon size={20} className={`${activeView === item.id ? 'text-white' : 'text-slate-400 group-hover:text-white'} flex-shrink-0`} />
            <span className="ml-3 text-sm font-medium hidden lg:block">{item.label}</span>
            {activeView === item.id && (
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white/20 rounded-r-full -ml-2"></div>
            )}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3">
            <img src="https://i.pravatar.cc/150?u=admin" alt="User" className="w-8 h-8 rounded-full border border-slate-600" />
            <div className="hidden lg:block overflow-hidden">
                <p className="text-sm font-medium text-white truncate">Martin Santos</p>
                <p className="text-xs text-slate-500 truncate">Editor in Chief</p>
            </div>
        </div>
      </div>
    </div>
  );
};
