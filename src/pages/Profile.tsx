
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
// Supabase removed; using backend API
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import { Profile as ProfileType } from "@/types/database.types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const Profile = () => {
  const [profile, setProfile] = useState<any | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [idPhotoUrl, setIdPhotoUrl] = useState<string | null>(null);
  const [idVerified, setIdVerified] = useState<boolean | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<any>({});

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // Get token from localStorage (or wherever you store it)
        const token = localStorage.getItem('token');
        if (!token) {
          navigate('/auth');
          return;
        }
        const sessionRes = await fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!sessionRes.ok) {
          navigate('/auth');
          return;
        }
        const sessionData = await sessionRes.json();
        const user = sessionData.user;
        if (!user) {
          navigate('/auth');
          return;
        }
        // Normalize user from auth/me (avoid extra fetch or 404 when proxy/backend is down)
        const normalized = {
          id: (user as any).id || (user as any)._id || null,
          ...user,
        };
        setProfile(normalized);
        // Initialize KYC state
        if ((normalized as any).id_photo_path) setIdPhotoUrl(`/${(normalized as any).id_photo_path}`.replace(/\\/g, '/'));
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
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || error.toString(),
          variant: 'destructive',
        });
      }
    };
    fetchProfile();
  }, [navigate, toast]);

  const onUploadIdPhoto = async (file: File) => {
    try {
      setUploading(true);
      const token = localStorage.getItem('token')!;
      const form = new FormData();
      form.append('photo', file);
      const res = await fetch('/api/profiles/me/id-photo', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      const url = `/${data.id_photo_path}`.replace(/\\/g, '/');
      setIdPhotoUrl(url);
      toast({ title: 'ID photo uploaded' });
    } catch (e: any) {
      toast({ title: 'Upload error', description: e.message || String(e), variant: 'destructive' });
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
    // Only allow non-sensitive fields to be updated by users
    const allowed = [
      "full_name",
      "email",
      "specialization",
    ];
    const out: any = {};
    allowed.forEach((k) => {
      const o = (orig as any)?.[k];
      const v = (d as any)?.[k];
      if (typeof v !== "undefined" && v !== o) out[k] = v;
    });
    return out;
  };

  const onSave = async () => {
    if (!profile) return;
    try {
      setSaving(true);
      const token = localStorage.getItem("token");
      const payload = diff(profile, draft);
      if (Object.keys(payload).length === 0) {
        setIsEditing(false);
        return;
      }
      const res = await fetch(`/api/users/${profile.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update profile");
      }
      const updated = await res.json();
      setProfile({ ...(profile as any), ...updated });
      setIsEditing(false);
      toast({ title: "Profile updated" });
    } catch (e: any) {
      toast({ title: "Update error", description: e.message || String(e), variant: "destructive" });
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
              <CardTitle className="text-2xl">Profile</CardTitle>
              <p className="text-muted-foreground">Manage your account settings</p>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {profile && (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold">Account Details</h3>
                    <p className="text-xs text-muted-foreground">View and update your information</p>
                  </div>
                  {!isEditing ? (
                    <Button variant="secondary" onClick={onEdit}>Edit</Button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Button onClick={onSave} disabled={saving}>{saving ? 'Saving…' : 'Save'}</Button>
                      <Button variant="outline" onClick={onCancel} disabled={saving}>Cancel</Button>
                    </div>
                  )}
                </div>

                {/* Full Name */}
                {!isEditing ? (
                  <div>
                    <h3 className="font-semibold">Full Name</h3>
                    <p>{profile.full_name}</p>
                  </div>
                ) : (
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Full Name</label>
                    <Input value={draft.full_name}
                      onChange={(e) => setDraft({ ...draft, full_name: e.target.value })}
                      placeholder="Enter full name" />
                  </div>
                )}

                {/* Email */}
                {!isEditing ? (
                  <div>
                    <h3 className="font-semibold">Email</h3>
                    <p>{profile.email}</p>
                  </div>
                ) : (
                  <div className="grid gap-1">
                    <label className="text-sm font-medium">Email</label>
                    <Input type="email" value={draft.email}
                      onChange={(e) => setDraft({ ...draft, email: e.target.value })}
                      placeholder="name@example.com" />
                  </div>
                )}

                {/* Role (read-only) */}
                <div>
                  <h3 className="font-semibold">Role</h3>
                  <p className="capitalize">{profile.role}</p>
                </div>

                {/* Role-specific fields */}
                {role === 'lawyer' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <h3 className="font-semibold">Bar Number <span className="text-xs text-muted-foreground font-normal">(locked)</span></h3>
                      <p>{(profile as any).bar_number || '—'}</p>
                    </div>
                    {!isEditing ? (
                      <div>
                        <h3 className="font-semibold">Specialization</h3>
                        <p>{(profile as any).specialization || '—'}</p>
                      </div>
                    ) : (
                      <div className="grid gap-1">
                        <label className="text-sm font-medium">Specialization</label>
                        <Input value={draft.specialization} onChange={(e) => setDraft({ ...draft, specialization: e.target.value })} placeholder="e.g., Family Law" />
                      </div>
                    )}
                  </div>
                )}

                {role === 'client' && (
                  <div className="grid gap-1">
                    <h3 className="font-semibold">ID Number <span className="text-xs text-muted-foreground font-normal">(locked)</span></h3>
                    <p>{(profile as any).id_number || '—'}</p>
                  </div>
                )}

                {role === 'court' && (
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <h3 className="font-semibold">Court Name <span className="text-xs text-muted-foreground font-normal">(locked)</span></h3>
                      <p>{(profile as any).court_name || '—'}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold">Jurisdiction <span className="text-xs text-muted-foreground font-normal">(locked)</span></h3>
                      <p>{(profile as any).jurisdiction || '—'}</p>
                    </div>
                    <div>
                      <h3 className="font-semibold">Court Type <span className="text-xs text-muted-foreground font-normal">(locked)</span></h3>
                      <p>{(profile as any).court_type || '—'}</p>
                    </div>
                  </div>
                )}

                {/* KYC */}
                <div className="pt-2 border-t">
                  <h3 className="font-semibold mb-1">KYC</h3>
                  <div className="flex items-center gap-3">
                    <div className="w-24 h-24 rounded bg-muted flex items-center justify-center overflow-hidden">
                      {idPhotoUrl ? (
                        <img src={idPhotoUrl} alt="ID" className="object-cover w-full h-full" />
                      ) : (
                        <span className="text-xs text-muted-foreground">No ID photo</span>
                      )}
                    </div>
                    <div className="flex flex-col gap-2">
                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded bg-primary text-white text-sm cursor-pointer disabled:opacity-60">
                        <Upload className="w-4 h-4" />
                        <span>{uploading ? 'Uploading…' : 'Upload ID Photo'}</span>
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
                      <p className="text-xs text-muted-foreground">
                        {idVerified ? 'ID verified' : 'ID not verified yet'}
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Profile;
