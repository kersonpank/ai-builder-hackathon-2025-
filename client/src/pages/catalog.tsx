import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ShoppingCart, Package, Plus, Minus, Trash2, Search, Store, MessageCircle } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/hooks/use-toast";
import type { Product } from "@shared/schema";

export default function Catalog() {
  const { companyId } = useParams<{ companyId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { items, addItem, updateQuantity, removeItem, total, itemCount } = useCart();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: company } = useQuery<any>({
    queryKey: [`/api/chatweb/${companyId}`],
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: [`/api/chatweb/${companyId}/products`],
  });

  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || product.category === selectedCategory;
    return matchesSearch && matchesCategory && product.isActive;
  });

  const handleAddToCart = (product: Product) => {
    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      imageUrl: product.imageUrls?.[0] || undefined,
    });
    toast({ title: `${product.name} adicionado ao carrinho!` });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {company?.logoUrl ? (
                <img src={company.logoUrl} alt={company?.name} className="h-10 w-10 rounded-lg object-cover" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                  <Store className="w-6 h-6 text-primary-foreground" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-bold">{company?.name || "Catálogo"}</h1>
                <p className="text-xs text-muted-foreground">{company?.segment}</p>
              </div>
            </div>

            <Sheet>
              <SheetTrigger asChild>
                <Button variant="outline" className="relative" data-testid="button-cart">
                  <ShoppingCart className="w-5 h-5" />
                  {itemCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0 rounded-full"
                    >
                      {itemCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-lg">
                <SheetHeader>
                  <SheetTitle>Carrinho de Compras</SheetTitle>
                </SheetHeader>
                <div className="mt-8 space-y-4">
                  {items.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                      <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground" />
                      <p className="text-muted-foreground">Seu carrinho está vazio</p>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-4 flex-1 overflow-y-auto max-h-[60vh]">
                        {items.map((item) => (
                          <Card key={item.id}>
                            <CardContent className="p-4">
                              <div className="flex gap-4">
                                <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                                  {item.imageUrl ? (
                                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package className="w-8 h-8 text-muted-foreground" />
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-semibold truncate">{item.name}</h4>
                                  <p className="text-sm text-muted-foreground">
                                    R$ {(item.price / 100).toFixed(2)}
                                  </p>
                                  <div className="flex items-center gap-2 mt-2">
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8"
                                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                      data-testid={`button-decrease-${item.id}`}
                                    >
                                      <Minus className="w-3 h-3" />
                                    </Button>
                                    <span className="w-8 text-center font-medium">{item.quantity}</span>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8"
                                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                      data-testid={`button-increase-${item.id}`}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="h-8 w-8 ml-auto"
                                      onClick={() => removeItem(item.id)}
                                      data-testid={`button-remove-${item.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                      <div className="border-t pt-4 space-y-3">
                        <div className="flex justify-between items-center text-lg font-bold">
                          <span>Total:</span>
                          <span>R$ {(total / 100).toFixed(2)}</span>
                        </div>
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => setLocation(`/catalog/${companyId}/checkout`)}
                          data-testid="button-checkout"
                        >
                          Finalizar Compra
                        </Button>
                        <Button
                          variant="outline"
                          className="w-full"
                          size="lg"
                          onClick={() => setLocation(`/chat/${companyId}`)}
                          data-testid="button-finish-with-agent"
                        >
                          <MessageCircle className="w-4 h-4 mr-2" />
                          Finalizar com o Agente
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {/* Search and Filters */}
        <div className="mb-8 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-12"
              data-testid="input-search"
            />
          </div>

          {categories.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
                data-testid="button-category-all"
              >
                Todos
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  data-testid={`button-category-${category}`}
                >
                  {category}
                </Button>
              ))}
            </div>
          )}
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando produtos...</div>
        ) : filteredProducts.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center space-y-4">
                <Package className="w-16 h-16 mx-auto text-muted-foreground" />
                <div>
                  <h3 className="text-lg font-semibold">Nenhum produto encontrado</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchQuery ? "Tente buscar por outro termo" : "Não há produtos disponíveis no momento"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredProducts.map((product) => (
              <Card key={product.id} className="overflow-hidden hover-elevate transition-all">
                <div className="aspect-square bg-muted flex items-center justify-center relative overflow-hidden">
                  {product.imageUrls && product.imageUrls.length > 0 ? (
                    <img
                      src={product.imageUrls[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
                <CardContent className="p-4 space-y-3">
                  <div className="space-y-1">
                    <h3 className="font-semibold line-clamp-2 min-h-[2.5rem]">{product.name}</h3>
                    {product.category && (
                      <Badge variant="outline" className="text-xs">
                        {product.category}
                      </Badge>
                    )}
                  </div>

                  {product.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                      {product.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-2xl font-bold">
                      R$ {(product.price / 100).toFixed(2)}
                    </div>
                    <Button
                      onClick={() => handleAddToCart(product)}
                      data-testid={`button-add-${product.id}`}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      Adicionar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Floating Chat Button */}
      <Button
        size="lg"
        className="fixed bottom-6 right-6 h-14 rounded-full shadow-lg z-40"
        onClick={() => setLocation(`/chat/${companyId}`)}
        data-testid="button-floating-chat"
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        Falar com Agente
      </Button>
    </div>
  );
}
