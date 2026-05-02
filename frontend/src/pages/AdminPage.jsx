import { useEffect, useState } from "react";

import { api, getErrorMessage } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage.jsx";

export function AdminPage() {
  const [users, setUsers] = useState([]);
  const [items, setItems] = useState([]);
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");

  const load = async () => {
    setError("");
    setLoading(true);
    try {
      const [usersResponse, itemsResponse, requestsResponse] = await Promise.all([
        api.get("/admin/users"),
        api.get("/admin/items"),
        api.get("/admin/exchange-requests"),
      ]);
      setUsers(usersResponse.data.users || []);
      setItems(itemsResponse.data.items || []);
      setRequests(requestsResponse.data.exchange_requests || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const deleteItem = async (itemId) => {
    setActionLoading(`delete-${itemId}`);
    setError("");
    try {
      await api.delete(`/admin/items/${itemId}`);
      await load();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading("");
    }
  };

  const changeRole = async (userId, role) => {
    setActionLoading(`role-${userId}`);
    setError("");
    try {
      const response = await api.patch(`/admin/users/${userId}/role`, { role });
      setUsers((currentUsers) =>
        currentUsers.map((user) =>
          user.id === userId ? response.data.user : user
        )
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setActionLoading("");
    }
  };

  if (loading) return <LoadingState label="Loading admin panel..." />;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Admin panel"
        subtitle="Manage users, listings and exchange request visibility."
      />
      <ErrorState message={error} />

      <AdminSection title="Users">
        {users.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2">ID</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Provider</th>
                  <th>Role</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-t border-line">
                    <td className="py-3">{user.id}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>{user.auth_provider}</td>
                    <td>
                      <select
                        value={user.role}
                        disabled={actionLoading === `role-${user.id}`}
                        onChange={(event) => changeRole(user.id, event.target.value)}
                      >
                        <option value="user">user</option>
                        <option value="admin">admin</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No users found." />
        )}
      </AdminSection>

      <AdminSection title="Items">
        {items.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2">ID</th>
                  <th>Title</th>
                  <th>Owner</th>
                  <th>Status</th>
                  <th>City</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-line">
                    <td className="py-3">{item.id}</td>
                    <td>{item.title}</td>
                    <td>{item.user_id}</td>
                    <td>{item.status}</td>
                    <td>{item.city}</td>
                    <td>
                      <Button
                        variant="danger"
                        disabled={actionLoading === `delete-${item.id}`}
                        onClick={() => deleteItem(item.id)}
                      >
                        {actionLoading === `delete-${item.id}`
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No items found." />
        )}
      </AdminSection>

      <AdminSection title="Exchange requests">
        {requests.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase text-muted">
                <tr>
                  <th className="py-2">ID</th>
                  <th>Sender</th>
                  <th>Receiver</th>
                  <th>Offered</th>
                  <th>Requested</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((request) => (
                  <tr key={request.id} className="border-t border-line">
                    <td className="py-3">{request.id}</td>
                    <td>{request.sender_id}</td>
                    <td>{request.receiver_id}</td>
                    <td>{request.offered_item_id}</td>
                    <td>{request.requested_item_id}</td>
                    <td>{request.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState message="No exchange requests found." />
        )}
      </AdminSection>
    </div>
  );
}

function AdminSection({ title, children }) {
  return (
    <section className="rounded-lg border border-line bg-white p-5 shadow-soft">
      <h2 className="mb-4 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}
