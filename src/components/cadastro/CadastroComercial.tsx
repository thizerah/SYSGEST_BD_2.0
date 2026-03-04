import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/useAuth";
import { Wifi, Smartphone, Satellite } from "lucide-react";
import { CadastroFibra } from "./CadastroFibra";
import { CadastroMovel } from "./CadastroMovel";
import { CadastroNovaParabolica } from "./CadastroNovaParabolica";

export function CadastroComercial() {
  const { hasPermissao } = useAuth();

  const podeFibra = hasPermissao("cadastro_fibra");
  const podeMovel = hasPermissao("cadastro_movel");
  const podeNovaParabolica = hasPermissao("cadastro_nova_parabolica");

  const abasDisponiveis = [
    { id: "fibra", label: "FIBRA", icon: Wifi, pode: podeFibra },
    { id: "movel", label: "MÓVEL", icon: Smartphone, pode: podeMovel },
    { id: "nova_parabolica", label: "Nova Parabólica", icon: Satellite, pode: podeNovaParabolica },
  ].filter((a) => a.pode);

  if (abasDisponiveis.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cadastro Comercial</CardTitle>
          <CardDescription>
            Você não tem permissão para acessar nenhum cadastro comercial.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Tabs defaultValue={abasDisponiveis[0].id} className="space-y-4">
      <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${abasDisponiveis.length}, 1fr)` }}>
        {abasDisponiveis.map((aba) => {
          const Icon = aba.icon;
          return (
            <TabsTrigger key={aba.id} value={aba.id} className="flex items-center gap-2">
              <Icon className="h-4 w-4" />
              {aba.label}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {podeFibra && (
        <TabsContent value="fibra" className="space-y-4">
          <CadastroFibra />
        </TabsContent>
      )}
      {podeMovel && (
        <TabsContent value="movel" className="space-y-4">
          <CadastroMovel />
        </TabsContent>
      )}
      {podeNovaParabolica && (
        <TabsContent value="nova_parabolica" className="space-y-4">
          <CadastroNovaParabolica />
        </TabsContent>
      )}
    </Tabs>
  );
}
