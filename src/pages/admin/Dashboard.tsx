import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [reports, setReports] = useState([]);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    // Fetch users
    fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setUsers(data.users || []))
      .catch(() => setError("Failed to load users."));
    // Fetch court schedules
    fetch("/api/courtsessions", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setSchedules(data.sessions || []))
      .catch(() => setError("Failed to load court schedules."));
    // Fetch reports
    fetch("/api/reports", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setReports(data.reports || []))
      .catch(() => setError("Failed to load reports."));
    // Fetch profile
    fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setProfile(data.user || null))
      .catch(() => setError("Failed to load profile."));
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
  <main id="main-dashboard-section" className="container mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-primary">Admin Dashboard</h1>
  {/* Single-column, one section per row */}
  <div className="flex flex-col gap-4">
          {/* Profile Quick View */}
          <section className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
            <div className="flex items-center gap-2 mb-2">
              <svg className="w-7 h-7 text-blue-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h.01M16 12h.01M12 16h.01" /></svg>
              <h2 className="text-base sm:text-lg md:text-xl font-semibold">Profile</h2>
            </div>
            {profile ? (
              <div className="grid grid-cols-1 gap-2 text-gray-700">
                <div><span className="font-semibold">Name:</span> {profile.full_name || profile.fullName}</div>
                <div><span className="font-semibold">Email:</span> {profile.email}</div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-gray-400 animate-pulse"><svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /><path d="M8 12h.01M16 12h.01M12 16h.01" /></svg> Loading profile...</div>
            )}
          </section>
          {/* User Management & Role Management */}
          <section className="bg-gradient-to-br from-green-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-green-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4 1 1.1-3.3A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">User Management</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left rounded-lg overflow-hidden">
              <thead className="bg-green-100">
                <tr>
                  <th className="py-2 px-3 font-semibold">Name</th>
                  <th className="py-2 px-3 font-semibold">Email</th>
                  <th className="py-2 px-3 font-semibold">Role</th>
                  <th className="py-2 px-3 font-semibold">Change Role</th>
                </tr>
              </thead>
              <tbody>
                {users.length > 0 ? (
                  users.map((u) => (
                    <tr key={u.id || u._id} className="border-b last:border-b-0 hover:bg-green-50 transition">
                      <td className="py-2 px-3 font-medium text-green-900">{u.full_name || u.name}</td>
                      <td className="py-2 px-3">{u.email}</td>
                      <td className="py-2 px-3">{u.role}</td>
                      <td className="py-2 px-3">
                        <select
                          value={u.role}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            const token = localStorage.getItem("token");
                            await fetch(`/api/users/${u.id || u._id}/role`, {
                              method: "PATCH",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ role: newRole })
                            });
                            setUsers(users => users.map(user => (user.id || user._id) === (u.id || u._id) ? { ...user, role: newRole } : user));
                          }}
                          className="border rounded px-2 py-1 bg-white focus:border-green-400 hover:bg-green-50 transition"
                        >
                          <option value="admin">Admin</option>
                          <option value="lawyer">Lawyer</option>
                          <option value="client">Client</option>
                        </select>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr><td colSpan={4} className="text-center text-gray-400 py-4">No users found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          </section>
          {/* System Usage Statistics */}
          <section className="bg-gradient-to-br from-purple-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-purple-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M16 3v4M8 3v4" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">System Usage Statistics</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            <div className="bg-purple-100 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-700">{users.length}</div>
              <div className="text-sm text-purple-700">Users</div>
            </div>
            <div className="bg-purple-100 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-700">{schedules.length}</div>
              <div className="text-sm text-purple-700">Schedules</div>
            </div>
            <div className="bg-purple-100 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-purple-700">{reports.length}</div>
              <div className="text-sm text-purple-700">Reports</div>
            </div>
          </div>
          </section>
          {/* System Backup & Restore */}
          <section className="bg-gradient-to-br from-cyan-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 2v4M16 2v4M4 10h16" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">System Backup & Restore</h2>
          </div>
          <div className="flex gap-4 mt-4">
            <button
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 focus:ring-2 focus:ring-blue-300 text-white rounded-lg font-semibold shadow transition-all duration-150"
              onClick={() => alert('Backup functionality coming soon!')}
            >
              Backup System
            </button>
            <button
              className="px-4 py-2 bg-green-600 hover:bg-green-700 focus:ring-2 focus:ring-green-300 text-white rounded-lg font-semibold shadow transition-all duration-150"
              onClick={() => alert('Restore functionality coming soon!')}
            >
              Restore System
            </button>
          </div>
          </section>
          {/* Court Schedules */}
          <section className="bg-gradient-to-br from-pink-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-pink-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M8 2v4M16 2v4M4 10h16" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">Court Schedules</h2>
          </div>
          <ul className="divide-y divide-pink-100">
            {schedules.length > 0 ? (
              schedules.map((s) => (
                <li key={s.id || s._id} className="py-2 flex items-center justify-between hover:bg-pink-100 rounded transition cursor-pointer" tabIndex={0}>
                  <span className="font-medium text-pink-900">{s.title || s.topic}</span>
                  <span className="text-xs text-gray-500">{s.date}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-400">No schedules found.</li>
            )}
          </ul>
          </section>
          {/* Reports */}
          <section className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-7 h-7 text-yellow-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M12 20a8 8 0 100-16 8 8 0 000 16z" /></svg>
            <h2 className="text-base sm:text-lg md:text-xl font-semibold">Reports</h2>
          </div>
          <ul className="divide-y divide-yellow-100">
            {reports.length > 0 ? (
              reports.map((r) => (
                <li key={r.id || r._id} className="py-2 flex items-center justify-between hover:bg-yellow-100 rounded transition cursor-pointer" tabIndex={0}>
                  <span className="font-medium text-yellow-900">{r.title}</span>
                  <span className="text-xs text-gray-500">{r.summary}</span>
                </li>
              ))
            ) : (
              <li className="text-gray-400">No reports found.</li>
            )}
          </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
