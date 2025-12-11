import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const ActionButton: React.FC<{ label: string; to: string; color?: string }> = ({ label, to, color }) => {
  const navigate = useNavigate();
  const c = color || 'bg-blue-600 hover:bg-blue-700';
  return (
    <button
      onClick={() => navigate(to)}
      className={`${c} text-white rounded-xl px-4 py-3 text-sm font-semibold shadow active:scale-[.98] transition`}
    >
      {label}
    </button>
  );
};

const MobileQuickActions: React.FC = () => {
  const { user } = useAuth();
  const role = String(user?.role || '').toLowerCase();

  if (!user) return null;

  return (
    <div className="md:hidden grid grid-cols-2 gap-3">
      {role === 'lawyer' && (
        <>
          <ActionButton label="New Case" to="/cases/new" />
          <ActionButton label="My Court" to="/calendar" color="bg-purple-600 hover:bg-purple-700" />
          <ActionButton label="Clients" to="/clients" color="bg-emerald-600 hover:bg-emerald-700" />
          <ActionButton label="Docs" to="/documents" color="bg-cyan-600 hover:bg-cyan-700" />
        </>
      )}
      {role === 'client' && (
        <>
          <ActionButton label="My Cases" to="/cases" />
          <ActionButton label="My Lawyer" to="/my-lawyer" color="bg-emerald-600 hover:bg-emerald-700" />
          <ActionButton label="Messages" to="/messages" color="bg-orange-600 hover:bg-orange-700" />
          <ActionButton label="Documents" to="/documents" color="bg-cyan-600 hover:bg-cyan-700" />
        </>
      )}
      {role === 'court' && (
        <>
          <ActionButton label="Create Session" to="/calendar/new" />
          <ActionButton label="All Sessions" to="/calendar" color="bg-purple-600 hover:bg-purple-700" />
          <ActionButton label="Manage Cases" to="/cases" color="bg-emerald-600 hover:bg-emerald-700" />
          <ActionButton label="Admin" to="/admin" color="bg-gray-800 hover:bg-gray-900" />
        </>
      )}
      {role === 'admin' && (
        <>
          <ActionButton label="Users" to="/admin" />
          <ActionButton label="Reports" to="/reports" color="bg-purple-600 hover:bg-purple-700" />
          <ActionButton label="Sessions" to="/calendar" color="bg-emerald-600 hover:bg-emerald-700" />
          <ActionButton label="Cases" to="/cases" color="bg-cyan-600 hover:bg-cyan-700" />
        </>
      )}
    </div>
  );
};

export default MobileQuickActions;
