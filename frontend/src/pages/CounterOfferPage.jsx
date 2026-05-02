import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { api, getErrorMessage } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { ErrorState } from "../components/StateMessage.jsx";

export function CounterOfferPage() {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    cash_adjustment_amount: 0,
    cash_adjustment_direction: "none",
    message: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post(`/exchange-requests/${requestId}/counter`, {
        ...form,
        cash_adjustment_amount: Number(form.cash_adjustment_amount || 0),
      });
      navigate("/exchange-requests");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

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
            <option value="none">None</option>
            <option value="sender_pays">Sender pays</option>
            <option value="receiver_pays">Receiver pays</option>
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
