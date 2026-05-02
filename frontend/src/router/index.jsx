import { createBrowserRouter, Navigate } from "react-router-dom";

import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { AppLayout } from "../components/AppLayout.jsx";
import { AuthLayout } from "../components/AuthLayout.jsx";
import { AdminPage } from "../pages/AdminPage.jsx";
import { CounterOfferPage } from "../pages/CounterOfferPage.jsx";
import { CreateItemPage } from "../pages/CreateItemPage.jsx";
import { DashboardPage } from "../pages/DashboardPage.jsx";
import { ExchangeRequestsPage } from "../pages/ExchangeRequestsPage.jsx";
import { ItemDetailsPage } from "../pages/ItemDetailsPage.jsx";
import { ItemsPage } from "../pages/ItemsPage.jsx";
import { LoginPage } from "../pages/LoginPage.jsx";
import { ProfilePage } from "../pages/ProfilePage.jsx";
import { RegisterPage } from "../pages/RegisterPage.jsx";

export const router = createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      { path: "/", element: <Navigate to="/login" replace /> },
      { path: "/items", element: <ItemsPage /> },
      { path: "/items/:itemId", element: <ItemDetailsPage /> },
      {
        element: <AuthLayout />,
        children: [
          { path: "/login", element: <LoginPage /> },
          { path: "/register", element: <RegisterPage /> },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/dashboard", element: <DashboardPage /> },
          { path: "/admin", element: <AdminPage /> },
          { path: "/items/new", element: <CreateItemPage /> },
          { path: "/exchange-requests", element: <ExchangeRequestsPage /> },
          {
            path: "/exchange-requests/:requestId/counter",
            element: <CounterOfferPage />,
          },
          { path: "/profile", element: <ProfilePage /> },
        ],
      },
    ],
  },
]);
