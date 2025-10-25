import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Bot, Upload, Sparkles, Target, TrendingUp, MessageSquare, FileText, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { Agent } from "@shared/schema";

type SellerPersonality = "passive" | "balanced" | "proactive";

const personalityOptions = [
  {
    value: "passive" as SellerPersonality,
    title: "Consultor Passivo",
    description: "Responde perguntas de forma educada e aguarda o cliente tomar a iniciativa",
    icon: MessageSquare,
    color: "bg-blue-500/10 border-blue-500/20 hover:border-blue-500/40",
    iconColor: "text-blue-600",
    characteristics: ["Aguarda o cliente perguntar", "Respostas diretas e objetivas", "Não sugere produtos ativamente"]
  },
  {
    value: "balanced" as SellerPersonality,
    title: "Vendedor Equilibrado",
    description: "Mostra benefícios e recomenda produtos quando relevante, sem forçar venda",
    icon: Target,
    color: "bg-purple-500/10 border-purple-500/20 hover:border-purple-500/40",
    iconColor: "text-purple-600",
    characteristics: ["Sugere produtos relacionados", "Destaca benefícios principais", "Respeita o ritmo do cliente"]
  },
  {
    value: "proactive" as SellerPersonality,
    title: "Vendedor Proativo",
    description: "Vai atrás do cliente, destaca benefícios, cria urgência e busca fechar vendas",
    icon: TrendingUp,
    color: "bg-green-500/10 border-green-500/20 hover:border-green-500/40",
    iconColor: "text-green-600",
    characteristics: ["Cria senso de urgência", "Oferece upsell e cross-sell", "Argumenta ativamente"]
  }
];

export default function Agent() {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const { data: agent, isLoading } = useQuery<Agent>({
    queryKey: ["/api/agent"],
  });

  const [formData, setFormData] = useState({
    name: agent?.name || "",
    toneOfVoice: agent?.toneOfVoice || "",
    sellerPersonality: (agent?.sellerPersonality || "balanced") as SellerPersonality,
    customInstructions: agent?.customInstructions || "",
    salesGoals: agent?.salesGoals || "",
    productFocusStrategy: agent?.productFocusStrategy || "",
    responseStyle: agent?.responseStyle || ""
  });

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Agent>) => {
      const response = await apiRequest("PATCH", "/api/agent", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/agent"] });
      toast({ title: "Configurações salvas com sucesso!" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao salvar configurações" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleDocumentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("documents", files[i]);
      }

      const response = await fetch("/api/agent/documents", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Erro ao enviar documentos");

      await queryClient.invalidateQueries({ queryKey: ["/api/agent"] });
      toast({ title: "Documentos enviados com sucesso!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao enviar documentos" });
    } finally {
      setUploading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="text-center py-12 text-muted-foreground">Carregando configurações...</div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Configuração do Agente</h1>
        <p className="text-muted-foreground mt-2">
          Configure a personalidade e comportamento do seu assistente de vendas
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Seller Personality Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="w-5 h-5" />
              Personalidade do Vendedor
            </CardTitle>
            <CardDescription>
              Escolha como o agente deve se comportar nas conversas com clientes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              {personalityOptions.map((option) => {
                const Icon = option.icon;
                const isSelected = formData.sellerPersonality === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, sellerPersonality: option.value })}
                    className={`relative p-6 rounded-lg border-2 transition-all text-left ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : option.color
                    }`}
                    data-testid={`personality-${option.value}`}
                  >
                    {isSelected && (
                      <div className="absolute top-3 right-3">
                        <div className="bg-primary text-primary-foreground rounded-full p-1">
                          <Check className="w-3 h-3" />
                        </div>
                      </div>
                    )}
                    <div className={`w-12 h-12 rounded-lg ${option.color} flex items-center justify-center mb-4`}>
                      <Icon className={`w-6 h-6 ${option.iconColor}`} />
                    </div>
                    <h3 className="font-semibold text-base mb-2">{option.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{option.description}</p>
                    <div className="space-y-1">
                      {option.characteristics.map((char, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <div className="w-1 h-1 rounded-full bg-muted-foreground" />
                          {char}
                        </div>
                      ))}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Configurações Básicas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Nome do Agente</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="ex: Ana - Assistente de Vendas"
                  data-testid="input-agent-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toneOfVoice">Tom de Voz</Label>
                <Select
                  value={formData.toneOfVoice}
                  onValueChange={(value) => setFormData({ ...formData, toneOfVoice: value })}
                >
                  <SelectTrigger data-testid="select-tone">
                    <SelectValue placeholder="Selecione o tom" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Empático">Empático</SelectItem>
                    <SelectItem value="Divertido">Divertido</SelectItem>
                    <SelectItem value="Profissional">Profissional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customInstructions">Instruções Personalizadas</Label>
              <Textarea
                id="customInstructions"
                value={formData.customInstructions}
                onChange={(e) => setFormData({ ...formData, customInstructions: e.target.value })}
                placeholder="Adicione instruções específicas para o agente seguir..."
                rows={4}
                data-testid="textarea-instructions"
              />
              <p className="text-xs text-muted-foreground">
                Ex: "Sempre pergunte o tamanho antes de recomendar roupas" ou "Ofereça frete grátis para pedidos acima de R$ 150"
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Advanced Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Configurações Avançadas
            </CardTitle>
            <CardDescription>
              Defina objetivos e estratégias para otimizar o atendimento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="salesGoals">Objetivos de Vendas</Label>
              <Input
                id="salesGoals"
                value={formData.salesGoals}
                onChange={(e) => setFormData({ ...formData, salesGoals: e.target.value })}
                placeholder="ex: Aumentar ticket médio, Foco em upsell de acessórios"
                data-testid="input-sales-goals"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="productFocusStrategy">Estratégia de Produtos</Label>
              <Input
                id="productFocusStrategy"
                value={formData.productFocusStrategy}
                onChange={(e) => setFormData({ ...formData, productFocusStrategy: e.target.value })}
                placeholder="ex: Priorizar produtos em promoção, Destacar lançamentos"
                data-testid="input-product-focus"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responseStyle">Estilo de Resposta</Label>
              <Select
                value={formData.responseStyle || ""}
                onValueChange={(value) => setFormData({ ...formData, responseStyle: value })}
              >
                <SelectTrigger data-testid="select-response-style">
                  <SelectValue placeholder="Selecione o estilo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Respostas curtas (2-3 linhas)">Respostas curtas (2-3 linhas)</SelectItem>
                  <SelectItem value="Respostas médias (4-6 linhas)">Respostas médias (4-6 linhas)</SelectItem>
                  <SelectItem value="Respostas detalhadas (educativas)">Respostas detalhadas (educativas)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Context Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Documentos de Contexto
            </CardTitle>
            <CardDescription>
              Envie documentos (PDFs, TXTs) para dar mais contexto ao agente sobre seus produtos, políticas e processos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {agent?.contextDocuments && agent.contextDocuments.length > 0 && (
              <div className="space-y-2">
                <Label>Documentos Enviados</Label>
                <div className="flex flex-wrap gap-2">
                  {agent.contextDocuments.map((doc, idx) => (
                    <Badge key={idx} variant="secondary" className="gap-1.5">
                      <FileText className="w-3 h-3" />
                      Documento {idx + 1}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="documents" className="cursor-pointer">
                <div className="border-2 border-dashed rounded-lg p-8 hover-elevate transition-all text-center">
                  <Upload className="w-8 h-8 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-sm font-medium mb-1">
                    {uploading ? "Enviando..." : "Clique para enviar documentos"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, TXT, DOCX até 10MB cada
                  </p>
                </div>
                <Input
                  id="documents"
                  type="file"
                  multiple
                  accept=".pdf,.txt,.docx"
                  onChange={handleDocumentUpload}
                  className="hidden"
                  disabled={uploading}
                  data-testid="input-documents"
                />
              </Label>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium mb-2">💡 Dica: O que enviar?</p>
              <ul className="space-y-1 ml-4">
                <li>• Catálogo completo de produtos com detalhes técnicos</li>
                <li>• Políticas de troca, devolução e garantia</li>
                <li>• FAQ com perguntas frequentes dos clientes</li>
                <li>• Guia de tamanhos, cores e especificações</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Submit Button */}
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            disabled={updateMutation.isPending}
            data-testid="button-save"
          >
            {updateMutation.isPending ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </form>
    </div>
  );
}
