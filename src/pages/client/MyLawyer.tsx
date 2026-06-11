import React, { useCallback, useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CasesAPI, apiGet, LawyersBatchAPI } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

const MyLawyer: React.FC = () => {
  const { user } = useAuth();
  const [cases, setCases] = useState<any[]>([]);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  // Normalize any id-like shape to string or null
  const idToString = (val: any): string | null => {
    if (!val) return null;
    if (typeof val === 'string') return val;
    if (typeof val === 'object') {
      if ((val as any)._id) return String((val as any)._id);
      if ((val as any).id) return String((val as any).id);
      try {
        const s = (val as any).toString?.();
        return s && s !== '[object Object]' ? s : null;
      } catch {
        return null;
      }
    }
    try { return String(val); } catch { return null; }
  };

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('token');
      // Fetch cases first
      const c = await CasesAPI.list(token);
      const caseList = (c as any).cases || c || [];
      setCases(caseList);
      // Try server-normalized connected lawyers; fallback to client-side derivation + batch API
      let profiles: any[] = [];
      try {
        const connected = await apiGet('/api/cases/me/lawyers', token);
        if (!Array.isArray(connected)) throw new Error('Invalid response');
        profiles = connected;
      } catch {
        // Fallback: derive lawyer IDs from cases and fetch via batch (IDs normalized & validated)
        const is24Hex = (s: string | null | undefined) => !!s && /^[0-9a-fA-F]{24}$/.test(s);
        const ids = Array.from(new Set(
          (caseList as any[])
            .map((x: any) => idToString(x.lawyer_id) || idToString(x.lawyerId) || (x.lawyer ? idToString(x.lawyer._id || x.lawyer.id) : null))
            .filter((v: any) => is24Hex(v))
        ));
        profiles = ids.length > 0 ? await LawyersBatchAPI.batchGet(ids as string[], token || undefined) : [];
      }
      setLawyers(profiles || []);
    } catch (err: any) {
      setError(err.message || t('client_my_lawyer.failed_load'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">{t('client_my_lawyer.title')}</h1>
        <Card>
          <CardHeader>
            <CardTitle>{t('client_my_lawyer.connected_lawyers')}</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div>{t('client_my_lawyer.loading')}</div>
            ) : error ? (
              <div className="text-red-600">{error}</div>
            ) : lawyers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lawyers.map((l: any) => (
                  <div key={l._id || l.id} className="border rounded p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{l.full_name || l.name}</h3>
                        <div className="text-sm text-gray-500">{l.email}</div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => window.location.href = `/lawyers/${l._id || l.id}`}>{t('client_my_lawyer.view_profile')}</Button>
                          <Button size="sm" variant="destructive" onClick={async () => {
                            // find the case for this lawyer
                            const token = localStorage.getItem('token');
                            try {
                              const lawyerId = idToString(l._id || l.id);
                              const myCases = cases.filter(c => {
                                const cid = idToString(c.lawyer_id) || idToString(c.lawyerId) || (c.lawyer ? idToString(c.lawyer._id || c.lawyer.id) : null);
                                return cid && lawyerId && cid === lawyerId;
                              });
                              if (myCases.length === 0) {
                                setError(t('client_my_lawyer.no_connection'));
                                return;
                              }
                              const caseToDelete = myCases[0];
                              await CasesAPI.disconnect((caseToDelete._id || caseToDelete.id) as string, token);
                              await refresh();
                            } catch (err: any) {
                              setError(err.message || t('client_my_lawyer.failed_disconnect'));
                            }
                          }}>{t('client_my_lawyer.disconnect')}</Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-gray-500">{t('client_my_lawyer.no_connected_lawyers')}</div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MyLawyer;
