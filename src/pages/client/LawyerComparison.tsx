import React, { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();

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
        <h1 className="text-3xl font-bold mb-4">{t('client_lawyer_comparison.title')}</h1>
        <div className="flex flex-wrap gap-4 mb-6">
          <select
            className="border rounded px-2 py-1"
            value={filter.specialization}
            onChange={e => setFilter(f => ({ ...f, specialization: e.target.value }))}
          >
            <option value="">{t('client_lawyer_comparison.all_specializations')}</option>
            {specializations.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            className="border rounded px-2 py-1"
            value={filter.city}
            onChange={e => setFilter(f => ({ ...f, city: e.target.value }))}
          >
            <option value="">{t('client_lawyer_comparison.all_cities')}</option>
            {cities.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select
            className="border rounded px-2 py-1"
            value={sort}
            onChange={e => setSort(e.target.value)}
          >
            <option value="rating">{t('client_lawyer_comparison.sort_by_rating')}</option>
            <option value="price">{t('client_lawyer_comparison.sort_by_price')}</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-6 justify-center">
          {filtered.length > 0 ? filtered.map(l => (
            <div key={l._id} className="bg-card rounded shadow p-6 w-full md:w-80 flex flex-col justify-between">
              <div>
                <div className="text-xl font-semibold mb-1">{l.name}</div>
                <div className="mb-1"><span className="font-semibold">{t('client_lawyer_comparison.specialization')}:</span> {l.specialization}</div>
                <div className="mb-1"><span className="font-semibold">{t('client_lawyer_comparison.experience')}:</span> {l.experience}</div>
                <div className="mb-1"><span className="font-semibold">{t('client_lawyer_comparison.city')}:</span> {l.city}</div>
                <div className="mb-1"><span className="font-semibold">{t('client_lawyer_comparison.rating')}:</span> {l.rating.toFixed(1)} / 5</div>
                <div className="mb-1"><span className="font-semibold">{t('client_lawyer_comparison.price')}:</span> ${l.price}</div>
                <div className="mb-2"><span className="font-semibold">{t('client_lawyer_comparison.reviews')}:</span>
                  <ul className="list-disc ml-4">
                    {l.reviews?.slice(0, 2).map((r, i) => (
                      <li key={i}><span className="font-semibold">{r.reviewer}:</span> {r.comment} ({r.rating}/5)</li>
                    ))}
                    {l.reviews?.length > 2 && <li>{t('client_lawyer_comparison.and_more', { count: l.reviews.length - 2 })}</li>}
                  </ul>
                </div>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <button
                  className="px-3 py-1 bg-blue-600 text-white rounded"
                  onClick={() => window.location.href = `/lawyers/${l._id}`}
                >
                  {t('client_lawyer_comparison.view_full_profile')}
                </button>
                <button
                  className="px-3 py-1 bg-green-600 text-white rounded"
                  onClick={() => window.location.href = `/client/contact-lawyer/${l._id}`}
                >
                  {t('client_lawyer_comparison.contact_hire')}
                </button>
              </div>
            </div>
          )) : (
            <div className="text-center w-full text-gray-500">{t('client_lawyer_comparison.no_lawyers_found')}</div>
          )}
        </div>
      </main>
    </div>
  );
};

export default LawyerComparison;
