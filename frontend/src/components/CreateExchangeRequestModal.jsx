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
import { categoryLabel, conditionLabel } from "../utils/labels.js";

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
      const message = "Оберіть одну зі своїх доступних речей для пропозиції.";
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
      toast.success("Запит на обмін створено.");
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
      <div className="mx-auto max-w-3xl rounded-2xl border border-line bg-white shadow-soft">
        <div className="border-b border-line p-5">
          <h2 className="text-xl font-bold text-gray-900">Створити запит на обмін</h2>
          <p className="text-sm text-muted">
            Оберіть одну зі своїх доступних речей для пропозиції.
          </p>
        </div>

        <form onSubmit={submit} className="space-y-5 p-5">
          <section className="rounded-2xl bg-surface p-4">
            <p className="text-xs font-semibold uppercase text-muted">Запитувана річ</p>
            <h3 className="mt-1 font-semibold">{requestedItem.title}</h3>
            <p className="text-sm text-muted">
              {categoryLabel(requestedItem.category)} - {conditionLabel(requestedItem.condition)} - {requestedItem.city}
            </p>
            {requestedItem.desired_exchange ? (
              <p className="mt-1 text-sm">
                Власник хоче{" "}
                <span className="font-medium">{requestedItem.desired_exchange}</span>
              </p>
            ) : null}
          </section>

          <ErrorState message={error} />

          {loading ? (
            <LoadingState label="Завантаження ваших доступних речей..." />
          ) : availableItems.length ? (
            <section>
              <p className="mb-3 text-sm font-semibold">Ваші доступні речі</p>
              <div className="grid gap-3 sm:grid-cols-2">
                {availableItems.map((item) => {
                  const image = resolveMediaUrl(item.images?.[0]?.image_url);
                  const selected = String(selectedItemId) === String(item.id);

                  return (
                    <label
                      key={item.id}
                      className={`cursor-pointer rounded-2xl border p-3 transition hover:-translate-y-0.5 hover:shadow-md ${
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
                        <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
                          {image ? (
                            <img
                              src={image}
                              alt={item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center px-2 text-center text-xs text-muted">
                              Без фото
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate font-semibold">{item.title}</p>
                          <p className="text-sm text-muted">
                            {categoryLabel(item.category)} - {conditionLabel(item.condition)} - {item.city}
                          </p>
                          {item.desired_exchange ? (
                            <p className="mt-1 line-clamp-1 text-sm text-muted">
                              Хоче {item.desired_exchange}
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
            <div className="rounded-2xl border border-line bg-white p-4 text-sm text-muted">
              У вас поки немає доступних речей для пропозиції.
            </div>
          )}

          <section className="grid gap-4 md:grid-cols-2">
            <div>
              <label>Сума доплати</label>
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
              <label>Хто доплачує</label>
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
                  Будь ласка, виберіть, хто доплачує різницю.
                </p>
              ) : null}
            </div>
            <div className="md:col-span-2">
              <label>Повідомлення</label>
              <textarea
                rows="3"
                value={offer.message}
                onChange={(event) => setOffer({ ...offer, message: event.target.value })}
                placeholder="Додайте повідомлення для власника"
              />
            </div>
          </section>

          <div className="flex flex-col gap-2 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              {selectedItem
                ? `Пропонуєте: ${selectedItem.title}`
                : "Оберіть річ перед надсиланням."}
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Скасувати
              </Button>
              <Button
                type="submit"
                disabled={submitting || loading || !availableItems.length}
              >
                {submitting ? "Створення..." : "Створити запит"}
              </Button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
