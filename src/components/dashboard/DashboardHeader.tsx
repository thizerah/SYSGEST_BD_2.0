import { useAuth } from "@/context/useAuth";
import { Button } from "@/components/ui/button";
import { LayoutDashboard, Menu, CloudDownload, LogOut } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { useState, useEffect } from "react";
import { DataMigrationPanel } from "./DataMigrationPanel";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DashboardHeader() {
  const { user, logout } = useAuth();
  const { getSetting, reloadSettings } = useSystemSettings();
  const headerMessage = getSetting("header_message", "Novas atualizações em breve");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      reloadSettings();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [reloadSettings]);

  return (
    <header className="border-b border-border bg-background shadow-sm">
      <div className="flex items-center justify-between gap-3 px-3 py-2.5 sm:px-4 md:px-6 md:py-3">
        <div className="flex min-w-0 flex-shrink-0 items-center gap-3 sm:gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/50">
            <LayoutDashboard className="h-5 w-5 text-primary" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-foreground sm:text-xl md:text-2xl">
              Sysnex
            </h1>
            <p className="hidden text-xs text-muted-foreground sm:block sm:text-sm">
              Sistema de gestão de métricas e insights
            </p>
          </div>
        </div>

        <div className="hidden min-w-0 flex-1 justify-center sm:flex sm:max-w-xl sm:px-4">
          <div
            className="flex w-full items-center gap-2 rounded-lg border border-amber-200/90 bg-amber-50/95 px-3 py-2 text-amber-950 shadow-sm dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100"
            role="status"
          >
            <span className="line-clamp-2 text-center text-xs font-medium leading-snug sm:text-sm">
              {headerMessage}
            </span>
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-2">
          <div className="hidden md:flex">
            <div className="flex max-w-[min(100vw-24rem,32rem)] items-center gap-3 rounded-xl border border-border bg-card px-3 py-2.5 shadow-sm">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                {(user?.name || "U").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 space-y-0.5 text-sm text-foreground">
                <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5">
                  <span className="text-muted-foreground">Usuário</span>
                  <span className="truncate font-medium">{user?.name ?? "—"}</span>
                </div>
                <div className="flex flex-wrap items-baseline gap-x-1 gap-y-0.5 text-xs">
                  <span className="text-muted-foreground">Empresa</span>
                  <span className="truncate text-foreground/90">{user?.empresa ?? "—"}</span>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Último acesso: {new Date().toLocaleDateString("pt-BR")}{" "}
                  {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1 border-l border-border pl-2">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs font-medium">
                      <CloudDownload className="h-3.5 w-3.5" />
                      Migrar
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto">
                    <DialogHeader className="border-b border-border pb-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted">
                          <CloudDownload className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <DialogTitle className="text-xl font-semibold text-foreground">
                            Migração de Dados para a Nuvem
                          </DialogTitle>
                          <DialogDescription className="mt-1 text-sm text-muted-foreground">
                            Transfira seus dados do localStorage para o Supabase de forma segura
                          </DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="pt-4">
                      <DataMigrationPanel />
                    </div>
                  </DialogContent>
                </Dialog>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-xs font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={logout}
                >
                  Sair
                </Button>
              </div>
            </div>
          </div>

          <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Abrir menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[85vw] flex-col border-l bg-background p-0 sm:w-[400px]">
              <SheetHeader className="border-b border-border px-4 py-4 text-left">
                <SheetTitle className="text-foreground">Menu do usuário</SheetTitle>
                <SheetDescription className="text-muted-foreground">
                  Informações da conta e sessão
                </SheetDescription>
              </SheetHeader>
              <div className="flex flex-col gap-4 px-4 py-4">
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-muted-foreground">Nome</span>
                    <br />
                    <span className="font-medium text-foreground">{user?.name ?? "—"}</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Empresa</span>
                    <br />
                    <span className="font-medium text-foreground">{user?.empresa ?? "—"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {new Date().toLocaleDateString("pt-BR")} ·{" "}
                    {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={() => {
                    setIsMenuOpen(false);
                    logout();
                  }}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
