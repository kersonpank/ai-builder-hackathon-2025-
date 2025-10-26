import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Package, ShoppingCart, MessageSquare, TrendingUp, Plus, Upload, ShoppingBag, ExternalLink, Copy, Check, Key, Webhook } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [copiedChatLink, setCopiedChatLink] = useState(false);
  const [copiedCatalogLink, setCopiedCatalogLink] = useState(false);
  const [copiedWebhookUrl, setCopiedWebhookUrl] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);

  const { data: stats, isLoading } = useQuery<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    activeConversations: number;
  }>({
    queryKey: ["/api/stats"],
  });

  const { data: company } = useQuery<any>({
    queryKey: ["/api/company"],
  });

  const generateTokenMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/company/webhook-token/generate", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({ title: "Token gerado com sucesso!" });
    },
  });

  const toggleAuthMutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      return apiRequest("PATCH", "/api/company/webhook-auth", { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
    },
  });

  const quickActions = [
    {
      id: "add-product",
      title: "Adicionar Produto",
      description: "Cadastre novos produtos no catálogo",
      icon: Plus,
      href: "/products",
      variant: "default" as const,
    },
    {
      id: "import-products",
      title: "Importação em Massa",
      description: "Importe múltiplos produtos de uma vez",
      icon: Upload,
      href: "/products",
      variant: "outline" as const,
    },
    {
      id: "view-orders",
      title: "Ver Pedidos",
      description: "Gerencie pedidos e atualize status",
      icon: ShoppingCart,
      href: "/orders",
      variant: "outline" as const,
    },
    {
      id: "conversations",
      title: "Conversas",
      description: "Acompanhe conversas com clientes",
      icon: MessageSquare,
      href: "/conversations",
      variant: "outline" as const,
    },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Bem-vindo de volta{company ? `, ${company.name}` : ""}!
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? "..." : stats?.totalProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total no catálogo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? "..." : stats?.totalOrders || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Total de vendas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              R$ {isLoading ? "..." : ((stats?.totalRevenue || 0) / 100).toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Receita total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas Ativas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoading ? "..." : stats?.activeConversations || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Atendimentos em andamento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Ações Rápidas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.id} href={action.href}>
                  <Card className="hover-elevate transition-all cursor-pointer h-full">
                    <CardContent className="p-6 flex flex-col items-center text-center gap-3">
                      <div className="p-3 rounded-full bg-primary/10">
                        <Icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h3 className="font-semibold">{action.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {action.description}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Webhook Configuration */}
      {company && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Webhook className="w-5 h-5" />
              Conecte via Webhook
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>URL do Webhook</Label>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/api/chatweb/${company.id}/conversations`}
                  className="font-mono text-sm"
                  data-testid="text-webhook-url"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/api/chatweb/${company.id}/conversations`);
                    setCopiedWebhookUrl(true);
                    setTimeout(() => setCopiedWebhookUrl(false), 2000);
                  }}
                  data-testid="button-copy-webhook-url"
                >
                  {copiedWebhookUrl ? (
                    <><Check className="w-4 h-4 mr-2" /> Copiado</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copiar</>
                  )}
                </Button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="webhook-auth"
                checked={company.webhookAuthEnabled || false}
                onCheckedChange={(checked) => toggleAuthMutation.mutate(!!checked)}
                data-testid="checkbox-webhook-auth"
              />
              <Label
                htmlFor="webhook-auth"
                className="text-sm font-normal cursor-pointer"
              >
                Habilitar autenticação por Bearer Token (segurança adicional)
              </Label>
            </div>

            {company.webhookAuthEnabled && (
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label>Token de Segurança</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => generateTokenMutation.mutate()}
                    disabled={generateTokenMutation.isPending}
                    data-testid="button-generate-token"
                  >
                    <Key className="w-4 h-4 mr-2" />
                    {company.webhookToken ? "Regenerar" : "Gerar"} Token
                  </Button>
                </div>
                {company.webhookToken && (
                  <div className="flex gap-2">
                    <Input
                      readOnly
                      type="password"
                      value={company.webhookToken}
                      className="font-mono text-sm"
                      data-testid="text-webhook-token"
                    />
                    <Button
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(company.webhookToken);
                        setCopiedToken(true);
                        setTimeout(() => setCopiedToken(false), 2000);
                      }}
                      data-testid="button-copy-token"
                    >
                      {copiedToken ? (
                        <><Check className="w-4 h-4 mr-2" /> Copiado</>
                      ) : (
                        <><Copy className="w-4 h-4 mr-2" /> Copiar</>
                      )}
                    </Button>
                  </div>
                )}
                <p className="text-xs text-muted-foreground">
                  Use este token no header: <code className="bg-muted px-1 py-0.5 rounded">Authorization: Bearer TOKEN</code>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Links de Atendimento */}
      {company && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* ChatWeb Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                ChatWeb - Agente IA
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Link para conversar com o agente de IA
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/chat/${company.id}`}
                  className="font-mono text-sm"
                  data-testid="text-chatweb-url"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/chat/${company.id}`);
                    setCopiedChatLink(true);
                    setTimeout(() => setCopiedChatLink(false), 2000);
                  }}
                  data-testid="button-copy-chatweb-url"
                >
                  {copiedChatLink ? (
                    <><Check className="w-4 h-4 mr-2" /> Copiado</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copiar</>
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(`/chat/${company.id}`, '_blank')}
                data-testid="button-open-chatweb"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir ChatWeb
              </Button>
            </CardContent>
          </Card>

          {/* Catalog Link */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Catálogo de Produtos
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Link para o catálogo com carrinho de compras
              </p>
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={`${window.location.origin}/catalog/${company.id}`}
                  className="font-mono text-sm"
                  data-testid="text-catalog-url"
                />
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/catalog/${company.id}`);
                    setCopiedCatalogLink(true);
                    setTimeout(() => setCopiedCatalogLink(false), 2000);
                  }}
                  data-testid="button-copy-catalog-url"
                >
                  {copiedCatalogLink ? (
                    <><Check className="w-4 h-4 mr-2" /> Copiado</>
                  ) : (
                    <><Copy className="w-4 h-4 mr-2" /> Copiar</>
                  )}
                </Button>
              </div>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(`/catalog/${company.id}`, '_blank')}
                data-testid="button-open-catalog"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Abrir Catálogo
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
