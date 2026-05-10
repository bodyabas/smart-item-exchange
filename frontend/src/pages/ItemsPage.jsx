import { useEffect, useState } from "react";

import { api, getErrorMessage } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { ItemCard } from "../components/ItemCard.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage.jsx";
import { ITEM_CATEGORY_OPTIONS } from "../constants/itemCategories.js";
import { useToast } from "../context/ToastContext.jsx";

const initialFilters = {
  search: "",
  category: "",
  city: "",
  condition: "",
};
const PAGE_SIZE = 6;

export function ItemsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState(initialFilters);
  const [sort, setSort] = useState("newest");
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    totalItems: 0,
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const loadItems = async (targetPage = pagination.page) => {
    setLoading(true);
    setError("");
    try {
      const params = {
        status: "available",
        page: targetPage,
        limit: PAGE_SIZE,
        sort,
      };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const response = await api.get("/items", { params });
      setItems(response.data.items);
      setPagination({
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalItems: response.data.total_items,
      });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
  }, []);

  const submit = (event) => {
    event.preventDefault();
    loadItems(1);
  };

  const goToPage = (nextPage) => {
    if (nextPage < 1 || nextPage > pagination.totalPages || loading) return;
    loadItems(nextPage);
  };

  const changeSort = (event) => {
    const nextSort = event.target.value;
    setSort(nextSort);
    loadItemsWithSort(nextSort, 1);
  };

  const loadItemsWithSort = async (nextSort, targetPage) => {
    setLoading(true);
    setError("");
    try {
      const params = {
        status: "available",
        page: targetPage,
        limit: PAGE_SIZE,
        sort: nextSort,
      };
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params[key] = value;
      });
      const response = await api.get("/items", { params });
      setItems(response.data.items);
      setPagination({
        page: response.data.page,
        totalPages: response.data.total_pages,
        totalItems: response.data.total_items,
      });
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Доступні речі" subtitle="Переглядайте речі, готові до обміну." />
      <form onSubmit={submit} className="mb-8 grid gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft md:grid-cols-6">
        <input
          placeholder="Пошук"
          value={filters.search}
          onChange={(event) => setFilters({ ...filters, search: event.target.value })}
        />
        <select
          value={filters.category}
          onChange={(event) => setFilters({ ...filters, category: event.target.value })}
        >
          <option value="">Усі категорії</option>
          {ITEM_CATEGORY_OPTIONS.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Місто"
          value={filters.city}
          onChange={(event) => setFilters({ ...filters, city: event.target.value })}
        />
        <input
          placeholder="Стан"
          value={filters.condition}
          onChange={(event) => setFilters({ ...filters, condition: event.target.value })}
        />
        <select value={sort} onChange={changeSort}>
          <option value="newest">Найновіші</option>
          <option value="condition">За станом</option>
          <option value="city">За містом</option>
        </select>
        <button
          className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-800 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Застосування..." : "Застосувати фільтри"}
        </button>
      </form>
      <ErrorState message={error} />
      {loading ? (
        <LoadingState label="Завантаження речей..." />
      ) : items.length ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
          <PaginationControls
            page={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            loading={loading}
            onPageChange={goToPage}
          />
        </>
      ) : (
        <EmptyState message="Речей не знайдено. Спробуйте змінити фільтри або текст пошуку." />
      )}
    </div>
  );
}

function PaginationControls({ page, totalPages, totalItems, loading, onPageChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-line bg-white p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm text-muted">
        Сторінка <span className="font-semibold text-ink">{page}</span> з{" "}
        <span className="font-semibold text-ink">{totalPages}</span>
        {" "}(усього {totalItems})
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={loading || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Назад
        </Button>
        <div className="flex flex-wrap gap-1">
          {pages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              disabled={loading}
              onClick={() => onPageChange(pageNumber)}
              className={`h-9 min-w-9 rounded-xl px-3 text-sm font-semibold ${
                pageNumber === page
                  ? "bg-brand text-white"
                  : "border border-line bg-white text-ink hover:bg-surface"
              } disabled:cursor-not-allowed disabled:opacity-60`}
            >
              {pageNumber}
            </button>
          ))}
        </div>
        <Button
          type="button"
          variant="secondary"
          disabled={loading || page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Далі
        </Button>
      </div>
    </div>
  );
}
