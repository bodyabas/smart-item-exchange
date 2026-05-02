import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, getErrorMessage, resolveMediaUrl } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { formatCashAdjustment } from "../utils/cashAdjustment.js";

const finalStatusLabel = {
  accepted: "Completed",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
const requestTabs = [
  { id: "all", label: "All" },
  { id: "incoming", label: "Incoming" },
  { id: "outgoing", label: "Outgoing" },
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
        title="Exchange requests"
        subtitle="Review requests, respond to offers, or negotiate."
      />
      <ErrorState message={error} />
      {loading ? (
        <LoadingState label="Loading exchange requests..." />
      ) : requests.length ? (
        <div className="space-y-8">
          <RequestTabs activeTab={activeTab} onChange={setActiveTab} />
          <RequestSection
            title="Active requests"
            emptyMessage={emptyMessageForTab(activeTab, "active")}
            requests={activeRequests}
            currentUserId={user?.id}
            itemsById={itemsById}
            onAction={action}
            actionLoading={actionLoading}
          />
          <RequestSection
            title="History"
            emptyMessage={emptyMessageForTab(activeTab, "history")}
            requests={historyRequests}
            currentUserId={user?.id}
            itemsById={itemsById}
            onAction={action}
            actionLoading={actionLoading}
          />
        </div>
      ) : (
        <EmptyState message="No exchange requests yet. Create a request from an item or recommendation." />
      )}
    </div>
  );
}

function RequestTabs({ activeTab, onChange }) {
  return (
    <div className="inline-flex rounded-lg border border-line bg-white p-1 shadow-soft">
      {requestTabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={`rounded-md px-4 py-2 text-sm font-semibold transition ${
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
      ? "No incoming requests"
      : "No incoming request history yet.";
  }
  if (tab === "outgoing") {
    return section === "active"
      ? "No outgoing requests"
      : "No outgoing request history yet.";
  }
  return section === "active"
    ? "No active requests right now."
    : "Accepted, rejected and cancelled requests will appear here.";
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
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
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
    <div className="rounded-lg border border-line bg-white p-6 text-center shadow-soft">
      <h3 className="font-semibold">{message}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted">
        Browse available items to start a new exchange conversation.
      </p>
      <Link to="/items" className="mt-4 inline-block">
        <Button variant="secondary">Browse items</Button>
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
    request.sender_id === currentUserId ? "Outgoing request" : "Incoming request";
  const offeredTitle = offeredItem?.title || `Item #${request.offered_item_id}`;
  const requestedTitle = requestedItem?.title || `Item #${request.requested_item_id}`;

  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-soft">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-muted">{direction}</p>
          <h3 className="mt-1 truncate text-lg font-semibold">
            {offeredTitle} -&gt; {requestedTitle}
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-surface px-2 py-1 text-xs font-semibold text-muted">
            {request.status}
          </span>
          {finalLabel ? (
            <span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-brand">
              {finalLabel}
            </span>
          ) : null}
        </div>
        {active && latestOfferByCurrentUser ? (
          <p className="basis-full text-sm text-muted sm:text-right">
            Waiting for response
          </p>
        ) : null}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ItemPreview label="Offered item" item={offeredItem} fallbackId={request.offered_item_id} />
        <ItemPreview label="Requested item" item={requestedItem} fallbackId={request.requested_item_id} />
      </div>

      <div className="mt-4 rounded-md bg-surface p-3 text-sm">
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
                {loadingAction("accept") ? "Accepting..." : "Accept"}
              </Button>
              <Button
                variant="secondary"
                onClick={() => onAction(request.id, "reject")}
                disabled={anyActionLoading}
              >
                {loadingAction("reject") ? "Rejecting..." : "Reject"}
              </Button>
            </>
          ) : null}
          {canCancel ? (
            <Button
              variant="danger"
              onClick={() => onAction(request.id, "cancel")}
              disabled={anyActionLoading}
            >
              {loadingAction("cancel") ? "Cancelling..." : "Cancel"}
            </Button>
          ) : null}
          {canCounter ? (
            anyActionLoading ? (
              <Button variant="secondary" disabled>
                Counter
              </Button>
            ) : (
              <Link to={`/exchange-requests/${request.id}/counter`}>
                <Button variant="secondary">Counter</Button>
              </Link>
            )
          ) : null}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">
          This request is {finalLabel?.toLowerCase() || request.status}.
        </p>
      )}
    </article>
  );
}

function ItemPreview({ label, item, fallbackId }) {
  const image = resolveMediaUrl(item?.images?.[0]?.image_url);

  return (
    <div className="flex gap-3 rounded-md border border-line bg-white p-3">
      <div className="h-24 w-24 shrink-0 overflow-hidden rounded-md bg-slate-100">
        {image ? (
          <img src={image} alt={item.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-muted">
            No image
          </div>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold uppercase text-muted">{label}</p>
        <h4 className="font-semibold">{item?.title || `Item #${fallbackId}`}</h4>
        {item ? (
          <p className="text-sm text-muted">
            {item.category} - {item.condition} - {item.city}
          </p>
        ) : (
          <p className="text-sm text-muted">Details unavailable</p>
        )}
      </div>
    </div>
  );
}

function exchangeActionSuccessMessage(action) {
  const messages = {
    accept: "Exchange request accepted.",
    reject: "Exchange request rejected.",
    cancel: "Exchange request cancelled.",
  };
  return messages[action] || "Exchange request updated.";
}
