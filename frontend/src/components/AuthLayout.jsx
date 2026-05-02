import { Link, Outlet } from "react-router-dom";

export function AuthLayout() {
  return (
    <div className="grid min-h-[calc(100vh-150px)] place-items-center px-4 py-10">
      <div className="w-full max-w-md">
        <Link to="/login" className="mb-6 block text-center text-2xl font-semibold">
          Smart Item Exchange
        </Link>
        <Outlet />
      </div>
    </div>
  );
}
