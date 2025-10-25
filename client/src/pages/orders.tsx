import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, Package, Truck, CheckCircle, XCircle, Plus } from "lucide-react";
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
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newOrder, setNewOrder] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    shippingAddress: "",
    paymentMethod: "pix",
    items: [] as Array<{ productId: string; quantity: number; price: number }>,
    total: 0,
  });

  const { data: orders = [], isLoading } = useQuery<Order[]>({
    queryKey: ["/api/orders"],
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: ["/api/products"],
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

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(orderData),
      });
      if (!response.ok) throw new Error("Erro ao criar pedido");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
      toast({ title: "Pedido criado com sucesso!" });
      setIsCreateDialogOpen(false);
      setNewOrder({
        customerName: "",
        customerEmail: "",
        customerPhone: "",
        shippingAddress: "",
        paymentMethod: "pix",
        items: [],
        total: 0,
      });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao criar pedido" });
    },
  });

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie pedidos e atualize status de entrega
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-order">
              <Plus className="w-4 h-4 mr-2" />
              Criar Pedido (PDV)
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="dialog-create-order">
            <DialogHeader>
              <DialogTitle>Criar Pedido Manual (PDV)</DialogTitle>
              <DialogDescription>
                Campos que o agente IA deve coletar para processar um pedido completo
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Informações do Cliente</h4>
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Nome Completo *</Label>
                    <Input
                      id="customerName"
                      value={newOrder.customerName}
                      onChange={(e) => setNewOrder({ ...newOrder, customerName: e.target.value })}
                      placeholder="Nome do cliente"
                      data-testid="input-customer-name"
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="customerEmail">E-mail</Label>
                      <Input
                        id="customerEmail"
                        type="email"
                        value={newOrder.customerEmail}
                        onChange={(e) => setNewOrder({ ...newOrder, customerEmail: e.target.value })}
                        placeholder="email@exemplo.com"
                        data-testid="input-customer-email"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="customerPhone">Telefone *</Label>
                      <Input
                        id="customerPhone"
                        value={newOrder.customerPhone}
                        onChange={(e) => setNewOrder({ ...newOrder, customerPhone: e.target.value })}
                        placeholder="(11) 98888-8888"
                        data-testid="input-customer-phone"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Endereço de Entrega *</h4>
                <div className="space-y-2">
                  <Textarea
                    value={newOrder.shippingAddress}
                    onChange={(e) => setNewOrder({ ...newOrder, shippingAddress: e.target.value })}
                    placeholder="Rua, número, complemento, bairro, cidade - estado, CEP"
                    rows={3}
                    data-testid="textarea-shipping-address"
                  />
                  <p className="text-xs text-muted-foreground">
                    A IA deve coletar: CEP, rua, número, complemento, bairro, cidade, estado
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Método de Pagamento *</h4>
                <Select
                  value={newOrder.paymentMethod}
                  onValueChange={(value) => setNewOrder({ ...newOrder, paymentMethod: value })}
                >
                  <SelectTrigger data-testid="select-payment-method">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pix">PIX</SelectItem>
                    <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                    <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                    <SelectItem value="cash">Dinheiro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Produtos do Pedido *</h4>
                <p className="text-xs text-muted-foreground">
                  A IA deve confirmar: nome do produto, quantidade, e calcular o total automaticamente
                </p>
                <div className="p-4 bg-muted rounded-lg space-y-2">
                  <div className="text-sm font-medium">Exemplo de fluxo da IA:</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p>1. "Qual produto você gostaria de comprar?"</p>
                    <p>2. "Quantas unidades de [Produto]?"</p>
                    <p>3. "Mais algum produto?" (loop até cliente dizer não)</p>
                    <p>4. Calcular e confirmar: "Total: R$ XX,XX. Confirma?"</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-2">
                <h4 className="font-semibold text-sm flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  Campos Obrigatórios para Pedido
                </h4>
                <ul className="text-xs space-y-1 text-muted-foreground">
                  <li>✓ Nome completo do cliente</li>
                  <li>✓ Telefone para contato</li>
                  <li>✓ Endereço completo de entrega (CEP, rua, número, cidade, estado)</li>
                  <li>✓ Método de pagamento</li>
                  <li>✓ Lista de produtos com quantidades</li>
                  <li>✓ Confirmação do valor total</li>
                </ul>
              </div>
            </div>
            <DialogFooter>
              <Button
                onClick={() => {
                  toast({
                    title: "Documentação de campos",
                    description: "Esta tela serve para documentar os campos que a IA deve coletar. Implementação do fluxo de pedidos em andamento.",
                  });
                }}
                data-testid="button-save-order"
              >
                Salvar Pedido
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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
                          {typeof order.shippingAddress === 'string' 
                            ? order.shippingAddress 
                            : JSON.stringify(order.shippingAddress)}
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
