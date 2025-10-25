import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Package, ShoppingCart, MessageSquare, TrendingUp, Plus, Upload } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
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

  const quickActions = [
    {
      title: "Adicionar Produto",
      description: "Cadastre novos produtos no catálogo",
      icon: Plus,
      href: "/products/new",
      variant: "default" as const,
    },
    {
      title: "Importar CSV",
      description: "Importe múltiplos produtos de uma vez",
      icon: Upload,
      href: "/products/import",
      variant: "outline" as const,
    },
    {
      title: "Ver Pedidos",
      description: "Gerencie pedidos e atualize status",
      icon: ShoppingCart,
      href: "/orders",
      variant: "outline" as const,
    },
    {
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
                <Link key={action.href} href={action.href}>
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

      {/* ChatWeb Link */}
      {company && (
        <Card>
          <CardHeader>
            <CardTitle>Link do ChatWeb</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Compartilhe este link com seus clientes para que eles possam conversar com seu agente de IA:
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
                }}
                data-testid="button-copy-url"
              >
                Copiar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
