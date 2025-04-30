import { useAuth } from "@/context/auth";
import { Navigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import Dashboard from "./Dashboard";
import Login from "./Login";

const Index = () => {
  const { user, loading } = useAuth();

  // Loading state
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

  // If authenticated, show dashboard
  // If not authenticated, show login
  return user ? <Dashboard /> : <Login />;
};

export default Index;
