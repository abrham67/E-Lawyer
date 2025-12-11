import React from "react";
import Navbar from "@/components/Navbar";

const JudgeDashboard = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
  <main id="main-dashboard-section" className="container mx-auto px-4 py-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 text-primary">Judge Dashboard</h1>
  <div className="flex flex-col gap-4">
          <section className="bg-gradient-to-br from-blue-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2">Overview</h2>
            <p>Welcome, Judge! Here you can view and manage court sessions, review cases, and oversee proceedings.</p>
          </section>
          {/* Placeholder for future judge controls */}
          <section className="bg-gradient-to-br from-yellow-50 to-white rounded-2xl shadow-lg p-4 sm:p-5">
            <h2 className="text-base sm:text-lg md:text-xl font-semibold mb-2">Actions</h2>
            <p className="text-gray-600">Add judge-specific controls here.</p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default JudgeDashboard;
