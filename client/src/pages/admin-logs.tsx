import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, MessageSquare, ShoppingCart, Eye } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { ApiLog, Company } from "@shared/schema";

export default function AdminLogs() {
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedLog, setSelectedLog] = useState<ApiLog | null>(null);

  const { data: logs = [], isLoading } = useQuery<ApiLog[]>({
    queryKey: ["/api/admin/logs", filterType],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filterType !== "all") {
        params.append("type", filterType);
      }
      const response = await fetch(`/api/admin/logs?${params.toString()}`, {
        headers: {
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch logs");
      return response.json();
    },
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ["/api/admin/companies"],
  });

  const getTypeConfig = (type: string) => {
    const configs: Record<string, { label: string; icon: any; variant: any }> = {
      openai_prompt: { label: "OpenAI Prompt", icon: MessageSquare, variant: "default" },
      order_created: { label: "Pedido Criado", icon: ShoppingCart, variant: "default" },
      api_request: { label: "API Request", icon: FileText, variant: "secondary" },
    };
    return configs[type] || { label: type, icon: FileText, variant: "secondary" };
  };

  const getCompanyName = (companyId: string | null) => {
    if (!companyId) return "Sistema";
    const company = companies.find(c => c.id === companyId);
    return company?.name || companyId.substring(0, 8);
  };

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold">Logs da Plataforma</h1>
          <p className="text-muted-foreground mt-2">
            Monitore requisições API e prompts enviados para OpenAI
          </p>
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48" data-testid="select-log-type">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os Logs</SelectItem>
            <SelectItem value="openai_prompt">OpenAI Prompts</SelectItem>
            <SelectItem value="order_created">Pedidos Criados</SelectItem>
            <SelectItem value="api_request">API Requests</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Logs</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Registros capturados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Prompts OpenAI</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {logs.filter(l => l.type === 'openai_prompt').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Chamadas para IA
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
              {logs.filter(l => l.type === 'order_created').length}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Pedidos registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando logs...</div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <FileText className="w-16 h-16 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Nenhum log encontrado</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Os logs de API aparecerão aqui conforme as requisições forem processadas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {logs.map((log) => {
            const config = getTypeConfig(log.type);
            const Icon = config.icon;

            return (
              <Card key={log.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1 flex-1">
                      <CardTitle className="flex items-center gap-3">
                        <Badge variant={config.variant} className="gap-1.5">
                          <Icon className="w-3 h-3" />
                          {config.label}
                        </Badge>
                        <span className="text-sm font-normal text-muted-foreground">
                          {getCompanyName(log.companyId)}
                        </span>
                      </CardTitle>
                      <CardDescription>
                        {format(new Date(log.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedLog(log)}
                      data-testid={`button-view-log-${log.id}`}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="text-sm font-medium">Endpoint</div>
                      <div className="text-sm text-muted-foreground font-mono">
                        {log.method} {log.endpoint}
                      </div>
                    </div>
                    {log.metadata && (
                      <div className="space-y-1">
                        <div className="text-sm font-medium">Metadata</div>
                        <div className="text-sm text-muted-foreground">
                          {log.type === 'order_created' && (log.metadata as any).confirmationCode && (
                            <span className="font-mono">Código: {(log.metadata as any).confirmationCode}</span>
                          )}
                          {log.type === 'openai_prompt' && (log.metadata as any).conversationId && (
                            <span>Conv: {String((log.metadata as any).conversationId).substring(0, 8)}...</span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedLog} onOpenChange={() => setSelectedLog(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Detalhes do Log</DialogTitle>
            <DialogDescription>
              {selectedLog && format(new Date(selectedLog.createdAt), "dd 'de' MMMM 'de' yyyy 'às' HH:mm:ss", { locale: ptBR })}
            </DialogDescription>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="h-[600px] w-full">
              <div className="space-y-6 pr-4">
                <div className="space-y-2">
                  <h4 className="font-semibold text-sm">Informações Gerais</h4>
                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Tipo:</span> {selectedLog.type}
                    </div>
                    <div>
                      <span className="font-medium">Empresa:</span> {getCompanyName(selectedLog.companyId)}
                    </div>
                    <div>
                      <span className="font-medium">Endpoint:</span> {selectedLog.endpoint}
                    </div>
                    <div>
                      <span className="font-medium">Método:</span> {selectedLog.method}
                    </div>
                  </div>
                </div>

                {selectedLog.requestData && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Request Data</h4>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.requestData, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.responseData && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Response Data</h4>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.responseData, null, 2)}
                    </pre>
                  </div>
                )}

                {selectedLog.metadata && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Metadata</h4>
                    <pre className="bg-muted p-4 rounded-lg text-xs overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
