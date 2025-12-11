import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CourtSessionsAPI } from '@/lib/api';

const NewCourtSession: React.FC = () => {
  const [form, setForm] = useState({
    caseId: '',
    judgeId: '',
    scheduleDate: '',
    startTime: '',
    endTime: '',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
  const token = localStorage.getItem('token');
  await CourtSessionsAPI.create(form, token);
      toast({ title: 'Court session created' });
      navigate('/courtsessions');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: err.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>New Court Session</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="caseId" placeholder="Case ID" value={form.caseId} onChange={handleChange} required />
            <Input name="judgeId" placeholder="Judge ID" value={form.judgeId} onChange={handleChange} required />
            <Input name="scheduleDate" type="datetime-local" placeholder="Schedule Date" value={form.scheduleDate} onChange={handleChange} required />
            <Input name="startTime" type="text" inputMode="numeric" placeholder="e.g., 0900 or 09:00 (optional)" value={form.startTime} onChange={handleChange} />
            <Input name="endTime" type="text" inputMode="numeric" placeholder="e.g., 1030 or 10:30 (optional)" value={form.endTime} onChange={handleChange} />
            <Input name="location" placeholder="Location" value={form.location} onChange={handleChange} />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? 'Creating...' : 'Create Court Session'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewCourtSession;
