import { Navigate, Route, Routes } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Header } from "./components/layout/Header";
import { Sidebar } from "./components/layout/Sidebar";
import { useAuth } from "./hooks/useAuth";
import Admin from "./pages/Admin";
import ApiKeys from "./pages/ApiKeys";
import Dashboard from "./pages/Dashboard";
import Library from "./pages/Library";
import Login from "./pages/Login";
import { useAuthStore } from "./stores/authStore";

function ProtectedShell() {
  const user = useAuthStore((state) => state.user);
  const { isLoading, isError } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="animate-spin" size={18} />
        加载中...
      </div>
    );
  }
  if (isError) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} />
        <main className="min-h-0 flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/library" element={<Library />} />
            <Route path="/api-keys" element={<ApiKeys />} />
            <Route path="/admin" element={user?.role === "admin" ? <Admin /> : <Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/*" element={<ProtectedShell />} />
    </Routes>
  );
}
