import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, getErrorMessage, resolveMediaUrl } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { CreateExchangeRequestModal } from "../components/CreateExchangeRequestModal.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { RecommendationCard } from "../components/RecommendationCard.jsx";
import { ErrorState, LoadingState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const activeRequestStatuses = ["pending", "countered"];
const desktopBreakpoint = 1024;

export function DashboardPage() {
  const { user, loadUser } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [activeRequests, setActiveRequests] = useState([]);
  const [requestItemsById, setRequestItemsById] = useState({});
  const [summary, setSummary] = useState({
    activeItems: 0,
    exchangedItems: 0,
    activeRequests: 0,
    bestMatchScore: null,
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(true);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [cardsPerView, setCardsPerView] = useState(2);
  const [modalState, setModalState] = useState({
    open: false,
    sourceItem: null,
    requestedItem: null,
  });

  useEffect(() => {
    const updateCardsPerView = () => {
      setCardsPerView(window.innerWidth >= desktopBreakpoint ? 2 : 1);
    };

    updateCardsPerView();
    window.addEventListener("resize", updateCardsPerView);
    return () => window.removeEventListener("resize", updateCardsPerView);
  }, []);

  useEffect(() => {
    async function load() {
      setError("");
      setLoading(true);
      try {
        const currentUser = await loadUser();
        const [
          recResponse,
          activeItemsResponse,
          exchangedItemsResponse,
          requestsResponse,
        ] = await Promise.all([
          api.get("/recommendations/me"),
          api.get("/items", { params: { status: "available", limit: 100 } }),
          api.get("/items", { params: { status: "exchanged", limit: 100 } }),
          api.get("/exchange-requests"),
        ]);

        const loadedRecommendations = (
          recResponse.data.recommendations || []
        )
          .slice()
          .sort(
            (first, second) =>
              Number(second.final_score || 0) - Number(first.final_score || 0)
          )
          .slice(0, 6);
        const loadedRequests = requestsResponse.data.exchange_requests || [];
        const filteredActiveRequests = loadedRequests.filter((request) =>
          activeRequestStatuses.includes(request.status)
        );
        const userActiveItems = activeItemsResponse.data.items.filter(
          (item) => item.user_id === currentUser.id
        );
        const userExchangedItems = exchangedItemsResponse.data.items.filter(
          (item) => item.user_id === currentUser.id
        );

        setRecommendations(loadedRecommendations.slice(0, 6));
        setActiveRequests(filteredActiveRequests.slice(0, 3));
        await loadRequestItems(filteredActiveRequests.slice(0, 3));
        setSummary({
          activeItems: userActiveItems.length,
          exchangedItems: userExchangedItems.length,
          activeRequests: filteredActiveRequests.length,
          bestMatchScore: loadedRecommendations[0]?.final_score ?? null,
        });
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const loadRequestItems = async (requests) => {
    const ids = [
      ...new Set(
        requests.flatMap((request) => [
          request.offered_item_id,
          request.requested_item_id,
        ])
      ),
    ];

    const pairs = await Promise.all(
      ids.map(async (id) => {
        try {
          const response = await api.get(`/items/${id}`);
          return [id, response.data.item];
        } catch {
          return [id, null];
        }
      })
    );

    setRequestItemsById(Object.fromEntries(pairs));
  };

  if (loading) return <LoadingState label="Loading dashboard..." />;

  const openRequestModal = (source, item) => {
    setSuccess("");
    setModalState({ open: true, sourceItem: source, requestedItem: item });
  };

  const pageCount = Math.max(1, Math.ceil(recommendations.length / cardsPerView));
  const showCarouselControls = recommendations.length > cardsPerView;
  const normalizedCarouselIndex = Math.min(carouselIndex, pageCount - 1);
  const carouselStart = normalizedCarouselIndex * cardsPerView;
  const visibleRecommendations = recommendations.slice(
    carouselStart,
    carouselStart + cardsPerView
  );

  const goToPreviousRecommendations = () => {
    setCarouselIndex((current) => (current - 1 + pageCount) % pageCount);
  };

  const goToNextRecommendations = () => {
    setCarouselIndex((current) => (current + 1) % pageCount);
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome${user?.name ? `, ${user.name}` : ""}`}
        subtitle="Here are your best exchange opportunities today."
      />
      <ErrorState message={error} />
      {success ? (
        <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          {success}
        </div>
      ) : null}

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Active items" value={summary.activeItems} />
        <SummaryCard label="Exchanged items" value={summary.exchangedItems} />
        <SummaryCard label="Active requests" value={summary.activeRequests} />
        <SummaryCard
          label="Best match score"
          value={
            summary.bestMatchScore === null
              ? "No match"
              : `${Math.round(Number(summary.bestMatchScore) * 100)}%`
          }
          helper={
            summary.bestMatchScore === null
              ? "Add listings to unlock matches"
              : qualityLabel(summary.bestMatchScore)
          }
        />
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            title="Top AI Recommendations"
            text="Browse your best AI-powered exchange matches without leaving the dashboard."
          />
          {showCarouselControls ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={goToPreviousRecommendations}>
                <span aria-hidden="true">←</span>
                <span className="sr-only">Previous recommendations</span>
              </Button>
              <Button variant="secondary" onClick={goToNextRecommendations}>
                <span aria-hidden="true">→</span>
                <span className="sr-only">Next recommendations</span>
              </Button>
            </div>
          ) : null}
        </div>
        {recommendations.length ? (
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              {visibleRecommendations.map((recommendation) => (
                <RecommendationCard
                  key={`${recommendation.source_item.id}-${recommendation.recommended_item.id}`}
                  recommendation={recommendation}
                  onCreateRequest={openRequestModal}
                />
              ))}
            </div>
            {showCarouselControls ? (
              <div className="flex items-center justify-center gap-2">
                {Array.from({ length: pageCount }).map((_, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Go to recommendation page ${index + 1}`}
                    onClick={() => setCarouselIndex(index)}
                    className={`h-2.5 rounded-full transition-all ${
                      normalizedCarouselIndex === index
                        ? "w-8 bg-brand"
                        : "w-2.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <RecommendationEmptyState />
        )}
      </section>

      <section>
        <SectionHeader
          title="Active requests"
          text="Pending and countered exchange requests that still need attention."
        />
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft">
          {activeRequests.length ? (
            <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
              {activeRequests.map((request) => (
                <RequestPreview
                  key={request.id}
                  request={request}
                  currentUserId={user?.id}
                  offeredItem={requestItemsById[request.offered_item_id]}
                  requestedItem={requestItemsById[request.requested_item_id]}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 rounded-md bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">No active requests</h3>
                <p className="mt-1 text-sm text-muted">
                  Exchange requests that need attention will appear here.
                </p>
              </div>
              <Link to="/items">
                <Button variant="secondary">Browse items</Button>
              </Link>
            </div>
          )}
        </div>
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

function SectionHeader({ title, text }) {
  return (
    <div className="mb-3">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

function SummaryCard({ label, value, helper }) {
  return (
    <article className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-semibold">{value}</p>
      {helper ? <p className="mt-1 text-sm font-medium text-muted">{helper}</p> : null}
    </article>
  );
}

function RecommendationEmptyState() {
  return (
    <div className="rounded-lg border border-line bg-white p-6 text-center shadow-soft">
      <h3 className="text-lg font-semibold">No smart matches yet</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Add more available items or update your desired exchange preferences.
      </p>
      <Link to="/items/new" className="mt-4 inline-block">
        <Button>Add item</Button>
      </Link>
    </div>
  );
}

function RequestPreview({ request, currentUserId, offeredItem, requestedItem }) {
  const direction =
    request.receiver_id === currentUserId
      ? "Incoming request"
      : request.sender_id === currentUserId
        ? "Outgoing request"
        : "Active request";
  const offeredTitle = offeredItem?.title || `Item #${request.offered_item_id}`;
  const requestedTitle = requestedItem?.title || `Item #${request.requested_item_id}`;

  return (
    <article className="rounded-md border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{direction}</h3>
          <p className="mt-1 truncate text-sm font-medium text-ink">
            {offeredTitle} → {requestedTitle}
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
          {request.status}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <RequestItemMini
          label="Offered"
          item={offeredItem}
          fallbackId={request.offered_item_id}
        />
        <RequestItemMini
          label="Requested"
          item={requestedItem}
          fallbackId={request.requested_item_id}
        />
      </div>

      {request.message ? (
        <p className="mt-2 line-clamp-2 text-sm">{request.message}</p>
      ) : null}

      <Link to="/exchange-requests" className="mt-4 inline-block">
        <Button variant="secondary">View request</Button>
      </Link>
    </article>
  );
}

function qualityLabel(score) {
  const numericScore = Number(score || 0);
  if (numericScore >= 0.75) return "Excellent match";
  if (numericScore >= 0.55) return "Good match";
  if (numericScore >= 0.35) return "Possible match";
  return "Low relevance";
}

function RequestItemMini({ label, item, fallbackId }) {
  const image = resolveMediaUrl(item?.images?.[0]?.image_url);

  return (
    <div className="flex gap-3 rounded-md bg-white p-2">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-slate-100">
        {image ? (
          <img src={image} alt={item?.title || "Item"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-muted">
            No image
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase text-muted">{label}</p>
        <h4 className="truncate text-sm font-semibold">
          {item?.title || `Item #${fallbackId}`}
        </h4>
        {item ? (
          <p className="truncate text-xs text-muted">
            {item.category} - {item.condition} - {item.city}
          </p>
        ) : (
          <p className="text-xs text-muted">Details unavailable</p>
        )}
      </div>
    </div>
  );
}
