import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from 'react-i18next';

const ChangePassword = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  const [form, setForm] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current || !form.new || !form.confirm) {
      toast({ title: t('change_password.missing_fields'), description: t('change_password.fill_all_fields'), variant: "destructive" });
      return;
    }
    if (form.new !== form.confirm) {
      toast({ title: t('change_password.password_mismatch'), description: t('change_password.passwords_do_not_match'), variant: "destructive" });
      return;
    }
    if (form.new.length < 6) {
      toast({ title: t('change_password.too_short'), description: t('change_password.min_length'), variant: "destructive" });
      return;
    }
    setLoading(true);
    const token = localStorage.getItem('token');
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ current: form.current, new: form.new })
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast({ title: t('change_password.change_failed'), description: data?.message || t('change_password.could_not_change'), variant: "destructive" });
      return;
    }
    toast({ title: t('change_password.changed'), description: t('change_password.updated'), duration: 4000 });
    setForm({ current: "", new: "", confirm: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-card rounded-lg shadow">
      <Input type="password" placeholder={t('change_password.current_password')} value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} required />
      <Input type="password" placeholder={t('change_password.new_password')} value={form.new} onChange={e => setForm({ ...form, new: e.target.value })} required />
      <Input type="password" placeholder={t('change_password.confirm_new_password')} value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
      <Button type="submit" disabled={loading}>{loading ? t('change_password.changing') : t('change_password.change_password')}</Button>
    </form>
  );
};
export default ChangePassword;
