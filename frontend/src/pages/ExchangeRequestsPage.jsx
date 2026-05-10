import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, getErrorMessage, resolveMediaUrl } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatCashAdjustment } from "../utils/cashAdjustment.js";
import { categoryLabel, conditionLabel, statusLabel } from "../utils/labels.js";

const finalStatusLabel = {
  accepted: "Завершено",
  rejected: "Відхилено",
  cancelled: "Скасовано",
};
const requestTabs = [
  { id: "all", label: "Усі" },
  { id: "incoming", label: "Вхідні" },
  { id: "outgoing", label: "Вихідні" },
];

export function ExchangeRequestsPage() {
  const { user, loadUser } = useAuth();
  const toast = useToast();
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [itemsById, setItemsById] = useState({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      await loadUser();
      const response = await api.get("/exchange-requests");
      const loadedRequests = response.data.exchange_requests;
      setRequests(loadedRequests);
      await loadRequestItems(loadedRequests);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const loadRequestItems = async (loadedRequests) => {
    const ids = [
      ...new Set(
        loadedRequests.flatMap((request) => [
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

    setItemsById(Object.fromEntries(pairs));
  };

  useEffect(() => {
    load();
  }, []);

  const action = async (requestId, name) => {
    setActionLoading(`${requestId}-${name}`);
    setError("");
    try {
      await api.put(`/exchange-requests/${requestId}/${name}`);
      toast.success(exchangeActionSuccessMessage(name));
      await load();
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setActionLoading(null);
    }
  };

  const visibleRequests = requests.filter((request) => {
    if (activeTab === "incoming") return request.receiver_id === user?.id;
    if (activeTab === "outgoing") return request.sender_id === user?.id;
    return true;
  });
  const activeRequests = visibleRequests.filter(
    (request) => request.status === "pending" || request.status === "countered"
  );
  const historyRequests = visibleRequests.filter(
    (request) =>
      request.status === "accepted" ||
      request.status === "rejected" ||
      request.status === "cancelled"
  );

  return (
    <div>
      <PageHeader
        title="Запити на обмін"
        subtitle="Переглядайте запити, відповідайте на пропозиції або домовляйтеся."
      />
      <ErrorState message={error} />
      {loading ? (
        <LoadingState label="Завантаження запитів на обмін..." />
      ) : requests.length ? (
        <div className="space-y-8">
          <RequestTabs activeTab={activeTab} onChange={setActiveTab} />
          <RequestSection
            title="Активні запити"
            emptyMessage={emptyMessageForTab(activeTab, "active")}
            requests={activeRequests}
            currentUserId={user?.id}
            itemsById={itemsById}
            onAction={action}
            actionLoading={actionLoading}
          />
          <RequestSection
            title="Історія"
            emptyMessage={emptyMessageForTab(activeTab, "history")}
            requests={historyRequests}
            currentUserId={user?.id}
            itemsById={itemsById}
            onAction={action}
            actionLoading={actionLoading}
          />
        </div>
      ) : (
        <EmptyState message="Поки немає запитів на обмін. Створіть запит зі сторінки речі або рекомендації." />
      )}
    </div>
  );
}

function RequestTabs({ activeTab, onChange }) {
  return (
    <div className="inline-flex rounded-2xl border border-line bg-white p-1 shadow-soft">
      {requestTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
            activeTab === tab.id
              ? "bg-brand text-white"
              : "text-muted hover:bg-surface hover:text-ink"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function emptyMessageForTab(tab, section) {
  if (tab === "incoming") {
    return section === "active"
      ? "Немає вхідних запитів"
      : "Історії вхідних запитів поки немає.";
  }
  if (tab === "outgoing") {
    return section === "active"
      ? "Немає вихідних запитів"
      : "Історії вихідних запитів поки немає.";
  }
  return section === "active"
    ? "Зараз немає активних запитів."
    : "Прийняті, відхилені та скасовані запити з'являться тут.";
}

function RequestSection({
  title,
  emptyMessage,
  requests,
  currentUserId,
  itemsById,
  onAction,
  actionLoading,
}) {
  return (
    <section>
      <h2 className="mb-4 text-xl font-bold text-gray-900">{title}</h2>
      {requests.length ? (
        <div className="space-y-4">
          {requests.map((request) => (
            <ExchangeRequestCard
              key={request.id}
              request={request}
              currentUserId={currentUserId}
              offeredItem={itemsById[request.offered_item_id]}
              requestedItem={itemsById[request.requested_item_id]}
              onAction={onAction}
              actionLoading={actionLoading}
            />
          ))}
        </div>
      ) : (
        <RequestEmptyState message={emptyMessage} />
      )}
    </section>
  );
}

function RequestEmptyState({ message }) {
  return (
    <div className="rounded-2xl border border-line bg-white p-6 text-center shadow-soft">
      <h3 className="font-semibold">{message}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Перегляньте доступні речі, щоб почати новий обмін.
      </p>
      <Link to="/items" className="mt-4 inline-block">
        <Button variant="secondary">Переглянути речі</Button>
      </Link>
    </div>
  );
}

function ExchangeRequestCard({
  request,
  currentUserId,
  offeredItem,
  requestedItem,
  onAction,
  actionLoading,
}) {
  const active = request.status === "pending" || request.status === "countered";
  const latestOfferUserId = request.latest_offer?.proposed_by_user_id;
  const latestOfferByCurrentUser = latestOfferUserId === currentUserId;
  const canRespond = active && latestOfferUserId && !latestOfferByCurrentUser;
  const canCancel = active && request.sender_id === currentUserId;
  const canCounter = canRespond;
  const finalLabel = finalStatusLabel[request.status];
  const loadingAction = (name) => actionLoading === `${request.id}-${name}`;
  const anyActionLoading = Boolean(actionLoading);
  const currentOffer = request.latest_offer || request;
  const direction =
    request.sender_id === currentUserId ? "Вихідний запит" : "Вхідний запит";
  const offeredTitle = offeredItem?.title || `Річ #${request.offered_item_id}`;
  const requestedTitle = requestedItem?.title || `Річ #${request.requested_item_id}`;

  return (
    <article className="rounded-2xl border border-line bg-white p-5 shadow-soft transition duration-200 hover:-translate-y-1 hover:shadow-md">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">{direction}</p>
          <h3 className="mt-1 truncate text-lg font-semibold text-gray-900">
            {offeredTitle} -&gt; {requestedTitle}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(request.status)}`}>
            {statusLabel(request.status)}
          </span>
          {finalLabel ? (
            <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-semibold text-brand">
              {finalLabel}
            </span>
          ) : null}
        </div>
        {active && latestOfferByCurrentUser ? (
          <p className="basis-full text-sm text-muted sm:text-right">
            Очікує відповіді
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ItemPreview label="Запропонована річ" item={offeredItem} fallbackId={request.offered_item_id} />
        <ItemPreview label="Запитувана річ" item={requestedItem} fallbackId={request.requested_item_id} />
      </div>

      <div className="mt-4 rounded-2xl bg-surface p-4 text-sm">
        <p className="font-medium">{formatCashAdjustment(currentOffer)}</p>
        {currentOffer.message ? <p className="mt-1 text-muted">{currentOffer.message}</p> : null}
      </div>

      {active ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {canRespond ? (
            <>
              <Button
                onClick={() => onAction(request.id, "accept")}
                disabled={anyActionLoading}
              >
                {loadingAction("accept") ? "Прийняття..." : "Прийняти"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => onAction(request.id, "reject")}
                disabled={anyActionLoading}
              >
                {loadingAction("reject") ? "Відхилення..." : "Відхилити"}
              </Button>
            </>
          ) : null}
          {canCancel ? (
            <Button
              variant="danger"
              onClick={() => onAction(request.id, "cancel")}
              disabled={anyActionLoading}
            >
              {loadingAction("cancel") ? "Скасування..." : "Скасувати"}
            </Button>
          ) : null}
          {canCounter ? (
            anyActionLoading ? (
              <Button variant="secondary" disabled>
                Зустрічна пропозиція
              </Button>
            ) : (
              <Link to={`/exchange-requests/${request.id}/counter`}>
                <Button variant="secondary">Зустрічна пропозиція</Button>
              </Link>
            )
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          Цей запит: {finalLabel || statusLabel(request.status)}.
        </p>
      )}
    </article>
  );
}

function ItemPreview({ label, item, fallbackId }) {
  const image = resolveMediaUrl(item?.images?.[0]?.image_url);

  return (
    <div className="flex gap-3 rounded-2xl border border-line bg-white p-3">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {image ? (
          <img src={image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            Без фото
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-muted">{label}</p>
        <h4 className="font-semibold text-gray-900">{item?.title || `Річ #${fallbackId}`}</h4>
        {item ? (
          <p className="text-sm text-muted">
            {categoryLabel(item.category)} - {conditionLabel(item.condition)} - {item.city}
          </p>
        ) : (
          <p className="text-sm text-muted">Деталі недоступні</p>
        )}
      </div>
    </div>
  );
}

function statusBadgeClass(status) {
  const styles = {
    pending: "bg-yellow-50 text-yellow-700",
    countered: "bg-blue-50 text-blue-700",
    accepted: "bg-green-50 text-green-700",
    rejected: "bg-red-50 text-red-700",
    cancelled: "bg-slate-100 text-slate-600",
  };
  return styles[status] || "bg-surface text-muted";
}

function exchangeActionSuccessMessage(action) {
  const messages = {
    accept: "Запит на обмін прийнято.",
    reject: "Запит на обмін відхилено.",
    cancel: "Запит на обмін скасовано.",
  };
  return messages[action] || "Запит на обмін оновлено.";
}
