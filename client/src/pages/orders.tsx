import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ShoppingCart, Package, Truck, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Order } from "@shared/schema";

const statusConfig = {
  pending: { label: "Pendente", icon: ShoppingCart, variant: "secondary" as const },
  confirmed: { label: "Confirmado", icon: CheckCircle, variant: "default" as const },
  preparing: { label: "Preparando", icon: Package, variant: "default" as const },
  shipped: { label: "Enviado", icon: Truck, variant: "default" as const },
  delivered: { label: "Entregue", icon: CheckCircle, variant: "default" as const },
  cancelled: { label: "Cancelado", icon: XCircle, variant: "destructive" as const },
};

export default function Orders() {
  const { toast } = useToast();

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const response = await fetch(`/api/orders/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) throw new Error("Erro ao atualizar status");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Status atualizado com sucesso!" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao atualizar status" });
    },
  });

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Pedidos</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie pedidos e atualize status de entrega
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando pedidos...</div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Nenhum pedido ainda</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Quando clientes fizerem pedidos pelo ChatWeb, eles aparecerão aqui
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {orders.map((order) => {
            const config = statusConfig[order.status as keyof typeof statusConfig] || statusConfig.pending;
            const Icon = config.icon;
            const items = Array.isArray(order.items) ? order.items : [];

            return (
              <Card key={order.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-3">
                        Pedido #{order.id.substring(0, 8)}
                        <Badge variant={config.variant} className="gap-1.5">
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(order.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        R$ {(order.total / 100).toFixed(2)}
                      </div>
                      {order.paymentMethod && (
                        <div className="text-sm text-muted-foreground capitalize">
                          {order.paymentMethod}
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Cliente</h4>
                      <div className="text-sm space-y-1">
                        <div>{order.customerName}</div>
                        {order.customerEmail && <div className="text-muted-foreground">{order.customerEmail}</div>}
                        {order.customerPhone && <div className="text-muted-foreground">{order.customerPhone}</div>}
                      </div>
                    </div>

                    {order.shippingAddress && (
                      <div className="space-y-2">
                        <h4 className="font-semibold text-sm">Endereço de Entrega</h4>
                        <div className="text-sm text-muted-foreground">
                          {typeof order.shippingAddress === 'object' && (
                            <>
                              <div>{(order.shippingAddress as any).street}</div>
                              <div>
                                {(order.shippingAddress as any).city}, {(order.shippingAddress as any).state}
                              </div>
                              <div>CEP: {(order.shippingAddress as any).zip}</div>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Itens do Pedido</h4>
                    <div className="space-y-2">
                      {items.map((item: any, index: number) => (
                        <div key={index} className="flex justify-between items-center text-sm p-3 rounded-lg bg-muted">
                          <div>
                            <span className="font-medium">{item.quantity}x</span> {item.name}
                          </div>
                          <div className="font-semibold">
                            R$ {((item.price * item.quantity) / 100).toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="text-sm text-muted-foreground">
                      Atualizar status do pedido:
                    </div>
                    <Select
                      value={order.status}
                      onValueChange={(status) => updateStatusMutation.mutate({ id: order.id, status })}
                      disabled={updateStatusMutation.isPending}
                    >
                      <SelectTrigger className="w-48" data-testid={`select-status-${order.id}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pendente</SelectItem>
                        <SelectItem value="confirmed">Confirmado</SelectItem>
                        <SelectItem value="preparing">Preparando</SelectItem>
                        <SelectItem value="shipped">Enviado</SelectItem>
                        <SelectItem value="delivered">Entregue</SelectItem>
                        <SelectItem value="cancelled">Cancelado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
