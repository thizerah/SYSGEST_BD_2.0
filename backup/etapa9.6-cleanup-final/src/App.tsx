import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useLocation, Outlet } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { DataContextComposed } from "./context/DataContextComposed";
import { useAuth } from "./context/useAuth";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { Skeleton } from "./components/ui/skeleton";

// Componente para rotas protegidas que exigem autenticação
const ProtectedRoute = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mostrar indicador de carregamento enquanto verifica a autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-6 space-y-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-32 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
        </div>
      </div>
    );
  }

  // Redirecionar para login se não estiver autenticado
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

// Componente para rotas que só devem ser acessadas quando não autenticado
const PublicRoute = () => {
  const { user, loading } = useAuth();
  
  // Mostrar indicador de carregamento enquanto verifica a autenticação
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-full max-w-md p-6 space-y-4">
          <Skeleton className="h-8 w-3/4 mx-auto" />
          <Skeleton className="h-6 w-1/2 mx-auto" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }
  
  // Redirecionar para dashboard se já estiver autenticado
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <Outlet />;
};

const queryClient = new QueryClient();

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/" element={<Index />} />
      
      {/* Rotas públicas - acessíveis apenas quando não logado */}
      <Route element={<PublicRoute />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
      </Route>
      
      {/* Rotas protegidas - requerem autenticação */}
      <Route element={<ProtectedRoute />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DataContextComposed>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </DataContextComposed>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
