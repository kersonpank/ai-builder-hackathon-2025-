import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Edit, Trash2, Sparkles, Package, ImageIcon, X, FileUp, FileCheck2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import type { Product } from "@shared/schema";

const productSchema = z.object({
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  description: z.string().optional(),
  price: z.string().min(1, "Preço é obrigatório"),
  category: z.string().optional(),
  stock: z.string().optional(),
  isActive: z.boolean().default(true),
});

type ProductForm = z.infer<typeof productSchema>;

export default function Products() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkImportFile, setBulkImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [generatingDescription, setGeneratingDescription] = useState(false);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingImages, setUploadingImages] = useState(false);

  const { data: drafts = [] } = useQuery<Product[]>({
    queryKey: ["/api/products/drafts"],
  });

  const { data: products = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const form = useForm<ProductForm>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      category: "",
      stock: "0",
      isActive: true,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao criar produto");
      return response.json();
    },
    onSuccess: async (product) => {
      // Upload images if any were selected
      if (imageFiles.length > 0) {
        await uploadProductImages(product.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Produto criado com sucesso!" });
      setIsDialogOpen(false);
      form.reset();
      setImageFiles([]);
      setImagePreviews([]);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao criar produto" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error("Erro ao atualizar produto");
      return response.json();
    },
    onSuccess: async (product, variables) => {
      // Upload images if any were selected
      if (imageFiles.length > 0) {
        await uploadProductImages(variables.id);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Produto atualizado com sucesso!" });
      setIsDialogOpen(false);
      setEditingProduct(null);
      form.reset();
      setImageFiles([]);
      setImagePreviews([]);
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao atualizar produto" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) throw new Error("Erro ao deletar produto");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({ title: "Produto removido com sucesso!" });
    },
    onError: () => {
      toast({ variant: "destructive", title: "Erro ao remover produto" });
    },
  });

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 3) {
      toast({ variant: "destructive", title: "Máximo de 3 imagens permitidas" });
      return;
    }
    
    setImageFiles(files);
    
    // Create previews
    const previews = files.map(file => {
      const reader = new FileReader();
      return new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    });
    
    Promise.all(previews).then(setImagePreviews);
  };

  const uploadProductImages = async (productId: string) => {
    if (imageFiles.length === 0) return;
    
    setUploadingImages(true);
    try {
      const formData = new FormData();
      imageFiles.forEach(file => {
        formData.append('images', file);
      });
      
      const response = await fetch(`/api/products/${productId}/images`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: formData,
      });
      
      if (!response.ok) throw new Error('Upload failed');
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao fazer upload das imagens",
      });
    } finally {
      setUploadingImages(false);
    }
  };

  const generateDescription = async () => {
    const name = form.getValues("name");
    const category = form.getValues("category");
    
    if (!name) {
      toast({ variant: "destructive", title: "Digite o nome do produto primeiro" });
      return;
    }

    setGeneratingDescription(true);
    try {
      const response = await fetch("/api/products/generate-description", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({ name, category }),
      });
      
      if (!response.ok) throw new Error("Erro ao gerar descrição");
      
      const { description } = await response.json();
      form.setValue("description", description);
      toast({ title: "Descrição gerada com IA!" });
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao gerar descrição" });
    } finally {
      setGeneratingDescription(false);
    }
  };

  const onSubmit = (data: ProductForm) => {
    const payload = {
      ...data,
      price: Math.round(parseFloat(data.price) * 100),
      stock: parseInt(data.stock || "0"),
    };

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const openEditDialog = (product: Product) => {
    setEditingProduct(product);
    form.reset({
      name: product.name,
      description: product.description || "",
      price: (product.price / 100).toFixed(2),
      category: product.category || "",
      stock: product.stock.toString(),
      isActive: product.isActive,
    });
    setIsDialogOpen(true);
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    form.reset();
    setIsDialogOpen(true);
  };

  const handleBulkImport = async () => {
    if (!bulkImportFile) return;

    setIsImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', bulkImportFile);

      const response = await fetch("/api/products/bulk-import", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Erro ao importar produtos");
      }

      const result = await response.json();
      
      toast({
        title: "Importação concluída!",
        description: `${result.count} produto(s) importado(s). Revise e publique.`,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/products/drafts"] });
      setIsBulkImportOpen(false);
      setBulkImportFile(null);
      
      // Navigate to drafts page
      setLocation("/product-drafts");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Erro na importação",
        description: error.message || "Não foi possível processar o arquivo",
      });
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Catálogo de Produtos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie seus produtos e o que o agente pode recomendar
          </p>
        </div>
        <div className="flex gap-2">
          {drafts.length > 0 && (
            <Button
              variant="outline"
              onClick={() => setLocation("/product-drafts")}
              data-testid="button-view-drafts"
            >
              <FileCheck2 className="w-4 h-4 mr-2" />
              Rascunhos ({drafts.length})
            </Button>
          )}
          <Dialog open={isBulkImportOpen} onOpenChange={setIsBulkImportOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" data-testid="button-bulk-import">
                <FileUp className="w-4 h-4 mr-2" />
                Importação em Massa
              </Button>
            </DialogTrigger>
            <DialogContent data-testid="dialog-bulk-import">
              <DialogHeader>
                <DialogTitle>Importação em Massa de Produtos</DialogTitle>
                <DialogDescription>
                  Faça upload de um arquivo PDF, XML ou TXT com informações dos produtos. A IA irá extrair e estruturar os dados para você revisar.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Arquivo do catálogo</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".pdf,.xml,.txt"
                    onChange={(e) => setBulkImportFile(e.target.files?.[0] || null)}
                    data-testid="input-bulk-file"
                  />
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: PDF, XML, TXT (máx. 10MB)
                  </p>
                </div>
                {bulkImportFile && (
                  <div className="p-3 bg-muted rounded-md">
                    <p className="text-sm font-medium">{bulkImportFile.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(bulkImportFile.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button
                  onClick={handleBulkImport}
                  disabled={!bulkImportFile || isImporting}
                  data-testid="button-start-import"
                >
                  {isImporting ? (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                      Processando com IA...
                    </>
                  ) : (
                    <>
                      <FileUp className="w-4 h-4 mr-2" />
                      Importar Produtos
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={openCreateDialog} data-testid="button-add-product">
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Produto
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando produtos...</div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Package className="w-16 h-16 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Nenhum produto cadastrado</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Comece adicionando produtos ao seu catálogo para que o agente possa recomendar aos clientes
                </p>
              </div>
              <Button onClick={openCreateDialog} data-testid="button-add-first-product">
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Produto
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((product) => (
            <Card key={product.id} className="overflow-hidden">
              <CardHeader className="p-0">
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
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold line-clamp-1">{product.name}</h3>
                    {!product.isActive && (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  {product.category && (
                    <Badge variant="outline" className="text-xs">{product.category}</Badge>
                  )}
                </div>
                
                {product.description && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {product.description}
                  </p>
                )}
                
                <div className="flex items-center justify-between pt-2 border-t">
                  <div>
                    <div className="text-2xl font-bold">
                      R$ {(product.price / 100).toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Estoque: {product.stock}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => openEditDialog(product)}
                      data-testid={`button-edit-${product.id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(product.id)}
                      data-testid={`button-delete-${product.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Editar Produto" : "Novo Produto"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct 
                ? "Atualize as informações do produto" 
                : "Adicione um novo produto ao catálogo"}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Produto</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Camiseta Básica Preta" data-testid="input-product-name" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Categoria</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Vestuário" data-testid="input-category" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="price"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preço (R$)</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          step="0.01" 
                          placeholder="99.90" 
                          data-testid="input-price" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descrição do produto..." 
                        className="min-h-24"
                        data-testid="input-description"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateDescription}
                        disabled={generatingDescription}
                        className="mt-2"
                        data-testid="button-generate-description"
                      >
                        <Sparkles className="w-4 h-4 mr-2" />
                        {generatingDescription ? "Gerando..." : "Gerar com IA"}
                      </Button>
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Estoque</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" data-testid="input-stock" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <FormLabel>Imagens do Produto (até 3)</FormLabel>
                <div className="flex flex-col gap-3">
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                    data-testid="input-product-images"
                    className="cursor-pointer"
                  />
                  {imagePreviews.length > 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {imagePreviews.map((preview, index) => (
                        <div key={index} className="relative border rounded-lg overflow-hidden aspect-square">
                          <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  {editingProduct?.imageUrls && editingProduct.imageUrls.length > 0 && imagePreviews.length === 0 && (
                    <div className="grid grid-cols-3 gap-3">
                      {editingProduct.imageUrls.map((url, index) => (
                        <div key={index} className="relative border rounded-lg overflow-hidden aspect-square">
                          <img src={url} alt={`Product ${index + 1}`} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                  {imagePreviews.length === 0 && (!editingProduct?.imageUrls || editingProduct.imageUrls.length === 0) && (
                    <div className="border border-dashed rounded-lg p-6 flex items-center justify-center bg-muted/30">
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="w-8 h-8 mx-auto mb-2" />
                        <p className="text-sm">Selecione até 3 imagens</p>
                      </div>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  As imagens serão exibidas na conversa quando o agente mencionar este produto
                </p>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsDialogOpen(false);
                    setEditingProduct(null);
                    form.reset();
                  }}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit" 
                  disabled={createMutation.isPending || updateMutation.isPending}
                  data-testid="button-save-product"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Salvando..."
                    : editingProduct
                    ? "Atualizar"
                    : "Criar Produto"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
