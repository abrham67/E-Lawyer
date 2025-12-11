import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import AskAIBot from '@/components/AskAIBot';
import { useUnreadMessages } from '@/hooks/useUnreadMessages';
import NotificationsBell from '@/components/NotificationsBell';

function Navbar() {
  const navigate = useNavigate();
  const { user, loading, signOut } = useAuth();
  const role = String(user?.role || '').toLowerCase();
  const unread = useUnreadMessages(15000);

  const links = useMemo(() => {
    const items: { key: string; label: string; path: string }[] = [];
    if (!user) return items;
    switch (role) {
      case 'admin':
        items.push({ key: 'dashboard', label: 'Dashboard', path: '/admin' });
        items.push(
          { key: 'cases', label: 'All Cases', path: '/cases' },
          { key: 'calendar', label: 'Court Sessions', path: '/calendar' },
          { key: 'clients', label: 'Clients', path: '/clients' },
          { key: 'documents', label: 'Documents', path: '/documents' },
        );
        break;
      case 'lawyer':
        items.push({ key: 'dashboard', label: 'Dashboard', path: '/lawyer' });
        items.push(
          { key: 'cases', label: 'Client Case', path: '/cases' },
          { key: 'create-case', label: 'Create Court Case', path: '/cases/new' },
          { key: 'my-court-cases', label: 'My Court Cases', path: '/cases?view=my-court-cases' },
          { key: 'calendar', label: 'All Court Sessions', path: '/calendar' },
          { key: 'clients', label: 'Clients', path: '/clients' },
          { key: 'messages', label: 'Messages', path: '/messages' },
        );
        break;
      case 'client':
        items.push({ key: 'dashboard', label: 'Dashboard', path: '/client' });
        items.push(
          { key: 'my-cases', label: 'My Cases', path: '/cases' },
          { key: 'my-lawyer', label: 'My Lawyer', path: '/my-lawyer' },
          { key: 'messages', label: 'Messages', path: '/messages' },
          { key: 'documents', label: 'Documents', path: '/documents' },
        );
        break;
      case 'court':
        items.push({ key: 'dashboard', label: 'Dashboard', path: '/court' });
        items.push(
          { key: 'cases', label: 'Manage Cases', path: '/cases' },
          { key: 'create-session', label: 'Create Court Session', path: '/calendar/new' },
          { key: 'calendar', label: 'All Court Sessions', path: '/calendar' },
        );
        break;
      default:
        items.push({ key: 'dashboard', label: 'Dashboard', path: '/' });
        items.push({ key: 'cases', label: 'Cases', path: '/cases' });
        items.push({ key: 'documents', label: 'Documents', path: '/documents' });
        break;
    }
    return items;
  }, [role, user]);

  const gotoDashboard = () => {
    if (!user || !user.role) return navigate('/');
    const r = String(user.role).toLowerCase();
    const routes: Record<string, string> = {
      admin: '/admin',
      lawyer: '/lawyer',
      client: '/client',
      court: '/court',
      judge: '/judge',
    };
    navigate(routes[r] || '/');
  };

  const doLogout = async () => {
    try {
      await signOut();
    } catch {}
  };


  return (
    <nav className="bg-[#16345b] w-full sticky top-0 z-50 shadow-md">
      {/* Top row: Brand left, actions right */}
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <button
          aria-label="Go to dashboard"
          className="text-white font-heading text-2xl font-bold tracking-tight"
          onClick={gotoDashboard}
        >
          E-Lawyer
        </button>

        <div className="flex items-center gap-2">
          <NotificationsBell />
          <Button
            aria-label="Open profile"
            variant="secondary"
            className="bg-[#2a4872] hover:bg-[#385885] text-white"
            onClick={() => navigate('/profile')}
          >
            Profile
          </Button>
          {user && (
            <Button
              aria-label="Logout"
              variant="ghost"
              className="text-white hover:bg-white/10"
              onClick={doLogout}
            >
              Logout
            </Button>
          )}
        </div>
      </div>

      {/* Second row: Neatly stacked navigation links */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-2 md:px-4 py-2">
          <div className="flex flex-wrap items-center gap-2 justify-start md:justify-center">
            {!loading && links.map((l) => (
              <Button
                key={l.key}
                size="sm"
                variant="ghost"
                className="text-white/90 hover:text-white hover:bg-white/10"
                onClick={() => navigate(l.path)}
              >
                {l.label}
                {/* Unread badge only on Messages link for lawyer/client */}
                {((role === 'lawyer' || role === 'client') && l.key === 'messages' && unread > 0) && (
                  <span className="ml-2 inline-flex items-center justify-center rounded-full bg-red-600 text-white text-[10px] leading-none px-1.5 py-0.5 min-w-[16px]">
                    {unread > 99 ? '99+' : unread}
                  </span>
                )}
              </Button>
            ))}
            {/* Duplicate profile/logout in link row for mobile density is unnecessary after top row; keep it simple/formal */}
          </div>
        </div>
      </div>

      {/* Global floating Ask AI icon (fixed position) */}
      <AskAIBot />
    </nav>
  );
}

export default Navbar;
