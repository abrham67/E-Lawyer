import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const ChangePassword = () => {
  const { toast } = useToast();
  const [form, setForm] = useState({ current: "", new: "", confirm: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.current || !form.new || !form.confirm) {
      toast({ title: "Missing Fields", description: "Fill all fields.", variant: "destructive" });
      return;
    }
    if (form.new !== form.confirm) {
      toast({ title: "Password Mismatch", description: "New passwords do not match.", variant: "destructive" });
      return;
    }
    if (form.new.length < 6) {
      toast({ title: "Password Too Short", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setLoading(true);
    const response = await fetch("/api/auth/change-password", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ current: form.current, new: form.new })
    });
    setLoading(false);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast({ title: "Change Failed", description: data?.message || "Could not change password.", variant: "destructive" });
      return;
    }
    toast({ title: "Password Changed", description: "Your password was updated.", duration: 4000 });
    setForm({ current: "", new: "", confirm: "" });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md mx-auto p-6 bg-card rounded-lg shadow">
      <Input type="password" placeholder="Current Password" value={form.current} onChange={e => setForm({ ...form, current: e.target.value })} required />
      <Input type="password" placeholder="New Password" value={form.new} onChange={e => setForm({ ...form, new: e.target.value })} required />
      <Input type="password" placeholder="Confirm New Password" value={form.confirm} onChange={e => setForm({ ...form, confirm: e.target.value })} required />
      <Button type="submit" disabled={loading}>{loading ? "Changing..." : "Change Password"}</Button>
    </form>
  );
};
export default ChangePassword;
