import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { FileCheck, Upload, Check, Edit, Trash2, X } from "lucide-react";
import type { Product } from "@shared/schema";

export default function ProductDrafts() {
  const { toast } = useToast();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Product>>({});
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  const { data: drafts = [], isLoading } = useQuery<Product[]>({
    queryKey: ["/api/products/drafts"],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Product> }) => {
      return await apiRequest("PATCH", `/api/products/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/drafts"] });
      setEditingId(null);
      setEditForm({});
      toast({
        title: "Produto atualizado",
        description: "As alterações foram salvas",
      });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível salvar as alterações",
        variant: "destructive",
      });
    },
  });

  const imageUploadMutation = useMutation({
    mutationFn: async ({ id, files }: { id: string; files: File[] }) => {
      const formData = new FormData();
      files.forEach(file => formData.append('images', file));
      
      return await apiRequest("POST", `/api/products/${id}/images`, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/drafts"] });
      setSelectedImages([]);
      toast({
        title: "Imagens adicionadas",
        description: "As imagens foram carregadas com sucesso",
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("POST", `/api/products/${id}/publish`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Produto publicado",
        description: "O produto está agora disponível para venda",
      });
    },
  });

  const publishAllMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", "/api/products/publish-all", {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/drafts"] });
      queryClient.invalidateQueries({ queryKey: ["/api/products"] });
      toast({
        title: "Todos os produtos publicados",
        description: "Todos os produtos em rascunho foram publicados",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/products/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/products/drafts"] });
      toast({
        title: "Produto removido",
        description: "O produto foi excluído",
      });
    },
  });

  const startEditing = (product: Product) => {
    setEditingId(product.id);
    setEditForm({
      name: product.name,
      description: product.description || "",
      price: product.price,
      category: product.category || "",
      stock: product.stock,
    });
  };

  const saveEditing = () => {
    if (!editingId) return;
    
    // Convert price and stock to proper types
    const normalizedData: any = {
      ...editForm,
    };
    
    // Convert price from reais to cents if it was edited
    if (editForm.price !== undefined) {
      normalizedData.price = typeof editForm.price === 'number' 
        ? editForm.price 
        : Math.round(parseFloat(String(editForm.price)) * 100);
    }
    
    // Ensure stock is an integer
    if (editForm.stock !== undefined) {
      normalizedData.stock = typeof editForm.stock === 'number'
        ? editForm.stock
        : parseInt(String(editForm.stock)) || 0;
    }
    
    updateMutation.mutate({ id: editingId, data: normalizedData });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditForm({});
    setSelectedImages([]);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedImages(files.slice(0, 3));
    }
  };

  const uploadImages = (productId: string) => {
    if (selectedImages.length > 0) {
      imageUploadMutation.mutate({ id: productId, files: selectedImages });
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="text-center">Carregando produtos...</div>
      </div>
    );
  }

  if (drafts.length === 0) {
    return (
      <div className="p-8">
        <Card>
          <CardHeader>
            <CardTitle>Revisão de Produtos Importados</CardTitle>
            <CardDescription>
              Nenhum produto em rascunho. Faça uma importação em massa para começar.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Revisão de Produtos</h1>
          <p className="text-muted-foreground">
            {drafts.length} produto{drafts.length > 1 ? 's' : ''} aguardando revisão
          </p>
        </div>
        {drafts.length > 0 && (
          <Button
            onClick={() => publishAllMutation.mutate()}
            disabled={publishAllMutation.isPending}
            data-testid="button-publish-all"
          >
            <FileCheck className="w-4 h-4 mr-2" />
            Publicar Todos ({drafts.length})
          </Button>
        )}
      </div>

      <div className="grid gap-6">
        {drafts.map((product) => (
          <Card key={product.id} data-testid={`card-product-draft-${product.id}`}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <CardTitle className="flex items-center gap-2">
                    {editingId === product.id ? (
                      <Input
                        value={editForm.name || ""}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="text-xl font-semibold"
                        data-testid="input-product-name"
                      />
                    ) : (
                      product.name
                    )}
                    <Badge variant="outline" data-testid="badge-draft">Rascunho</Badge>
                  </CardTitle>
                  <CardDescription>
                    Importado via {product.source === "bulk_import" ? "importação em massa" : "manual"}
                  </CardDescription>
                </div>

                {editingId === product.id ? (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={saveEditing}
                      disabled={updateMutation.isPending}
                      data-testid="button-save-edit"
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={cancelEditing}
                      data-testid="button-cancel-edit"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => startEditing(product)}
                      data-testid="button-edit"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => publishMutation.mutate(product.id)}
                      disabled={publishMutation.isPending}
                      data-testid="button-publish"
                    >
                      <Check className="w-4 h-4 mr-1" />
                      Publicar
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => deleteMutation.mutate(product.id)}
                      data-testid="button-delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  {editingId === product.id ? (
                    <Textarea
                      value={editForm.description || ""}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      rows={3}
                      data-testid="textarea-description"
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {product.description || "Sem descrição"}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    {editingId === product.id ? (
                      <Input
                        type="number"
                        step="0.01"
                        value={typeof editForm.price === 'number' ? (editForm.price / 100).toFixed(2) : editForm.price}
                        onChange={(e) => {
                          const valueInReais = parseFloat(e.target.value) || 0;
                          setEditForm({ ...editForm, price: Math.round(valueInReais * 100) });
                        }}
                        data-testid="input-price"
                        placeholder="0.00"
                      />
                    ) : (
                      <p className="text-lg font-semibold">
                        R$ {(product.price / 100).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label>Estoque</Label>
                    {editingId === product.id ? (
                      <Input
                        type="number"
                        value={editForm.stock || 0}
                        onChange={(e) => setEditForm({ ...editForm, stock: parseInt(e.target.value) || 0 })}
                        data-testid="input-stock"
                      />
                    ) : (
                      <p className="text-lg">{product.stock} un.</p>
                    )}
                  </div>

                  <div className="space-y-2 col-span-2">
                    <Label>Categoria</Label>
                    {editingId === product.id ? (
                      <Input
                        value={editForm.category || ""}
                        onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                        data-testid="input-category"
                      />
                    ) : (
                      <p className="text-sm">{product.category || "Sem categoria"}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Images Section */}
              <div className="space-y-2">
                <Label>Imagens ({product.imageUrls?.length || 0}/3)</Label>
                {product.imageUrls && product.imageUrls.length > 0 ? (
                  <div className="grid grid-cols-3 gap-2">
                    {product.imageUrls.map((url, idx) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`${product.name} ${idx + 1}`}
                        className="w-full h-32 object-cover rounded border"
                        data-testid={`img-product-${idx}`}
                      />
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma imagem adicionada</p>
                )}

                {editingId === product.id && (product.imageUrls?.length || 0) < 3 && (
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageChange}
                      data-testid="input-images"
                    />
                    {selectedImages.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => uploadImages(product.id)}
                        disabled={imageUploadMutation.isPending}
                        data-testid="button-upload-images"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Adicionar {selectedImages.length} imagem(ns)
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
