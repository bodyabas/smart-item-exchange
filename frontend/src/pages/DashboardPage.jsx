import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, getErrorMessage, resolveMediaUrl } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { CreateExchangeRequestModal } from "../components/CreateExchangeRequestModal.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export function DashboardPage() {
  const { user, loadUser } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [summary, setSummary] = useState({
    active: 0,
    completed: 0,
    requests: 0,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [modalState, setModalState] = useState({
    open: false,
    sourceItem: null,
    requestedItem: null,
  });

  useEffect(() => {
    async function load() {
      setError("");
      setLoading(true);
      try {
        const currentUser = await loadUser();
        const [recResponse, activeItemsResponse, completedItemsResponse, requestsResponse] =
          await Promise.all([
            api.get("/recommendations/me"),
            api.get("/items", { params: { status: "available" } }),
            api.get("/items", { params: { status: "exchanged" } }),
            api.get("/exchange-requests"),
          ]);

        const userActiveItems = activeItemsResponse.data.items.filter(
          (item) => item.user_id === currentUser.id
        );
        const userCompletedItems = completedItemsResponse.data.items.filter(
          (item) => item.user_id === currentUser.id
        );

        setRecommendations((recResponse.data.recommendations || []).slice(0, 5));
        setSummary({
          active: userActiveItems.length,
          completed: userCompletedItems.length,
          requests: requestsResponse.data.exchange_requests?.length || 0,
        });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <LoadingState label="Loading dashboard..." />;

  const openRequestModal = (source, item) => {
    setSuccess("");
    setModalState({ open: true, sourceItem: source, requestedItem: item });
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${user?.name ? `, ${user.name}` : ""}`}
        subtitle="Your exchange hub for recommendations, inventory, and request activity."
      />
      <ErrorState message={error} />
      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-3">
        <SummaryCard label="Active items" value={summary.active} />
        <SummaryCard label="Completed items" value={summary.completed} />
        <SummaryCard label="Requests" value={summary.requests} />
      </section>

      <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Quick actions</h2>
            <p className="text-sm text-muted">Jump straight into the most common workflows.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to="/items/new">
              <Button>Add item</Button>
            </Link>
            <Link to="/items">
              <Button variant="secondary">Browse items</Button>
            </Link>
            <Link to="/exchange-requests">
              <Button variant="secondary">Requests</Button>
            </Link>
          </div>
        </div>
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Top AI recommendations</h2>
            <p className="text-sm text-muted">
              Ranked by desired exchange, item similarity, mutual interest, condition and city.
            </p>
          </div>
          <span className="text-sm text-muted">Showing top {Math.min(recommendations.length, 5)}</span>
        </div>
        {recommendations.length ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {recommendations.map((recommendation) => (
              <DashboardRecommendationCard
                key={`${recommendation.source_item.id}-${recommendation.recommended_item.id}`}
                recommendation={recommendation}
                onCreateRequest={openRequestModal}
              />
            ))}
          </div>
        ) : (
          <EmptyState message="No recommendations yet. Add an available item with a desired exchange to unlock matches." />
        )}
      </section>

      <CreateExchangeRequestModal
        open={modalState.open}
        requestedItem={modalState.requestedItem}
        suggestedSourceItem={modalState.sourceItem}
        onClose={() =>
          setModalState({ open: false, sourceItem: null, requestedItem: null })
        }
        onSuccess={() => setSuccess("Exchange request created successfully.")}
      />
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
    </article>
  );
}

function DashboardRecommendationCard({ recommendation, onCreateRequest }) {
  const source = recommendation.source_item;
  const item = recommendation.recommended_item || recommendation.item;
  const image = resolveMediaUrl(item?.images?.[0]?.image_url);

  return (
    <article className="overflow-hidden rounded-lg border border-line bg-white shadow-soft">
      <div className="aspect-[4/3] bg-slate-100">
        {image ? (
          <img src={image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-muted">
            No image
          </div>
        )}
      </div>
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-muted">Recommended</p>
            <h3 className="truncate font-semibold">{item.title}</h3>
          </div>
          <span className="rounded-full bg-brand px-2 py-1 text-xs font-semibold text-white">
            {Number(recommendation.final_score || 0).toFixed(2)}
          </span>
        </div>
        <p className="text-sm text-muted">
          {item.category} - {item.condition} - {item.city}
        </p>
        <p className="text-sm">
          For your <span className="font-medium">{source.title}</span>
        </p>
        <Button className="w-full" onClick={() => onCreateRequest(source, item)}>
          Create request
        </Button>
      </div>
    </article>
  );
}
