import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ShoppingCart, Package, CheckCircle, ArrowLeft } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";

const checkoutSchema = z.object({
  customerName: z.string().min(3, "Nome completo é obrigatório"),
  customerEmail: z.string().email("E-mail inválido").optional().or(z.literal("")),
  customerPhone: z.string().min(10, "Telefone é obrigatório"),
  shippingAddress: z.string().min(10, "Endereço completo é obrigatório"),
  paymentMethod: z.string().min(1, "Selecione um método de pagamento"),
});

type CheckoutForm = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const { companyId } = useParams<{ companyId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { items, total, clearCart } = useCart();
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [confirmationCode, setConfirmationCode] = useState("");

  const form = useForm<CheckoutForm>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      customerName: "",
      customerEmail: "",
      customerPhone: "",
      shippingAddress: "",
      paymentMethod: "pix",
    },
  });

  const createOrderMutation = useMutation({
    mutationFn: async (data: CheckoutForm) => {
      const orderData = {
        customerName: data.customerName,
        customerEmail: data.customerEmail || null,
        customerPhone: data.customerPhone,
        shippingAddress: data.shippingAddress,
        paymentMethod: data.paymentMethod,
        items: items.map((item) => ({
          productId: item.id,
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
        total,
      };

      const response = await fetch(`/api/chatweb/${companyId}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderData),
      });

      if (!response.ok) throw new Error("Erro ao criar pedido");
      return response.json();
    },
    onSuccess: (order) => {
      setConfirmationCode(order.confirmationCode);
      setOrderConfirmed(true);
      clearCart();
      toast({
        title: "Pedido realizado com sucesso!",
        description: `Código de confirmação: ${order.confirmationCode}`,
      });
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro ao finalizar pedido",
        description: "Tente novamente ou entre em contato",
      });
    },
  });

  const onSubmit = (data: CheckoutForm) => {
    createOrderMutation.mutate(data);
  };

  if (items.length === 0 && !orderConfirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground" />
              <div>
                <h3 className="text-lg font-semibold">Carrinho vazio</h3>
                <p className="text-sm text-muted-foreground">
                  Adicione produtos ao carrinho para finalizar a compra
                </p>
              </div>
              <Button onClick={() => setLocation(`/catalog/${companyId}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Voltar ao Catálogo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (orderConfirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="py-12">
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-green-500" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold">Pedido Confirmado!</h2>
                <p className="text-muted-foreground">
                  Seu pedido foi recebido com sucesso
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Código de Confirmação</p>
                <p className="text-3xl font-bold font-mono tracking-wider">{confirmationCode}</p>
              </div>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Guarde este código para acompanhar seu pedido</p>
                <p>Total: R$ {(total / 100).toFixed(2)}</p>
              </div>
              <Button
                onClick={() => setLocation(`/catalog/${companyId}`)}
                className="w-full"
                data-testid="button-back-catalog"
              >
                Voltar ao Catálogo
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => setLocation(`/catalog/${companyId}`)}
            data-testid="button-back"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar ao Catálogo
          </Button>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Order Form */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Informações da Compra</CardTitle>
                <CardDescription>Preencha seus dados para finalizar o pedido</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="customerName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo *</FormLabel>
                          <FormControl>
                            <Input placeholder="Seu nome completo" data-testid="input-name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="customerEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>E-mail</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="seu@email.com" data-testid="input-email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="customerPhone"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Telefone *</FormLabel>
                            <FormControl>
                              <Input placeholder="(11) 98888-8888" data-testid="input-phone" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="shippingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Endereço de Entrega *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Rua, número, complemento, bairro, cidade - UF, CEP"
                              rows={3}
                              data-testid="textarea-address"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Método de Pagamento *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="pix">PIX</SelectItem>
                              <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
                              <SelectItem value="debit_card">Cartão de Débito</SelectItem>
                              <SelectItem value="cash">Dinheiro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <Button
                      type="submit"
                      className="w-full"
                      size="lg"
                      disabled={createOrderMutation.isPending}
                      data-testid="button-confirm"
                    >
                      {createOrderMutation.isPending ? "Processando..." : "Confirmar Pedido"}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 pb-3 border-b last:border-0">
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium truncate">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity}x R$ {(item.price / 100).toFixed(2)}
                        </p>
                        <p className="text-sm font-semibold">
                          R$ {((item.price * item.quantity) / 100).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="pt-4 border-t space-y-2">
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>R$ {(total / 100).toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
