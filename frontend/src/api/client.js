import axios from "axios";

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function getErrorMessage(error) {
  const message =
    error?.response?.data?.message ||
    Object.values(error?.response?.data?.errors || {})?.flat()?.[0] ||
    "Something went wrong";

  if (
    typeof message === "string" &&
    message.includes("cash_adjustment_direction")
  ) {
    return "Please choose who pays the cash adjustment.";
  }

  return message;
}

export function resolveMediaUrl(url) {
  if (!url) return "";
  if (/^https?:\/\//i.test(url) || url.startsWith("blob:") || url.startsWith("data:")) {
    return url;
  }
  return `${API_BASE_URL.replace(/\/$/, "")}/${url.replace(/^\//, "")}`;
}
