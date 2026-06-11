import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { CourtSessionsAPI } from '@/lib/api';
import { useTranslation } from 'react-i18next';

const NewCourtSession: React.FC = () => {
  const [form, setForm] = useState({
    caseId: '',
    judgeId: '',
    scheduleDate: '',
    startTime: '',
    startPeriod: 'AM',
    endTime: '',
    endPeriod: 'AM',
    location: ''
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
  const token = localStorage.getItem('token');
  await CourtSessionsAPI.create(form, token);
      toast({ title: t('new_court_session.created') });
      navigate('/courtsessions');
    } catch (err: any) {
      toast({
        variant: 'destructive',
        title: t('new_court_session.error'),
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
          <CardTitle>{t('new_court_session.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input name="caseId" placeholder={t('new_court_session.case_id')} value={form.caseId} onChange={handleChange} required />
            <Input name="judgeId" placeholder={t('new_court_session.judge_id')} value={form.judgeId} onChange={handleChange} required />
            <Input name="scheduleDate" type="datetime-local" placeholder={t('new_court_session.schedule_date')} value={form.scheduleDate} onChange={handleChange} required />
            <div className="flex gap-2">
              <Input name="startTime" type="text" inputMode="numeric" placeholder={t('new_court_session.start_time')} value={form.startTime} onChange={handleChange} />
              <select name="startPeriod" value={form.startPeriod} onChange={handleChange} className="px-3 py-2 rounded border bg-white dark:bg-slate-800">
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
            <div className="flex gap-2">
              <Input name="endTime" type="text" inputMode="numeric" placeholder={t('new_court_session.end_time')} value={form.endTime} onChange={handleChange} />
              <select name="endPeriod" value={form.endPeriod} onChange={handleChange} className="px-3 py-2 rounded border bg-white dark:bg-slate-800">
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
            <Input name="location" placeholder={t('new_court_session.location')} value={form.location} onChange={handleChange} />
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t('new_court_session.creating') : t('new_court_session.create')}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default NewCourtSession;
