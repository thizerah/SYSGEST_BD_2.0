import { LoginForm } from "@/components/auth/LoginForm";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { BarChart3, Shield } from "lucide-react";

export default function Login() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-muted/70 via-background to-muted/50 px-4 py-10">
      <div className="relative w-full max-w-[420px]">
        <div className="mb-8 flex items-center justify-center gap-3">
          <div className="rounded-lg bg-slate-800 p-2 shadow-sm">
            <BarChart3 className="size-7 text-white" aria-hidden />
          </div>
          <div className="flex items-center gap-2">
            <Shield className="size-7 text-slate-700" aria-hidden />
            <span className="text-2xl font-semibold tracking-tight text-slate-900">
              Sysnex
            </span>
          </div>
        </div>

        <Card className="border-border/80 bg-card/95 shadow-lg backdrop-blur-sm">
          <CardHeader className="space-y-1 border-b border-border/60 pb-6 pt-7 text-center">
            <CardTitle className="text-xl font-semibold text-foreground">
              Acesse sua conta
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              Informe seu e-mail e senha.
            </CardDescription>
          </CardHeader>
          <LoginForm />
        </Card>
      </div>
    </div>
  );
}
