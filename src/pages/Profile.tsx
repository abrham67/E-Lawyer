import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useApiClient } from "@/hooks/useApiClient";
import { useMeQuery } from "@/hooks/queries/useUsers";
import Navbar from "@/components/Navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from 'react-i18next';

const Profile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { authedFetch } = useApiClient();
  const { t } = useTranslation();

  const meQuery = useMeQuery(true);
  const loadingProfile = meQuery.isLoading || meQuery.isFetching;
  const queryError = meQuery.error as Error | null;

  const [profile, setProfile] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
  const [idVerified, setIdVerified] = useState<boolean | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<any>({});

  useEffect(() => {
    if (!meQuery.data) return;

    const normalized = {
      id: (meQuery.data as any).id || (meQuery.data as any)._id || null,
      ...meQuery.data,
    };

    setProfile(normalized);
    if ((normalized as any).id_photo_path) {
      setIdPhotoUrl(`/${(normalized as any).id_photo_path}`.replace(/\\/g, "/"));
    }
    setIdVerified(!!(normalized as any).id_verified);

    setDraft({
      full_name: (normalized as any).full_name || "",
      email: (normalized as any).email || "",
      role: (normalized as any).role,
      bar_number: (normalized as any).bar_number || "",
      specialization: (normalized as any).specialization || "",
      id_number: (normalized as any).id_number || "",
      court_name: (normalized as any).court_name || "",
      jurisdiction: (normalized as any).jurisdiction || "",
      court_type: (normalized as any).court_type || "",
    });
  }, [meQuery.data]);

  useEffect(() => {
    if (!loadingProfile && !profile && !meQuery.data) {
      navigate("/auth");
    }
  }, [loadingProfile, profile, meQuery.data, navigate]);

  const onUploadIdPhoto = async (file: File) => {
    try {
      setUploading(true);
      const form = new FormData();
      form.append("photo", file);

      const data = await authedFetch("/api/profiles/me/id-photo", {
        method: "POST",
        body: form,
      });
      if (!data) throw new Error("Upload failed");

      const url = `/${data.id_photo_path}`.replace(/\\/g, "/");
      setIdPhotoUrl(url);
      toast({ title: t('profile_page.id_photo_uploaded') });
    } catch (e: any) {
      toast({ title: t('profile_page.upload_error'), description: e.message || String(e), variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const role = useMemo(() => (profile?.role ? String(profile.role).toLowerCase() : null), [profile]);

  const onEdit = () => {
    if (!profile) return;
    setDraft({
      full_name: profile.full_name || "",
      email: profile.email || "",
      role: profile.role,
      bar_number: (profile as any).bar_number || "",
      specialization: (profile as any).specialization || "",
      id_number: (profile as any).id_number || "",
      court_name: (profile as any).court_name || "",
      jurisdiction: (profile as any).jurisdiction || "",
      court_type: (profile as any).court_type || "",
    });
    setIsEditing(true);
  };

  const onCancel = () => {
    setIsEditing(false);
  };

  const diff = (orig: any, d: any) => {
    const allowed = ["full_name", "email", "specialization"];
    const out: any = {};
    allowed.forEach((k) => {
      const o = orig?.[k];
      const v = d?.[k];
      if (typeof v !== "undefined" && v !== o) out[k] = v;
    });
    return out;
  };

  const onSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      const payload = diff(profile, draft);
      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }

      const updated = await authedFetch(`/api/users/${profile.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setProfile({ ...(profile as any), ...updated });
      setIsEditing(false);
      toast({ title: t('profile_page.profile_updated') });
    } catch (e: any) {
      toast({ title: t('profile_page.update_error'), description: e.message || String(e), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main id="main-dashboard-section" className="container mx-auto px-4 py-8">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="flex flex-row items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="h-8 w-8 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">{t('profile_page.title')}</CardTitle>
              <p className="text-muted-foreground">{t('profile_page.subtitle')}</p>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {loadingProfile ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : queryError ? (
              <div className="text-sm text-red-600">{queryError.message}</div>
            ) : profile ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">{t('profile_page.account_details')}</h3>
                    <p className="text-xs text-muted-foreground">{t('profile_page.view_update_info')}</p>
                  </div>
                  {!isEditing ? (
                    <Button variant="secondary" onClick={onEdit}>{t('profile_page.edit')}</Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button onClick={onSave} disabled={saving}>{saving ? t('profile_page.saving') : t('profile_page.save')}</Button>
                      <Button variant="outline" onClick={onCancel} disabled={saving}>{t('profile_page.cancel')}</Button>
                    </div>
                  )}
                </div>

                {!isEditing ? (
                  <>
                    <div>
                      <h3 className="font-semibold">{t('profile_page.full_name')}</h3>
                      <p>{profile.full_name}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('profile_page.email')}</h3>
                      <p>{profile.email}</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="grid gap-1">
                      <label className="text-sm font-medium">{t('profile_page.full_name')}</label>
                      <Input value={draft.full_name} onChange={(e) => setDraft({ ...draft, full_name: e.target.value })} />
                    </div>
                    <div className="grid gap-1">
                      <label className="text-sm font-medium">{t('profile_page.email')}</label>
                      <Input type="email" value={draft.email} onChange={(e) => setDraft({ ...draft, email: e.target.value })} />
                    </div>
                  </>
                )}

                <div>
                  <h3 className="font-semibold">{t('profile_page.role')}</h3>
                  <p className="capitalize">{profile.role}</p>
                </div>

                {role === "lawyer" && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold">{t('profile_page.bar_number')}</h3>
                      <p>{(profile as any).bar_number || "—"}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold">{t('profile_page.specialization')}</h3>
                      <p>{(profile as any).specialization || "—"}</p>
                    </div>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <h3 className="font-semibold mb-1">{t('profile_page.kyc')}</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-24 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {idPhotoUrl ? (
                        <img src={idPhotoUrl} alt="ID" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-xs text-muted-foreground">{t('profile_page.no_id_photo')}</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded bg-primary text-white text-sm cursor-pointer disabled:opacity-60">
                        <Upload className="w-4 h-4" />
                        <span>{uploading ? t('profile_page.uploading') : t('profile_page.upload_id_photo')}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) onUploadIdPhoto(f);
                          }}
                        />
                      </label>
                      <p className="text-xs text-muted-foreground">{idVerified ? t('profile_page.id_verified') : t('profile_page.id_not_verified')}</p>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="text-sm text-muted-foreground">{t('profile_page.no_profile_data')}</div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
