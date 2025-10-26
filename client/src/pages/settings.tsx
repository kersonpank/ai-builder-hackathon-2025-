import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, Upload, Save } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function Settings() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const { data: company, isLoading } = useQuery<any>({
    queryKey: ["/api/company"],
  });

  const [formData, setFormData] = useState({
    name: "",
    segment: "",
    cpfCnpj: "",
    phone: "",
    email: "",
    address: "",
  });

  // Update form when company data loads
  useEffect(() => {
    if (company) {
      setFormData({
        name: company.name || "",
        segment: company.segment || "",
        cpfCnpj: company.cpfCnpj || "",
        phone: company.phone || "",
        email: company.email || "",
        address: company.address || "",
      });
    }
  }, [company]);

  const updateCompanyMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiRequest("PATCH", "/api/company", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({ title: "Informações atualizadas com sucesso!" });
    },
    onError: () => {
      toast({ 
        title: "Erro ao atualizar informações",
        variant: "destructive" 
      });
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({ 
        title: "Arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive" 
      });
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("logo", file);

    try {
      const response = await fetch("/api/company/logo", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      queryClient.invalidateQueries({ queryKey: ["/api/company"] });
      toast({ title: "Logo atualizado com sucesso!" });
    } catch (error) {
      toast({ 
        title: "Erro ao fazer upload do logo",
        variant: "destructive" 
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCompanyMutation.mutate(formData);
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold">Configurações da Conta</h1>
        <p className="text-muted-foreground mt-2">
          Gerencie as informações da sua empresa
        </p>
      </div>

      <div className="space-y-6">
        {/* Logo Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Logo da Empresa
            </CardTitle>
            <CardDescription>
              Imagem exibida na sidebar e em outros locais do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                {company?.logoUrl ? (
                  <AvatarImage src={company.logoUrl} alt={company.name} />
                ) : null}
                <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                  {company?.name?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                  data-testid="input-logo-file"
                />
                <Button
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  data-testid="button-upload-logo"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  {uploading ? "Enviando..." : "Alterar Logo"}
                </Button>
                <p className="text-xs text-muted-foreground">
                  PNG, JPG ou WEBP até 5MB
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Info Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Empresa</CardTitle>
            <CardDescription>
              Atualize os dados cadastrais da sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome da Empresa</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Nome da empresa"
                    data-testid="input-company-name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="segment">Segmento</Label>
                  <Input
                    id="segment"
                    value={formData.segment}
                    onChange={(e) => setFormData({ ...formData, segment: e.target.value })}
                    placeholder="Ex: E-commerce, Alimentação"
                    data-testid="input-segment"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cpfCnpj">CPF/CNPJ</Label>
                  <Input
                    id="cpfCnpj"
                    value={formData.cpfCnpj}
                    onChange={(e) => setFormData({ ...formData, cpfCnpj: e.target.value })}
                    placeholder="00.000.000/0000-00"
                    disabled
                    className="bg-muted cursor-not-allowed"
                    data-testid="input-cpf-cnpj"
                  />
                  <p className="text-xs text-muted-foreground">
                    CPF/CNPJ não pode ser alterado
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(00) 00000-0000"
                    data-testid="input-phone"
                  />
                  <p className="text-xs text-muted-foreground">
                    Em breve disponível
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="contato@empresa.com"
                    data-testid="input-email"
                  />
                  <p className="text-xs text-muted-foreground">
                    Em breve disponível
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Endereço</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="Rua, número, bairro"
                    data-testid="input-address"
                  />
                  <p className="text-xs text-muted-foreground">
                    Em breve disponível
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  disabled={updateCompanyMutation.isPending}
                  data-testid="button-save-settings"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {updateCompanyMutation.isPending ? "Salvando..." : "Salvar Alterações"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
