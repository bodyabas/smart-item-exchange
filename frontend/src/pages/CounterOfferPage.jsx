import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, getErrorMessage } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { ErrorState, LoadingState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  getCashDirectionOptions,
  normalizeCashDirection,
  validateCashAdjustment,
} from "../utils/cashAdjustment.js";

export function CounterOfferPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const { user, loadUser } = useAuth();
  const toast = useToast();
  const [exchangeRequest, setExchangeRequest] = useState(null);
  const [form, setForm] = useState({
    cash_adjustment_amount: 0,
    cash_adjustment_direction: "none",
    message: "",
  });
  const [originalTerms, setOriginalTerms] = useState({
    cash_adjustment_amount: 0,
    cash_adjustment_direction: "none",
  });
  const [error, setError] = useState("");
  const [loadingRequest, setLoadingRequest] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadRequest() {
      setError("");
      setLoadingRequest(true);
      try {
        await loadUser();
        const response = await api.get(`/exchange-requests/${requestId}`);
        const request = response.data.exchange_request;
        const currentTerms = request.latest_offer || request;
        const initialAmount = Number(currentTerms.cash_adjustment_amount || 0);
        const initialDirection = currentTerms.cash_adjustment_direction || "none";
        setExchangeRequest(request);
        setOriginalTerms({
          cash_adjustment_amount: initialAmount,
          cash_adjustment_direction: initialDirection,
        });
        setForm({
          cash_adjustment_amount: initialAmount,
          cash_adjustment_direction: initialDirection,
          message: "",
        });
      } catch (err) {
        const message = getErrorMessage(err);
        setError(message);
        toast.error(message);
      } finally {
        setLoadingRequest(false);
      }
    }

    loadRequest();
  }, [requestId]);

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const cashError = validateCashAdjustment(
      form.cash_adjustment_amount,
      form.cash_adjustment_direction
    );
    if (cashError) {
      toast.error(cashError);
      return;
    }

    const amount = Number(form.cash_adjustment_amount || 0);
    const direction = normalizeCashDirection(amount, form.cash_adjustment_direction);
    const originalAmount = Number(originalTerms.cash_adjustment_amount || 0);
    const originalDirection = normalizeCashDirection(
      originalAmount,
      originalTerms.cash_adjustment_direction
    );

    if (amount === originalAmount && direction === originalDirection) {
      toast.error(
        "Please change at least one offer term before sending a counter-offer."
      );
      return;
    }

    setLoading(true);
    try {
      await api.post(`/exchange-requests/${requestId}/counter`, {
        ...form,
        cash_adjustment_amount: amount,
        cash_adjustment_direction: direction,
      });
      toast.success("Counter-offer sent.");
      navigate("/exchange-requests");
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  if (loadingRequest) return <LoadingState label="Loading counter-offer..." />;

  return (
    <div>
      <PageHeader title="Counter-offer" subtitle={`Negotiate request #${requestId}`} />
      <ErrorState message={error} />
      <form onSubmit={submit} className="max-w-xl space-y-4 rounded-lg border border-line bg-white p-5 shadow-soft">
        <div>
          <label>Cash adjustment amount</label>
          <input type="number" min="0" value={form.cash_adjustment_amount} onChange={(event) => setForm({ ...form, cash_adjustment_amount: event.target.value })} />
        </div>
        <div>
          <label>Cash adjustment direction</label>
          <select value={form.cash_adjustment_direction} onChange={(event) => setForm({ ...form, cash_adjustment_direction: event.target.value })}>
            {getCashDirectionOptions(
              user?.id,
              exchangeRequest?.sender_id,
              exchangeRequest?.receiver_id
            ).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label>Message</label>
          <textarea rows="4" value={form.message} onChange={(event) => setForm({ ...form, message: event.target.value })} />
        </div>
        <Button type="submit" disabled={loading}>{loading ? "Sending..." : "Send counter-offer"}</Button>
      </form>
    </div>
  );
}
