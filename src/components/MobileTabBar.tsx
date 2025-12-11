import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

type Tab = { key: string; label: string; path: string };

const MobileTabBar: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const role = String(user?.role || '').toLowerCase();

  const tabs: Tab[] = React.useMemo(() => {
    const base: Tab[] = [
      { key: 'home', label: 'Home', path: role ? `/${role}` : '/' },
      { key: 'cases', label: 'Cases', path: '/cases' },
      { key: 'calendar', label: 'Calendar', path: '/calendar' },
      { key: 'messages', label: 'Messages', path: '/messages' },
      { key: 'profile', label: 'Profile', path: '/profile' },
    ];
    return base;
  }, [role]);

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <ul className="grid grid-cols-5">
        {tabs.map((t) => {
          const active = pathname === t.path || (t.key === 'home' && pathname === '/');
          return (
            <li key={t.key}>
              <button
                className={`w-full py-2 text-xs ${active ? 'text-blue-600 font-semibold' : 'text-gray-600'}`}
                onClick={() => navigate(t.path)}
              >
                {t.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileTabBar;
