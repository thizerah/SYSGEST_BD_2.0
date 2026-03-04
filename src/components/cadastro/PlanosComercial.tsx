import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/context/useAuth";
import { Wifi, Smartphone, Plus, Pencil, Power, PowerOff } from "lucide-react";
import {
  fetchPlanosFibraAll,
  fetchPlanosMovelAll,
  insertPlanoFibra,
  updatePlanoFibra,
  insertPlanoMovel,
  updatePlanoMovel,
} from "@/lib/cadastro-comercial";
import { sanitizarPrecoInput, formatarPrecoParaExibicao, parsePrecoFormatado, precoFormatadoParaEdicao } from "@/utils/moeda";
import type { PlanoFibra, PlanoMovel } from "@/types";

function PlanosFibraTab() {
  const { authExtras, user } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;

  const [planos, setPlanos] = useState<PlanoFibra[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlanoFibra | null>(null);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [velocidade, setVelocidade] = useState("");
  const [precoMensal, setPrecoMensal] = useState("");
  const [descricao, setDescricao] = useState("");
  const [beneficios, setBeneficios] = useState("");

  const load = async () => {
    if (!donoUserId) return;
    try {
      const data = await fetchPlanosFibraAll(donoUserId);
      setPlanos(data);
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar planos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [donoUserId]);

  const resetForm = () => {
    setEditing(null);
    setNome("");
    setVelocidade("");
    setPrecoMensal("");
    setDescricao("");
    setBeneficios("");
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: PlanoFibra) => {
    setEditing(p);
    setNome(p.nome);
    setVelocidade(p.velocidade?.toString() ?? "");
    setPrecoMensal(p.preco_mensal != null ? formatarPrecoParaExibicao(p.preco_mensal.toString()) : "");
    setDescricao(p.descricao ?? "");
    setBeneficios(p.beneficios ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!donoUserId || !nome.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        nome: nome.trim(),
        velocidade: velocidade ? parseInt(velocidade, 10) : undefined,
        preco_mensal: parsePrecoFormatado(precoMensal),
        descricao: descricao.trim() || undefined,
        beneficios: beneficios.trim() || undefined,
        ativo: editing?.ativo ?? true,
      };
      if (editing) {
        await updatePlanoFibra(editing.id, payload);
        toast({ title: "Sucesso", description: "Plano atualizado." });
      } else {
        await insertPlanoFibra(donoUserId, payload);
        toast({ title: "Sucesso", description: "Plano criado." });
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao salvar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (p: PlanoFibra) => {
    try {
      await updatePlanoFibra(p.id, { ativo: !p.ativo });
      toast({ title: "Sucesso", description: p.ativo ? "Plano desativado." : "Plano reativado." });
      load();
    } catch {
      toast({ title: "Erro", description: "Falha ao atualizar.", variant: "destructive" });
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo plano
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Velocidade</TableHead>
            <TableHead>Preço/mês</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {planos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum plano cadastrado. Clique em &quot;Novo plano&quot; para criar.
              </TableCell>
            </TableRow>
          ) : (
            planos.map((p) => (
              <TableRow key={p.id} className={!p.ativo ? "opacity-60" : ""}>
                <TableCell>
                  <div>
                    <span className="font-medium">{p.nome}</span>
                    {p.descricao && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.descricao}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{p.velocidade ? `${p.velocidade} Mbps` : "-"}</TableCell>
                <TableCell>{p.preco_mensal != null ? `R$ ${p.preco_mensal.toFixed(2)}` : "-"}</TableCell>
                <TableCell>
                  <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleAtivo(p)}
                      title={p.ativo ? "Desativar" : "Reativar"}
                    >
                      {p.ativo ? <PowerOff className="h-4 w-4 text-amber-600" /> : <Power className="h-4 w-4 text-green-600" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plano FIBRA" : "Novo plano FIBRA"}</DialogTitle>
            <DialogDescription>Preencha os dados do plano.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="nome-fibra">Nome *</Label>
              <Input id="nome-fibra" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Fibra 300" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="velocidade">Velocidade (Mbps)</Label>
                <Input id="velocidade" type="number" value={velocidade} onChange={(e) => setVelocidade(e.target.value)} placeholder="300" />
              </div>
              <div>
                <Label htmlFor="preco-fibra">Preço mensal (R$)</Label>
                <Input
                  id="preco-fibra"
                  type="text"
                  value={precoMensal}
                  onChange={(e) => setPrecoMensal(sanitizarPrecoInput(e.target.value))}
                  onFocus={() => {
                    if (precoMensal && precoMensal.startsWith("R$")) {
                      setPrecoMensal(precoFormatadoParaEdicao(precoMensal));
                    }
                  }}
                  onBlur={() => {
                    if (precoMensal) {
                      setPrecoMensal(formatarPrecoParaExibicao(precoMensal));
                    }
                  }}
                  placeholder="R$ 0,00"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="descricao-fibra">Descrição</Label>
              <Input id="descricao-fibra" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Breve descrição" />
            </div>
            <div>
              <Label htmlFor="beneficios-fibra">Benefícios</Label>
              <Textarea id="beneficios-fibra" value={beneficios} onChange={(e) => setBeneficios(e.target.value)} placeholder="Um por linha" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PlanosMovelTab() {
  const { authExtras, user } = useAuth();
  const { toast } = useToast();
  const donoUserId = authExtras?.donoUserId ?? user?.id ?? null;

  const [planos, setPlanos] = useState<PlanoMovel[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PlanoMovel | null>(null);
  const [saving, setSaving] = useState(false);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [dadosGb, setDadosGb] = useState("");
  const [minutos, setMinutos] = useState("");
  const [sms, setSms] = useState("");
  const [precoMensal, setPrecoMensal] = useState("");
  const [beneficios, setBeneficios] = useState("");

  const load = async () => {
    if (!donoUserId) return;
    try {
      const data = await fetchPlanosMovelAll(donoUserId);
      setPlanos(data);
    } catch {
      toast({ title: "Erro", description: "Falha ao carregar planos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [donoUserId]);

  const resetForm = () => {
    setEditing(null);
    setNome("");
    setDescricao("");
    setDadosGb("");
    setMinutos("");
    setSms("");
    setPrecoMensal("");
    setBeneficios("");
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (p: PlanoMovel) => {
    setEditing(p);
    setNome(p.nome);
    setDescricao(p.descricao ?? "");
    setDadosGb(p.dados_gb?.toString() ?? "");
    setMinutos(p.minutos != null ? p.minutos.toString() : "Ilimitado");
    setSms(p.sms ?? "");
    setPrecoMensal(p.preco_mensal != null ? formatarPrecoParaExibicao(p.preco_mensal.toString()) : "");
    setBeneficios(p.beneficios ?? "");
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!donoUserId || !nome.trim()) {
      toast({ title: "Erro", description: "Nome é obrigatório.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const minutosVal = minutos.trim().toLowerCase();
      const minutosNum = minutosVal === "ilimitado" ? undefined : (() => {
        const n = parseInt(minutos, 10);
        return isNaN(n) ? undefined : n;
      })();
      const payload = {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        dados_gb: dadosGb ? parseInt(dadosGb, 10) : undefined,
        minutos: minutosNum,
        sms: sms.trim() || undefined,
        preco_mensal: parsePrecoFormatado(precoMensal),
        beneficios: beneficios.trim() || undefined,
        ativo: editing?.ativo ?? true,
      };
      if (editing) {
        await updatePlanoMovel(editing.id, payload);
        toast({ title: "Sucesso", description: "Plano atualizado." });
      } else {
        await insertPlanoMovel(donoUserId, payload);
        toast({ title: "Sucesso", description: "Plano criado." });
      }
      setDialogOpen(false);
      resetForm();
      load();
    } catch (err) {
      toast({
        title: "Erro",
        description: err instanceof Error ? err.message : "Falha ao salvar.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleAtivo = async (p: PlanoMovel) => {
    try {
      await updatePlanoMovel(p.id, { ativo: !p.ativo });
      toast({ title: "Sucesso", description: p.ativo ? "Plano desativado." : "Plano reativado." });
      load();
    } catch {
      toast({ title: "Erro", description: "Falha ao atualizar.", variant: "destructive" });
    }
  };

  if (loading) {
    return <p className="text-muted-foreground">Carregando...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openNew}>
          <Plus className="h-4 w-4 mr-2" />
          Novo plano
        </Button>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Dados</TableHead>
            <TableHead>Minutos</TableHead>
            <TableHead>Preço/mês</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="w-[100px]">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {planos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-muted-foreground">
                Nenhum plano cadastrado. Clique em &quot;Novo plano&quot; para criar.
              </TableCell>
            </TableRow>
          ) : (
            planos.map((p) => (
              <TableRow key={p.id} className={!p.ativo ? "opacity-60" : ""}>
                <TableCell>
                  <div>
                    <span className="font-medium">{p.nome}</span>
                    {p.descricao && (
                      <p className="text-xs text-muted-foreground truncate max-w-[200px]">{p.descricao}</p>
                    )}
                  </div>
                </TableCell>
                <TableCell>{p.dados_gb != null ? `${p.dados_gb} GB` : "-"}</TableCell>
                <TableCell>{p.minutos != null ? `${p.minutos} min` : "Ilimitado"}</TableCell>
                <TableCell>{p.preco_mensal != null ? `R$ ${p.preco_mensal.toFixed(2)}` : "-"}</TableCell>
                <TableCell>
                  <Badge variant={p.ativo ? "default" : "secondary"}>{p.ativo ? "Ativo" : "Inativo"}</Badge>
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(p)} title="Editar">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => toggleAtivo(p)}
                      title={p.ativo ? "Desativar" : "Reativar"}
                    >
                      {p.ativo ? <PowerOff className="h-4 w-4 text-amber-600" /> : <Power className="h-4 w-4 text-green-600" />}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Editar plano MÓVEL" : "Novo plano MÓVEL"}</DialogTitle>
            <DialogDescription>Preencha os dados do plano.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div>
              <Label htmlFor="nome-movel">Nome *</Label>
              <Input id="nome-movel" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Plano 10GB" />
            </div>
            <div>
              <Label htmlFor="descricao-movel">Descrição</Label>
              <Input id="descricao-movel" value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Breve descrição" />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dados-gb">Dados (GB)</Label>
                <Input id="dados-gb" type="number" value={dadosGb} onChange={(e) => setDadosGb(e.target.value)} placeholder="10" />
              </div>
              <div>
                <Label htmlFor="minutos">Minutos</Label>
                <Input id="minutos" type="text" value={minutos} onChange={(e) => setMinutos(e.target.value)} placeholder="100 ou Ilimitado" />
              </div>
              <div>
                <Label htmlFor="sms">SMS</Label>
                <Input id="sms" value={sms} onChange={(e) => setSms(e.target.value)} placeholder="Ilimitado" />
              </div>
            </div>
            <div>
              <Label htmlFor="preco-movel">Preço mensal (R$)</Label>
              <Input
                id="preco-movel"
                type="text"
                value={precoMensal}
                onChange={(e) => setPrecoMensal(sanitizarPrecoInput(e.target.value))}
                onFocus={() => {
                  if (precoMensal && precoMensal.startsWith("R$")) {
                    setPrecoMensal(precoFormatadoParaEdicao(precoMensal));
                  }
                }}
                onBlur={() => {
                  if (precoMensal) {
                    setPrecoMensal(formatarPrecoParaExibicao(precoMensal));
                  }
                }}
                placeholder="R$ 0,00"
              />
            </div>
            <div>
              <Label htmlFor="beneficios-movel">Benefícios</Label>
              <Textarea id="beneficios-movel" value={beneficios} onChange={(e) => setBeneficios(e.target.value)} placeholder="Um por linha" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? "Salvando…" : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function PlanosComercial() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Planos Comercial</CardTitle>
        <CardDescription>
          Gerencie os planos FIBRA e MÓVEL disponíveis para vendedores no cadastro comercial.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="fibra" className="space-y-4">
          <TabsList className="grid w-full max-w-[400px]" style={{ gridTemplateColumns: "1fr 1fr" }}>
            <TabsTrigger value="fibra" className="flex items-center gap-2">
              <Wifi className="h-4 w-4" />
              FIBRA
            </TabsTrigger>
            <TabsTrigger value="movel" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              MÓVEL
            </TabsTrigger>
          </TabsList>
          <TabsContent value="fibra" className="space-y-4">
            <PlanosFibraTab />
          </TabsContent>
          <TabsContent value="movel" className="space-y-4">
            <PlanosMovelTab />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
