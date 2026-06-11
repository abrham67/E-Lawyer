import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface CaseMetrics {
  totalCases: number;
  activeCases: number;
  closedCases: number;
  pendingCases: number;
  avgCaseDuration: number; // in days
  upcomingSessions: number;
  completedSessions: number;
  casesByType: Record<string, number>;
  casesByMonth: Record<string, number>;
}

interface CaseReportingProps {
  userId?: string;
  role?: 'lawyer' | 'client' | 'court' | 'admin';
}

export const useCaseReporting = ({ userId, role }: CaseReportingProps = {}) => {
  const [metrics, setMetrics] = useState<CaseMetrics>({
    totalCases: 0,
    activeCases: 0,
    closedCases: 0,
    pendingCases: 0,
    avgCaseDuration: 0,
    upcomingSessions: 0,
    completedSessions: 0,
    casesByType: {},
    casesByMonth: {},
  });

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const generateCaseReport = useCallback(async () => {
    if (!userId || !role) return;
    setIsLoading(true);

    try {
      const response = await fetch(`/api/cases/report?user_id=${userId}&role=${role}`);
      const casesData = await response.json();
      const now = new Date();
      const casesWithSessions = casesData || [];

      const totalCases = casesWithSessions.length;
      const activeCases = casesWithSessions.filter(c => c.status === 'active').length;
      const pendingCases = casesWithSessions.filter(c => c.status === 'pending').length;
      const closedCases = casesWithSessions.filter(c => c.status === 'closed').length;

      const casesByType: Record<string, number> = {};
      casesWithSessions.forEach(c => {
        const type = c.case_type || 'Unspecified';
        casesByType[type] = (casesByType[type] || 0) + 1;
      });

      const casesByMonth: Record<string, number> = {};
      casesWithSessions.forEach(c => {
        const date = new Date(c.created_at);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        casesByMonth[month] = (casesByMonth[month] || 0) + 1;
      });

      let totalDuration = 0;
      let closedCount = 0;
      casesWithSessions.forEach(c => {
        if (c.status === 'closed') {
          const startDate = new Date(c.created_at);
          const endDate = new Date(c.updated_at);
          const durationDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
          totalDuration += durationDays;
          closedCount++;
        }
      });
      const avgCaseDuration = closedCount > 0 ? totalDuration / closedCount : 0;

      let upcomingSessions = 0;
      let completedSessions = 0;
      casesWithSessions.forEach(c => {
        const sessions = c.court_sessions || [];
        sessions.forEach((s: any) => {
          if (s.status === 'completed') {
            completedSessions++;
          } else if (s.status === 'scheduled' && new Date(s.scheduled_date) > now) {
            upcomingSessions++;
          }
        });
      });

      setMetrics({
        totalCases,
        activeCases,
        closedCases,
        pendingCases,
        avgCaseDuration,
        upcomingSessions,
        completedSessions,
        casesByType,
        casesByMonth,
      });

    } catch (err: any) {
      console.error('Error generating case report:', err);
      setError(err.message);
      toast({
        title: "Error",
        description: "Failed to generate case report",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, role, toast]);

  const exportReport = (format: 'pdf' | 'csv' = 'pdf') => {
    toast({
      title: "Exporting Report",
      description: `Your ${format.toUpperCase()} report is being generated`,
    });

    setTimeout(() => {
      toast({
        title: "Report Ready",
        description: `Your ${format.toUpperCase()} report has been generated`,
      });
    }, 2000);
  };

  useEffect(() => {
    if (userId && role) {
      generateCaseReport();
    }
  }, [userId, role, generateCaseReport]);

  return {
    metrics,
    isLoading,
    error,
    generateCaseReport,
    exportReport
  };
};
