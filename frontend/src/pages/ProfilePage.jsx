import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import { api, getErrorMessage, resolveMediaUrl } from "../api/client.js";
import { Button } from "../components/Button.jsx";
import { ItemCard } from "../components/ItemCard.jsx";
import { PageHeader } from "../components/PageHeader.jsx";
import { PasswordField } from "../components/PasswordField.jsx";
import { EmptyState, ErrorState, LoadingState } from "../components/StateMessage.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import {
  buildImageFormData,
  createPreviewUrl,
  validateImageFile,
} from "../utils/imageUpload.js";

export function ProfilePage() {
  const { user, loadUser } = useAuth();
  const toast = useToast();
  const [form, setForm] = useState({ name: "", avatar_url: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [availableItems, setAvailableItems] = useState([]);
  const [exchangedItems, setExchangedItems] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ new_password: "" });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadProfile = async () => {
    setError("");
    setLoading(true);
    try {
      const currentUser = await loadUser();
      setForm({
        name: currentUser.name || "",
        avatar_url: currentUser.avatar_url || "",
      });
      setAvatarPreview(resolveMediaUrl(currentUser.avatar_url));

      const [availableResponse, exchangedResponse] = await Promise.all([
        api.get("/items", { params: { status: "available", limit: 100 } }),
        api.get("/items", { params: { status: "exchanged", limit: 100 } }),
      ]);

      setAvailableItems(
        availableResponse.data.items.filter((item) => item.user_id === currentUser.id)
      );
      setExchangedItems(
        exchangedResponse.data.items.filter((item) => item.user_id === currentUser.id)
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await api.put("/users/me", form);
      if (avatarFile) {
        await api.post("/uploads/avatar", buildImageFormData(avatarFile));
        toast.success("Avatar uploaded successfully.");
      }
      setAvatarFile(null);
      await loadProfile();
      toast.success("Profile saved.");
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  const selectAvatar = (event) => {
    const file = event.target.files?.[0];
    const validationError = validateImageFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }
    setError("");
    setAvatarFile(file);
    setAvatarPreview(createPreviewUrl(file) || resolveMediaUrl(form.avatar_url));
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setError("");
    setPasswordSaving(true);
    try {
      await api.post("/auth/set-password", passwordForm);
      setPasswordForm({ new_password: "" });
      await loadProfile();
      toast.success("Password has been set successfully.");
    } catch (err) {
      const message = getErrorMessage(err);
      setError(message);
      toast.error(message);
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) return <LoadingState label="Loading profile..." />;

  return (
    <div>
      <PageHeader
        title="Profile"
        subtitle="Manage your profile and item inventory."
        action={
          <Link to="/items/new">
            <Button>Add item</Button>
          </Link>
        }
      />
      <ErrorState message={error} />

      <section className="mb-8 grid gap-5 rounded-lg border border-line bg-white p-5 shadow-soft lg:grid-cols-[auto_1fr]">
        <Avatar user={user} name={form.name} avatarUrl={avatarPreview} />
        <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
          <div>
            <label>Name</label>
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
            />
          </div>
          <div className="space-y-2">
            <label>Avatar image</label>
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectAvatar} />
            {avatarFile ? (
              <p className="text-sm text-muted">Selected: {avatarFile.name}</p>
            ) : null}
          </div>
          <div className="md:col-span-2">
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save profile"}
            </Button>
          </div>
        </form>
      </section>

      {user?.has_password === false ? (
        <section className="mb-8 rounded-lg border border-line bg-white p-5 shadow-soft">
          <div className="mb-4">
            <h2 className="text-lg font-semibold">Set password</h2>
            <p className="text-sm text-muted">
              Add a password so you can log in with email and password as well as Google.
            </p>
          </div>
          <form onSubmit={submitPassword} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <PasswordField
              label="New password"
              value={passwordForm.new_password}
              autoComplete="new-password"
              onChange={(event) =>
                setPasswordForm({ new_password: event.target.value })
              }
            />
            <Button type="submit" disabled={passwordSaving}>
              {passwordSaving ? "Setting..." : "Set password"}
            </Button>
          </form>
          <p className="mt-3 text-sm text-muted">
            Use at least 8 characters with at least one letter and one number.
          </p>
        </section>
      ) : null}

      <InventorySection
        title="My available items"
        emptyMessage="You do not have available items yet."
        items={availableItems}
      />
      <InventorySection
        title="My exchanged items"
        emptyMessage="No exchanged items yet."
        items={exchangedItems}
      />
    </div>
  );
}

function Avatar({ user, name, avatarUrl }) {
  const initials = (name || user?.email || "?")
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex flex-col items-center gap-3 text-center">
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name || "Profile avatar"}
          className="h-28 w-28 rounded-full object-cover"
        />
      ) : (
        <div className="grid h-28 w-28 place-items-center rounded-full bg-teal-50 text-2xl font-semibold text-brand">
          {initials}
        </div>
      )}
      <div>
        <p className="font-semibold">{name || user?.email}</p>
        <p className="text-sm text-muted">{user?.email}</p>
      </div>
    </div>
  );
}

function InventorySection({ title, emptyMessage, items }) {
  return (
    <section className="mb-8">
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {items.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState message={emptyMessage} />
      )}
    </section>
  );
}
