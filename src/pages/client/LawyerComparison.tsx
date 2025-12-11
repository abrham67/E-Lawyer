import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";

interface Lawyer {
  _id: string;
  name: string;
  specialization: string;
  experience: string;
  city: string;
  rating: number;
  price: number;
  reviews: { reviewer: string; comment: string; rating: number }[];
}

const LawyerComparison = () => {
  const [lawyers, setLawyers] = useState<Lawyer[]>([]);
  const [filter, setFilter] = useState({ city: "", specialization: "" });
  const [sort, setSort] = useState("rating");

  useEffect(() => {
    fetch("/api/lawyers")
      .then(res => res.json())
      .then(data => setLawyers(data.lawyers || []));
  }, []);

  const filtered = lawyers
    .filter(l =>
      (!filter.city || l.city === filter.city) &&
      (!filter.specialization || l.specialization === filter.specialization)
    )
    .sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "price") return a.price - b.price;
      return 0;
    });

  const specializations = Array.from(new Set(lawyers.map(l => l.specialization)));
  const cities = Array.from(new Set(lawyers.map(l => l.city)));

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8 space-y-8">
        <h1 className="text-3xl font-bold mb-4">Compare Lawyers</h1>
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            className="border rounded px-2 py-1"
            value={filter.specialization}
            onChange={e => setFilter(f => ({ ...f, specialization: e.target.value }))}
          >
            <option value="">All Specializations</option>
            {specializations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="border rounded px-2 py-1"
            value={filter.city}
            onChange={e => setFilter(f => ({ ...f, city: e.target.value }))}
          >
            <option value="">All Cities</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="border rounded px-2 py-1"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="rating">Sort by Rating</option>
            <option value="price">Sort by Price</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-6 justify-center">
          {filtered.length > 0 ? filtered.map(l => (
            <div key={l._id} className="bg-card rounded shadow p-6 w-full md:w-80 flex flex-col justify-between">
              <div>
                <div className="text-xl font-semibold mb-1">{l.name}</div>
                <div className="mb-1"><span className="font-semibold">Specialization:</span> {l.specialization}</div>
                <div className="mb-1"><span className="font-semibold">Experience:</span> {l.experience}</div>
                <div className="mb-1"><span className="font-semibold">City:</span> {l.city}</div>
                <div className="mb-1"><span className="font-semibold">Rating:</span> {l.rating.toFixed(1)} / 5</div>
                <div className="mb-1"><span className="font-semibold">Price:</span> ${l.price}</div>
                <div className="mb-2"><span className="font-semibold">Reviews:</span>
                  <ul className="list-disc ml-4">
                    {l.reviews?.slice(0, 2).map((r, i) => (
                      <li key={i}><span className="font-semibold">{r.reviewer}:</span> {r.comment} ({r.rating}/5)</li>
                    ))}
                    {l.reviews?.length > 2 && <li>...and {l.reviews.length - 2} more</li>}
                  </ul>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                  onClick={() => window.location.href = `/lawyers/${l._id}`}
                >
                  View Full Profile
                </button>
                <button
                  className="px-3 py-1 bg-green-600 text-white rounded"
                  onClick={() => window.location.href = `/client/contact-lawyer/${l._id}`}
                >
                  Contact / Hire Lawyer
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center w-full text-gray-500">No lawyers found.</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LawyerComparison;
