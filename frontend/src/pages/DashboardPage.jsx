import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, getErrorMessage, resolveMediaUrl } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { CreateExchangeRequestModal } from "../components/CreateExchangeRequestModal.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { RecommendationCard } from "../components/RecommendationCard.jsx";
import { ErrorState, LoadingState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatCashAdjustment } from "../utils/cashAdjustment.js";
import { categoryLabel, conditionLabel, statusLabel } from "../utils/labels.js";

const activeRequestStatuses = ["pending", "countered"];
const desktopBreakpoint = 1024;

export function DashboardPage() {
  const { user, loadUser } = useAuth();
  const toast = useToast();
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
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
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

  if (loading) return <LoadingState label="Завантаження панелі..." />;

  const openRequestModal = (source, item) => {
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
        title={`Вітаємо${user?.name ? `, ${user.name}` : ""}`}
        subtitle="Ось ваші найкращі можливості для обміну сьогодні."
      />
      <ErrorState message={error} />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Активні речі" value={summary.activeItems} />
        <SummaryCard label="Обміняні речі" value={summary.exchangedItems} />
        <SummaryCard label="Активні запити" value={summary.activeRequests} />
        <SummaryCard
          label="Найкращий збіг"
          value={
            summary.bestMatchScore === null
              ? "Немає збігу"
              : `${Math.round(Number(summary.bestMatchScore) * 100)}%`
          }
          helper={
            summary.bestMatchScore === null
              ? "Додайте речі, щоб отримати збіги"
              : qualityLabel(summary.bestMatchScore)
          }
        />
      </section>

      <section>
        <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <SectionHeader
            title="AI-рекомендації"
            text="Переглядайте найкращі AI-підібрані обміни прямо на панелі."
          />
          {showCarouselControls ? (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={goToPreviousRecommendations}>
                <span aria-hidden="true">←</span>
                <span className="sr-only">Попередні рекомендації</span>
              </Button>
              <Button variant="secondary" onClick={goToNextRecommendations}>
                <span aria-hidden="true">→</span>
                <span className="sr-only">Наступні рекомендації</span>
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
                    aria-label={`Перейти до сторінки рекомендацій ${index + 1}`}
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
          title="Активні запити"
          text="Запити, які очікують відповіді або мають зустрічні пропозиції."
        />
        <div className="rounded-2xl border border-line bg-white p-5 shadow-soft">
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
            <div className="flex flex-col items-start gap-3 rounded-2xl bg-surface p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="font-semibold">Немає активних запитів</h3>
                <p className="mt-1 text-sm text-muted">
                  Запити на обмін, які потребують уваги, з'являться тут.
                </p>
              </div>
              <Link to="/items">
                <Button variant="secondary">Переглянути речі</Button>
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
        onSuccess={() => {}}
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
    <article className="rounded-2xl border border-line bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-md">
      <p className="text-sm font-medium text-muted">{label}</p>
      <p className="mt-2 text-3xl font-bold text-gray-900">{value}</p>
      {helper ? <p className="mt-1 text-sm font-medium text-muted">{helper}</p> : null}
    </article>
  );
}

function RecommendationEmptyState() {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-soft">
      <h3 className="text-lg font-semibold text-gray-900">Поки немає AI-рекомендацій</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Додайте більше доступних речей або оновіть побажання до обміну.
      </p>
      <Link to="/items/new" className="mt-4 inline-block">
        <Button>Додати річ</Button>
      </Link>
    </div>
  );
}

function RequestPreview({ request, currentUserId, offeredItem, requestedItem }) {
  const currentOffer = request.latest_offer || request;
  const direction =
    request.receiver_id === currentUserId
      ? "Вхідний запит"
      : request.sender_id === currentUserId
        ? "Вихідний запит"
        : "Активний запит";
  const offeredTitle = offeredItem?.title || `Річ #${request.offered_item_id}`;
  const requestedTitle = requestedItem?.title || `Річ #${request.requested_item_id}`;

  return (
    <article className="rounded-2xl border border-line bg-surface p-4 transition duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold">{direction}</h3>
          <p className="mt-1 truncate text-sm font-medium text-ink">
            {offeredTitle} -&gt; {requestedTitle}
          </p>
        </div>
        <span className="rounded-full bg-white px-2 py-1 text-xs font-semibold text-brand">
          {statusLabel(request.status)}
        </span>
      </div>

      <div className="mt-4 space-y-2">
        <RequestItemMini
          label="Пропонується"
          item={offeredItem}
          fallbackId={request.offered_item_id}
        />
        <RequestItemMini
          label="Запитується"
          item={requestedItem}
          fallbackId={request.requested_item_id}
        />
      </div>

      {currentOffer.message ? (
        <p className="mt-2 line-clamp-2 text-sm">{currentOffer.message}</p>
      ) : null}
      <p className="mt-2 text-sm font-medium text-muted">
        {formatCashAdjustment(currentOffer)}
      </p>

      <Link to="/exchange-requests" className="mt-4 inline-block">
        <Button variant="secondary">Переглянути запит</Button>
      </Link>
    </article>
  );
}

function qualityLabel(score) {
  const numericScore = Number(score || 0);
  if (numericScore >= 0.75) return "Відмінний збіг";
  if (numericScore >= 0.55) return "Хороший збіг";
  if (numericScore >= 0.35) return "Можливий збіг";
  return "Низька релевантність";
}

function RequestItemMini({ label, item, fallbackId }) {
  const image = resolveMediaUrl(item?.images?.[0]?.image_url);

  return (
    <div className="flex gap-3 rounded-xl bg-white p-2">
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {image ? (
          <img src={image} alt={item?.title || "Річ"} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center px-1 text-center text-[10px] text-muted">
            Без фото
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase text-muted">{label}</p>
        <h4 className="truncate text-sm font-semibold">
          {item?.title || `Річ #${fallbackId}`}
        </h4>
        {item ? (
          <p className="truncate text-xs text-muted">
            {categoryLabel(item.category)} - {conditionLabel(item.condition)} - {item.city}
          </p>
        ) : (
          <p className="text-xs text-muted">Деталі недоступні</p>
        )}
      </div>
    </div>
  );
}
