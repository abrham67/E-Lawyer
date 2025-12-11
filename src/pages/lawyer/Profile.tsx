import React, { useEffect, useRef, useState } from "react";
import Navbar from "@/components/Navbar";

const LawyerProfile = () => {
  const [profile, setProfile] = useState<any>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    fetch("/api/profiles/me", { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setProfile(data))
      .catch(() => setError("Failed to load profile."));
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !profile) return;
    const file = e.target.files[0];
    setUploading(true);
    setError("");
    setSuccess("");
    const token = localStorage.getItem("token");
    const formData = new FormData();
    formData.append("file", file);
    const res = await fetch(`/api/profiles/${profile._id}/credentials`, {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const updated = await res.json();
      setProfile(updated);
      setSuccess("Credential uploaded.");
    } else {
      setError("Upload failed.");
    }
    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
  <main id="main-dashboard-section" className="container mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold mb-4">My Profile</h1>
        {error && <div className="bg-red-100 text-red-700 p-2 mb-4 rounded">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-2 mb-4 rounded">{success}</div>}
        {profile ? (
          <div className="bg-card rounded-lg shadow p-6 space-y-4">
            <div><strong>Name:</strong> {profile.name}</div>
            <div><strong>Email:</strong> {profile.email}</div>
            <div><strong>Qualifications:</strong> {profile.qualifications?.join(", ") || "-"}</div>
            <div><strong>Expertise:</strong> {profile.expertise?.join(", ") || "-"}</div>
            <div><strong>Experience:</strong> {profile.experience || "-"}</div>
            <div><strong>Case History:</strong>
              <ul className="list-disc ml-6">
                {profile.caseHistory?.length > 0 ? profile.caseHistory.map((c: any, i: number) => (
                  <li key={i}>{c.title} ({c.date ? new Date(c.date).toLocaleDateString() : "N/A"}) - {c.outcome}</li>
                )) : <li>-</li>}
              </ul>
            </div>
            <div>
              <strong>Credentials:</strong>
              <ul className="list-disc ml-6">
                {profile.credentials?.length > 0 ? profile.credentials.map((cred: any, i: number) => (
                  <li key={i}>
                    <a href={`/${cred.filepath}`} target="_blank" rel="noopener noreferrer" className="text-primary underline">{cred.filename}</a>
                  </li>
                )) : <li>-</li>}
              </ul>
              <input
                type="file"
                ref={fileInputRef}
                style={{ display: "none" }}
                onChange={handleFileChange}
                disabled={uploading}
              />
              <button
                className="mt-2 px-4 py-2 bg-primary text-white rounded"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                disabled={uploading}
              >
                {uploading ? "Uploading..." : "Upload Credential"}
              </button>
            </div>
          </div>
        ) : (
          <div>Loading profile...</div>
        )}
      </main>
    </div>
  );
};

export default LawyerProfile;
