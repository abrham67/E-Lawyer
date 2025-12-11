import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Navbar from '@/components/Navbar';
import Chat from '@/components/Chat';
import { useAuth } from '@/hooks/useAuth';

const MessageThread: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [recipient, setRecipient] = useState<any>(null);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/users/${id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } })
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(setRecipient)
      .catch(() => navigate('/'));
  }, [id, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-xl font-semibold mb-4">Messages</h1>
        {user && recipient ? (
          <Chat user={user} recipient={recipient} />
        ) : (
          <div className="text-sm text-muted-foreground">Loading…</div>
        )}
      </main>
    </div>
  );
};

export default MessageThread;
