import React, { useEffect, useMemo, useState } from "react";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';

const AdminDashboard = () => {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [schedules, setSchedules] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingUserId, setSavingUserId] = useState<string>("");
  const [sectionErrors, setSectionErrors] = useState({
    users: "",
    schedules: "",
    reports: "",
    profile: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    setSectionErrors({ users: "", schedules: "", reports: "", profile: "" });
    const headers = { Authorization: `Bearer ${token}` };

    const loadUsers = fetch("/api/users", { headers })
      .then((res) => res.json())
      .then((data) => setUsers(Array.isArray(data) ? data : (data?.users || [])))
      .catch(() => {
        setSectionErrors((prev) => ({ ...prev, users: t('admin_dashboard.failed_load_users') }));
        setError((prev) => prev || t('admin_dashboard.failed_load_users'));
      });

    const loadSchedules = fetch("/api/courtsessions", { headers })
      .then((res) => res.json())
      .then((data) => setSchedules(Array.isArray(data) ? data : (data?.sessions || [])))
      .catch(() => {
        setSectionErrors((prev) => ({ ...prev, schedules: t('admin_dashboard.failed_load_schedules') }));
        setError((prev) => prev || t('admin_dashboard.failed_load_schedules'));
      });

    const loadReports = Promise.allSettled([
      fetch("/api/cases/report/users", { headers }).then((res) => res.json()),
      fetch("/api/cases/report/cases", { headers }).then((res) => res.json()),
      fetch("/api/cases/report/sessions", { headers }).then((res) => res.json()),
    ])
      .then((results) => {
        const items = results.flatMap((r: any) => {
          if (r.status !== 'fulfilled') return [];
          const value = r.value;
          if (Array.isArray(value)) return value;
          if (value?.users) return value.users;
          if (value?.cases) return value.cases;
          if (value?.sessions) return value.sessions;
          return [];
        });
        setReports(items);
      })
      .catch(() => {
        setSectionErrors((prev) => ({ ...prev, reports: t('admin_dashboard.failed_load_reports') }));
        setError((prev) => prev || t('admin_dashboard.failed_load_reports'));
      });

    const loadProfile = fetch("/api/auth/me", { headers })
      .then((res) => res.json())
      .then((data) => setProfile(data?.user || null))
      .catch(() => {
        setSectionErrors((prev) => ({ ...prev, profile: t('admin_dashboard.failed_load_profile') }));
        setError((prev) => prev || t('admin_dashboard.failed_load_profile'));
      });

    Promise.all([loadUsers, loadSchedules, loadReports, loadProfile])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [t]);

  const stats = useMemo(() => ([
    { label: t('admin_dashboard.users'), value: users.length },
    { label: t('admin_dashboard.schedules'), value: schedules.length },
    { label: t('admin_dashboard.reports'), value: reports.length },
  ]), [users.length, schedules.length, reports.length, t]);

  const getRoleBadge = (role: string) => {
    const value = String(role || '').toLowerCase();
    if (value === 'admin') return <Badge variant="default">{t('admin_dashboard.admin')}</Badge>;
    if (value === 'lawyer') return <Badge variant="secondary">{t('admin_dashboard.lawyer')}</Badge>;
    if (value === 'court') return <Badge variant="outline">Court</Badge>;
    return <Badge variant="outline">{t('admin_dashboard.client')}</Badge>;
  };

  const updateUserRole = async (userId: string, role: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !userId) return;
      setSavingUserId(userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role })
      });
      if (!response.ok) throw new Error('Failed to update role');
      const updated = await response.json();
      setUsers((prev) => prev.map((u) => String(u.id || u._id) === String(userId) ? { ...u, ...updated } : u));
    } catch {
      setError(t('admin_dashboard.failed_load_users'));
    } finally {
      setSavingUserId("");
    }
  };

  const verifyUser = async (userId: string, verified: boolean) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !userId) return;
      setSavingUserId(userId);
      const response = await fetch(`/api/admin/users/${userId}/verify`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ verified }),
      });
      if (!response.ok) throw new Error('Failed to update verification');
      const payload = await response.json();
      const updated = payload?.user || payload;
      setUsers((prev) => prev.map((u) => String(u.id || u._id) === String(userId) ? { ...u, ...updated } : u));
    } catch {
      setError(t('admin_dashboard.failed_load_users'));
    } finally {
      setSavingUserId("");
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token || !userId) return;
      if (!window.confirm(t('admin_dashboard.confirm_delete_user') || 'Delete this user?')) return;
      setSavingUserId(userId);
      const response = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete user');
      setUsers((prev) => prev.filter((u) => String(u.id || u._id) !== String(userId)));
    } catch {
      setError(t('admin_dashboard.failed_delete_user') || 'Failed to delete user');
    } finally {
      setSavingUserId("");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-dashboard-section" className="container mx-auto px-4 py-6 space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-primary">{t('admin_dashboard.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('admin_dashboard.welcome')}</p>
        </div>

        {error && (
          <div className="rounded-md border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((item) => (
            <Card key={item.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{item.label}</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? <Skeleton className="h-8 w-16" /> : <p className="text-3xl font-bold">{item.value}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <Card className="xl:col-span-1">
            <CardHeader>
              <CardTitle>{t('admin_dashboard.profile')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {loading ? (
                <>
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-4 w-3/4" />
                </>
              ) : profile ? (
                <>
                  <div className="text-sm"><span className="font-medium">{t('admin_dashboard.name')}:</span> {profile.full_name || profile.fullName || '—'}</div>
                  <div className="text-sm"><span className="font-medium">{t('admin_dashboard.email')}:</span> {profile.email || '—'}</div>
                  <div className="text-sm"><span className="font-medium">{t('admin_dashboard.role')}:</span> {getRoleBadge(profile.role)}</div>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{sectionErrors.profile || t('admin_dashboard.failed_load_profile')}</p>
              )}
            </CardContent>
          </Card>

          <Card className="xl:col-span-2">
            <CardHeader>
              <CardTitle>{t('admin_dashboard.user_management')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left">
                      <th className="py-2 pr-3">{t('admin_dashboard.name')}</th>
                      <th className="py-2 pr-3">{t('admin_dashboard.email')}</th>
                      <th className="py-2 pr-3">{t('admin_dashboard.role')}</th>
                      <th className="py-2 pr-3">{t('admin_dashboard.change_role')}</th>
                      <th className="py-2 pr-3">Verification</th>
                      <th className="py-2">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr><td colSpan={6} className="py-4 text-muted-foreground">{t('admin_dashboard.loading_profile')}...</td></tr>
                    ) : users.length === 0 ? (
                      <tr><td colSpan={6} className="py-4 text-muted-foreground">{sectionErrors.users || t('admin_dashboard.no_users_found')}</td></tr>
                    ) : (
                      users.map((u) => {
                        const id = String(u.id || u._id || '');
                        return (
                          <tr key={id} className="border-b last:border-0">
                            <td className="py-2 pr-3">{u.full_name || u.name || '—'}</td>
                            <td className="py-2 pr-3">{u.email || '—'}</td>
                            <td className="py-2 pr-3">{getRoleBadge(u.role)}</td>
                            <td className="py-2">
                              <select
                                value={String(u.role || '').toLowerCase()}
                                onChange={(e) => updateUserRole(id, e.target.value)}
                                disabled={savingUserId === id}
                                className="h-9 rounded-md border px-2 bg-background"
                              >
                                <option value="admin">{t('admin_dashboard.admin')}</option>
                                <option value="lawyer">{t('admin_dashboard.lawyer')}</option>
                                <option value="client">{t('admin_dashboard.client')}</option>
                                <option value="court">Court</option>
                              </select>
                            </td>
                            <td className="py-2 pr-3">
                              {['lawyer', 'court'].includes(String(u.role || '').toLowerCase()) ? (
                                <div className="flex items-center gap-2">
                                  <Badge variant={u.id_verified ? 'default' : 'secondary'}>
                                    {u.id_verified ? 'Verified' : 'Pending'}
                                  </Badge>
                                  {!u.id_verified && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={savingUserId === id}
                                      onClick={() => verifyUser(id, true)}
                                    >
                                      Verify
                                    </Button>
                                  )}
                                  {u.id_verified && (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      disabled={savingUserId === id}
                                      onClick={() => verifyUser(id, false)}
                                    >
                                      Unverify
                                    </Button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </td>
                            <td className="py-2">
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={savingUserId === id || String(profile?.id || profile?._id || '') === id}
                                onClick={() => deleteUser(id)}
                              >
                                Delete
                              </Button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t('admin_dashboard.court_schedules')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : schedules.length === 0 ? (
                <p className="text-sm text-muted-foreground">{sectionErrors.schedules || t('admin_dashboard.no_schedules_found')}</p>
              ) : (
                <ul className="space-y-2">
                  {schedules.slice(0, 8).map((s) => (
                    <li key={s.id || s._id} className="rounded border p-2 text-sm flex items-center justify-between gap-2">
                      <span className="font-medium">{s.title || s.topic || 'Session'}</span>
                      <span className="text-muted-foreground">{s.date || s.scheduled_date || ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('admin_dashboard.reports_title')}</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              ) : reports.length === 0 ? (
                <p className="text-sm text-muted-foreground">{sectionErrors.reports || t('admin_dashboard.no_reports_found')}</p>
              ) : (
                <ul className="space-y-2">
                  {reports.slice(0, 8).map((r) => (
                    <li key={r.id || r._id} className="rounded border p-2 text-sm flex items-center justify-between gap-2">
                      <span className="font-medium">{r.title || r.subject || r.email || 'Report'}</span>
                      <span className="text-muted-foreground">{r.summary || r.status || r.role || ''}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('admin_dashboard.system_backup_restore')}</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-3 flex-wrap">
            <Button onClick={() => alert(t('admin_dashboard.backup_coming_soon'))}>{t('admin_dashboard.backup_system')}</Button>
            <Button variant="secondary" onClick={() => alert(t('admin_dashboard.restore_coming_soon'))}>{t('admin_dashboard.restore_system')}</Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminDashboard;
