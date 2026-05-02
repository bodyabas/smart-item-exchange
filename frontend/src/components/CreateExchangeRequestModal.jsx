import { useEffect, useMemo, useState } from "react";

import { api, getErrorMessage, resolveMediaUrl } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Button } from "./Button.jsx";
import { ErrorState, LoadingState } from "./StateMessage.jsx";
import {
  getCashDirectionOptions,
  normalizeCashDirection,
  validateCashAdjustment,
} from "../utils/cashAdjustment.js";

const initialOffer = {
  cash_adjustment_amount: 0,
  cash_adjustment_direction: "none",
  message: "",
};

export function CreateExchangeRequestModal({
  open,
  requestedItem,
  suggestedSourceItem,
  onClose,
  onSuccess,
}) {
  const { user, loadUser } = useAuth();
  const toast = useToast();
  const [availableItems, setAvailableItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [offer, setOffer] = useState(initialOffer);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !requestedItem) return;

    async function loadItems() {
      setLoading(true);
      setError("");
      setOffer(initialOffer);
      try {
        const currentUser = user || (await loadUser());
        const response = await api.get("/items", {
          params: { status: "available", limit: 100 },
        });
        const items = response.data.items.filter(
          (item) => item.user_id === currentUser.id && item.id !== requestedItem.id
        );
        setAvailableItems(items);

        const suggestedId =
          suggestedSourceItem &&
          items.some((item) => item.id === suggestedSourceItem.id)
            ? String(suggestedSourceItem.id)
            : "";
        setSelectedItemId(suggestedId);
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }

    loadItems();
  }, [open, requestedItem?.id, suggestedSourceItem?.id]);

  const selectedItem = useMemo(
    () => availableItems.find((item) => String(item.id) === String(selectedItemId)),
    [availableItems, selectedItemId]
  );
  const currentUserId = user?.id || availableItems[0]?.user_id;

  if (!open || !requestedItem) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!selectedItemId) {
      const message = "Select one of your available items to offer.";
      setError(message);
      toast.error(message);
      return;
    }

    const cashError = validateCashAdjustment(
      offer.cash_adjustment_amount,
      offer.cash_adjustment_direction
    );
    if (cashError) {
      setError(cashError);
      toast.error(cashError);
      return;
    }

    setSubmitting(true);
    try {
      const amount = Number(offer.cash_adjustment_amount || 0);
      await api.post("/exchange-requests", {
        offered_item_id: Number(selectedItemId),
        requested_item_id: requestedItem.id,
        cash_adjustment_amount: amount,
        cash_adjustment_direction: normalizeCashDirection(
          amount,
          offer.cash_adjustment_direction
        ),
        message: offer.message,
      });
      toast.success("Exchange request created.");
      onSuccess?.();
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 px-4 py-6">
      <div className="mx-auto max-w-3xl rounded-lg border border-line bg-white shadow-soft">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-semibold">Create exchange request</h2>
          <p className="text-sm text-muted">
            Choose one of your available items to offer.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5">
          <section className="rounded-md bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Requested item</p>
            <h3 className="mt-1 font-semibold">{requestedItem.title}</h3>
            <p className="text-sm text-muted">
              {requestedItem.category} - {requestedItem.condition} - {requestedItem.city}
            </p>
            {requestedItem.desired_exchange ? (
              <p className="mt-1 text-sm">
                Owner wants{" "}
                <span className="font-medium">{requestedItem.desired_exchange}</span>
              </p>
            ) : null}
          </section>

          <ErrorState message={error} />

          {loading ? (
            <LoadingState label="Loading your available items..." />
          ) : availableItems.length ? (
            <section>
              <p className="mb-3 text-sm font-semibold">Your available items</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {availableItems.map((item) => {
                  const image = resolveMediaUrl(item.images?.[0]?.image_url);
                  const selected = String(selectedItemId) === String(item.id);

                  return (
                    <label
                      key={item.id}
                      className={`cursor-pointer rounded-lg border p-3 transition ${
                        selected
                          ? "border-brand bg-teal-50 ring-2 ring-brand/20"
                          : "border-line bg-white hover:bg-surface"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          name="offered_item"
                          className="mt-1 w-auto"
                          value={item.id}
                          checked={selected}
                          onChange={(event) => setSelectedItemId(event.target.value)}
                        />
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-md bg-slate-100">
                          {image ? (
                            <img
                              src={image}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
                              No image
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{item.title}</p>
                          <p className="text-sm text-muted">
                            {item.category} - {item.condition} - {item.city}
                          </p>
                          {item.desired_exchange ? (
                            <p className="mt-1 line-clamp-1 text-sm text-muted">
                              Wants {item.desired_exchange}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className="rounded-md border border-line bg-white p-4 text-sm text-muted">
              You do not have available items to offer yet.
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <label>Cash adjustment amount</label>
              <input
                type="number"
                min="0"
                value={offer.cash_adjustment_amount}
                onChange={(event) =>
                  setOffer({ ...offer, cash_adjustment_amount: event.target.value })
                }
              />
            </div>
            <div>
              <label>Cash adjustment direction</label>
              <select
                value={offer.cash_adjustment_direction}
                onChange={(event) =>
                  setOffer({ ...offer, cash_adjustment_direction: event.target.value })
                }
              >
                {getCashDirectionOptions(
                  currentUserId,
                  currentUserId,
                  requestedItem.user_id
                ).map(
                  (option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  )
                )}
              </select>
              {Number(offer.cash_adjustment_amount || 0) > 0 &&
              offer.cash_adjustment_direction === "none" ? (
                <p className="mt-1 text-sm font-medium text-red-600">
                  Please choose who pays the cash adjustment.
                </p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <label>Message</label>
              <textarea
                rows="3"
                value={offer.message}
                onChange={(event) => setOffer({ ...offer, message: event.target.value })}
                placeholder="Add a note for the item owner"
              />
            </div>
          </section>

          <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {selectedItem
                ? `Offering ${selectedItem.title}`
                : "Select an item before submitting."}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={submitting || loading || !availableItems.length}
              >
                {submitting ? "Creating..." : "Create request"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
