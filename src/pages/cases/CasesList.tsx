
import { useEffect, useState } from "react";
import { CasesAPI } from "@/lib/api";

const CasesList = () => {
  const [cases, setCases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newCase, setNewCase] = useState({ title: "", description: "", clientId: "" });
  const token = localStorage.getItem("token") || undefined;

  // Fetch cases on mount
  useEffect(() => {
    setLoading(true);
    CasesAPI.list(token)
      .then(setCases)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Create new case
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const created = await CasesAPI.create(newCase, token);
      setCases([...cases, created]);
      setNewCase({ title: "", description: "", clientId: "" });
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  // Delete case
  const handleDelete = async (id: string) => {
    setLoading(true);
    setError(null);
    try {
      await CasesAPI.delete(id, token);
      setCases(cases.filter(c => c.id !== id && c._id !== id));
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8">
      <h2 className="text-xl font-bold mb-4">Cases</h2>
      {error && <div className="text-red-500 mb-2">{error}</div>}
      {loading && <div>Loading...</div>}
      <form onSubmit={handleCreate} className="mb-4 flex gap-2">
        <input
          type="text"
          placeholder="Title"
          value={newCase.title}
          onChange={e => setNewCase({ ...newCase, title: e.target.value })}
          required
          className="border px-2 py-1"
        />
        <input
          type="text"
          placeholder="Description"
          value={newCase.description}
          onChange={e => setNewCase({ ...newCase, description: e.target.value })}
          required
          className="border px-2 py-1"
        />
        <input
          type="text"
          placeholder="Client ID"
          value={newCase.clientId}
          onChange={e => setNewCase({ ...newCase, clientId: e.target.value })}
          required
          className="border px-2 py-1"
        />
        <button type="submit" className="bg-blue-500 text-white px-3 py-1 rounded">Add Case</button>
      </form>
      <ul>
        {cases.map(c => (
          <li key={c.id || c._id} className="mb-2 flex justify-between items-center border-b pb-2">
            <span>
              <strong>{c.title}</strong> - {c.description}
            </span>
            <button onClick={() => handleDelete(c.id || c._id)} className="text-red-500">Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
};
export default CasesList;
