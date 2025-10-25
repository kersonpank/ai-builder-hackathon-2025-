import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Conversation } from "@shared/schema";

export default function Conversations() {
  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const getChannelBadge = (channel: string) => {
    const channelConfig = {
      chatweb: { label: "ChatWeb", variant: "default" as const },
      whatsapp: { label: "WhatsApp", variant: "secondary" as const },
      instagram: { label: "Instagram", variant: "secondary" as const },
    };
    const config = channelConfig[channel as keyof typeof channelConfig] || channelConfig.chatweb;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Conversas</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe conversas dos clientes com seu agente de IA
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Carregando conversas...</div>
      ) : conversations.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground" />
              <div className="space-y-2">
                <h3 className="text-lg font-semibold">Nenhuma conversa ainda</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Quando clientes iniciarem conversas pelo ChatWeb, elas aparecerão aqui
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="hover-elevate transition-all">
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <CardTitle className="text-base">
                      {conversation.customerName || "Cliente Anônimo"}
                    </CardTitle>
                    <CardDescription className="text-xs">
                      {format(new Date(conversation.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    </CardDescription>
                  </div>
                  {getChannelBadge(conversation.channel)}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {conversation.customerPhone && (
                  <div className="text-sm text-muted-foreground">
                    📱 {conversation.customerPhone}
                  </div>
                )}
                <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
                  {conversation.status === 'active' ? 'Ativo' : 'Encerrado'}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
