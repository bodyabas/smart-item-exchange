import { useEffect, useState } from "react";

import { api, getErrorMessage } from "../api/client.js";
import { ItemCard } from "../components/ItemCard.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage.jsx";
import { ITEM_CATEGORIES } from "../constants/itemCategories.js";

const initialFilters = {
  search: "",
  category: "",
  city: "",
  condition: "",
};

export function ItemsPage() {
  const [filters, setFilters] = useState(initialFilters);
  const [items, setItems] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadItems = async () => {
    setLoading(true);
    setError("");
    try {
      const params = { status: "available" };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const response = await api.get("/items", { params });
      setItems(response.data.items);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const submit = (event) => {
    event.preventDefault();
    loadItems();
  };

  return (
    <div>
      <PageHeader title="Available items" subtitle="Browse listings ready for exchange." />
      <form onSubmit={submit} className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:grid-cols-5">
        <input
          placeholder="search"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
        />
        <select
          value={filters.category}
          onChange={(event) => setFilters({ ...filters, category: event.target.value })}
        >
          <option value="">All categories</option>
          {ITEM_CATEGORIES.map((category) => (
            <option key={category} value={category}>
              {category}
            </option>
          ))}
        </select>
        <input
          placeholder="city"
          value={filters.city}
          onChange={(event) => setFilters({ ...filters, city: event.target.value })}
        />
        <input
          placeholder="condition"
          value={filters.condition}
          onChange={(event) => setFilters({ ...filters, condition: event.target.value })}
        />
        <button
          className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Applying..." : "Apply filters"}
        </button>
      </form>
      <ErrorState message={error} />
      {loading ? (
        <LoadingState label="Loading items..." />
      ) : items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => <ItemCard key={item.id} item={item} />)}
        </div>
      ) : (
        <EmptyState message="No items found. Try changing the filters or search text." />
      )}
    </div>
  );
}
