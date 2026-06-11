import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { useToast } from '@/hooks/use-toast';
import { useCaseReporting } from '@/hooks/useCaseReporting';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Profile } from '@/types/database.types';
import Navbar from '@/components/Navbar';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { Calendar, FileCheck, Download, FilePlus } from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

const ReportsIndex = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [profile, setProfile] = useState<Profile | null>(null);
  
  // Fetch user profile using backend API 
  useEffect(() => {
    setProfile(null);
  }, []);
  
  // Use the case reporting hook
  const { metrics, isLoading, error, generateCaseReport, exportReport } = useCaseReporting({
    userId: profile?.id,
    role: profile?.role as 'lawyer' | 'client' | 'court' | 'admin'
  });
  
  // Prepare chart data
  const caseStatusData = [
    { name: t('reports.active'), value: metrics.activeCases },
    { name: t('reports.pending'), value: metrics.pendingCases },
    { name: t('reports.closed'), value: metrics.closedCases }
  ];
  
  const caseTypeData = Object.entries(metrics.casesByType).map(([type, count]) => ({
    name: type,
    value: count
  }));
  
  const casesByMonthData = Object.entries(metrics.casesByMonth)
    .map(([month, count]) => ({
      month,
      cases: count
    }))
    .sort((a, b) => a.month.localeCompare(b.month));
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold text-primary mb-2">{t('reports.title')}</h1>
            <p className="text-gray-500">{t('reports.subtitle')}</p>
          </div>
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Button variant="outline" onClick={() => generateCaseReport()}>
              <FileCheck className="mr-2 h-4 w-4" />
              {t('reports.refresh_data')}
            </Button>
            <Button onClick={() => exportReport('pdf')}>
              <Download className="mr-2 h-4 w-4" />
              {t('reports.export_pdf')}
            </Button>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">{t('reports.loading_report_data')}</p>
          </div>
        ) : error ? (
          <Card className="mb-8">
            <CardContent className="pt-6">
              <div className="text-center text-red-500">
                <p>{error}</p>
                <Button 
                  variant="outline" 
                  onClick={() => generateCaseReport()}
                  className="mt-4"
                >
                  {t('reports.try_again')}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">{t('reports.total_cases')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.totalCases}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">{t('reports.active_cases')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{metrics.activeCases}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">{t('reports.upcoming_sessions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{metrics.upcomingSessions}</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-gray-500">{t('reports.avg_case_duration')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{metrics.avgCaseDuration.toFixed(1)} {t('reports.days')}</div>
                </CardContent>
              </Card>
            </div>
            
            <Tabs defaultValue="overview" className="mb-8">
              <TabsList>
                <TabsTrigger value="overview">{t('reports.overview')}</TabsTrigger>
                <TabsTrigger value="cases">{t('reports.cases')}</TabsTrigger>
                <TabsTrigger value="sessions">{t('reports.sessions')}</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview" className="mt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <Card className="h-[400px]">
                    <CardHeader>
                      <CardTitle>{t('reports.case_status_distribution')}</CardTitle>
                      <CardDescription>{t('reports.case_status_distribution_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={caseStatusData}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {caseStatusData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  <Card className="h-[400px]">
                    <CardHeader>
                      <CardTitle>{t('reports.cases_over_time')}</CardTitle>
                      <CardDescription>{t('reports.cases_over_time_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart
                          data={casesByMonthData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Line type="monotone" dataKey="cases" stroke="#8884d8" activeDot={{ r: 8 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                  
                  <Card className="lg:col-span-2 h-[400px]">
                    <CardHeader>
                      <CardTitle>{t('reports.cases_by_type')}</CardTitle>
                      <CardDescription>{t('reports.cases_by_type_desc')}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart
                          data={caseTypeData}
                          margin={{
                            top: 5,
                            right: 30,
                            left: 20,
                            bottom: 5,
                          }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="value" fill="#8884d8" />
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="cases">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('reports.case_performance')}</CardTitle>
                    <CardDescription>{t('reports.case_performance_desc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center py-12 text-gray-500">{t('reports.case_performance_placeholder')}</p>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="sessions">
                <Card>
                  <CardHeader>
                    <CardTitle>{t('reports.court_sessions')}</CardTitle>
                    <CardDescription>{t('reports.court_sessions_desc')}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center gap-4 py-12">
                      <Calendar className="h-12 w-12 text-gray-400" />
                      <p className="text-gray-500">{t('reports.session_statistics_placeholder')}</p>
                      {/* Scheduling reserved for court/admin; hide generic button */}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </div>
  );
};

export default ReportsIndex;
