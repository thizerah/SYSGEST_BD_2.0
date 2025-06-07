import { DashboardHeader } from "@/components/dashboard/DashboardHeader";
import { MetricsOverview } from "@/components/dashboard/MetricsOverview";
import { ServiceOrderTable } from "@/components/dashboard/ServiceOrderTable";
import { Toaster } from "@/components/ui/toaster";
import { DataProvider } from "@/context/DataContext";

export default function Dashboard() {
  return (
    <DataProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-blue-100">
        <DashboardHeader />
        
        <div className="container-fluid px-2 py-2 space-y-4 max-w-[1920px] mx-auto">
          <MetricsOverview />
        </div>
        
        <Toaster />
      </div>
    </DataProvider>
  );
}
