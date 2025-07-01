import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface ResponsiveTableProps {
  children: React.ReactNode;
  className?: string;
  maxHeight?: string;
}

export function ResponsiveTable({ children, className, maxHeight = "400px" }: ResponsiveTableProps) {
  return (
    <div className="w-full">
      <ScrollArea className={cn("w-full rounded-md border", className)} style={{ maxHeight }}>
        <div className="min-w-full overflow-x-auto">
          <Table className="w-full">
            {children}
          </Table>
        </div>
      </ScrollArea>
    </div>
  );
}

// Componentes específicos para mobile
interface MobileCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function MobileCard({ title, children, className }: MobileCardProps) {
  return (
    <div className={cn("border rounded-lg p-4 space-y-2", className)}>
      <h3 className="font-semibold text-sm text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

interface MobileFieldProps {
  label: string;
  value: React.ReactNode;
  className?: string;
}

export function MobileField({ label, value, className }: MobileFieldProps) {
  return (
    <div className={cn("flex justify-between items-center", className)}>
      <span className="text-xs text-gray-600">{label}:</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
} 