import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Headphones, User, Bot } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { Conversation, Message } from "@shared/schema";
import { useState, useRef, useEffect } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function ConversationCard({ conversation, onClick }: { conversation: Conversation; onClick: () => void }) {
  const { data: customer } = useQuery<any>({
    queryKey: ["/api/customers", conversation.customerId],
    enabled: !!conversation.customerId,
  });

  const displayName = customer?.name || conversation.customerName || "Cliente Anônimo";

  const getChannelBadge = (channel: string) => {
    const channelConfig = {
      chatweb: { label: "ChatWeb", variant: "default" as const },
      whatsapp: { label: "WhatsApp", variant: "secondary" as const },
      instagram: { label: "Instagram", variant: "secondary" as const },
    };
    const config = channelConfig[channel as keyof typeof channelConfig] || channelConfig.chatweb;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getModeBadge = (mode: string) => {
    const modeConfig = {
      ai: { label: "IA", variant: "default" as const },
      human: { label: "Humano", variant: "secondary" as const },
      hybrid: { label: "Híbrido", variant: "outline" as const },
    };
    const config = modeConfig[mode as keyof typeof modeConfig] || modeConfig.ai;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Card 
      className={`hover-elevate transition-all cursor-pointer ${
        conversation.needsHumanAttention ? 'ring-2 ring-orange-500' : ''
      }`}
      onClick={onClick}
      data-testid={`card-conversation-${conversation.id}`}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1 flex-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">
                {displayName}
              </CardTitle>
              {conversation.needsHumanAttention && (
                <Badge variant="destructive" className="text-xs">
                  Atenção!
                </Badge>
              )}
            </div>
            <CardDescription className="text-xs">
              {format(new Date(conversation.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1">
            {getChannelBadge(conversation.channel)}
            {getModeBadge(conversation.mode)}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {conversation.needsHumanAttention && conversation.transferReason && (
          <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
            Motivo: {conversation.transferReason}
          </div>
        )}
        {conversation.customerPhone && (
          <div className="text-sm text-muted-foreground">
            {conversation.customerPhone}
          </div>
        )}
        <Badge variant={conversation.status === 'active' ? 'default' : 'secondary'}>
          {conversation.status === 'active' ? 'Ativo' : 'Encerrado'}
        </Badge>
      </CardContent>
    </Card>
  );
}

export default function Conversations() {
  const { toast } = useToast();
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageText, setMessageText] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    refetchInterval: 5000, // Atualiza a cada 5 segundos
  });

  const { data: conversationDetail } = useQuery<Conversation & { messages: Message[] }>({
    queryKey: ["/api/conversations", selectedConversation?.id],
    enabled: !!selectedConversation,
    refetchInterval: selectedConversation ? 2000 : false, // Atualiza a cada 2 segundos se houver conversa selecionada
  });

  const messages = conversationDetail?.messages || [];

  const { data: customer } = useQuery<any>({
    queryKey: ["/api/customers", selectedConversation?.customerId],
    enabled: !!selectedConversation?.customerId,
  });

  const takeoverMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return apiRequest("POST", `/api/conversations/${conversationId}/takeover`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      toast({ title: "Conversa assumida com sucesso!" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, message }: { conversationId: string; message: string }) => {
      return apiRequest("POST", `/api/conversations/${conversationId}/operator-message`, { content: message });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setMessageText("");
    },
  });

  const handleTakeover = async () => {
    if (selectedConversation) {
      await takeoverMutation.mutateAsync(selectedConversation.id);
      // Clear the needsHumanAttention flag after takeover
      if (selectedConversation.needsHumanAttention) {
        await apiRequest("PATCH", `/api/conversations/${selectedConversation.id}`, {
          needsHumanAttention: false,
        });
        queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      }
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;

    // Se ainda não assumiu, assume automaticamente
    if (selectedConversation.mode === 'ai') {
      takeoverMutation.mutate(selectedConversation.id);
    }

    sendMessageMutation.mutate({
      conversationId: selectedConversation.id,
      message: messageText.trim(),
    });
  };

  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  const getChannelBadge = (channel: string) => {
    const channelConfig = {
      chatweb: { label: "ChatWeb", variant: "default" as const },
      whatsapp: { label: "WhatsApp", variant: "secondary" as const },
      instagram: { label: "Instagram", variant: "secondary" as const },
    };
    const config = channelConfig[channel as keyof typeof channelConfig] || channelConfig.chatweb;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getModeBadge = (mode: string) => {
    const modeConfig = {
      ai: { label: "IA", variant: "default" as const },
      human: { label: "Humano", variant: "secondary" as const },
      hybrid: { label: "Híbrido", variant: "outline" as const },
    };
    const config = modeConfig[mode as keyof typeof modeConfig] || modeConfig.ai;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const displayName = customer?.name || selectedConversation?.customerName || "Cliente Anônimo";

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-4xl font-bold">Conversas</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe e interaja com conversas dos clientes
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
            <ConversationCard 
              key={conversation.id}
              conversation={conversation}
              onClick={() => setSelectedConversation(conversation)}
            />
          ))}
        </div>
      )}

      {/* Conversation Detail Dialog */}
      <Dialog open={!!selectedConversation} onOpenChange={(open) => !open && setSelectedConversation(null)}>
        <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{displayName}</span>
              <div className="flex gap-2">
                {selectedConversation && getChannelBadge(selectedConversation.channel)}
                {selectedConversation && getModeBadge(selectedConversation.mode)}
              </div>
            </DialogTitle>
            <DialogDescription>
              {customer?.phone && `Telefone: ${customer.phone}`}
              {customer?.email && ` | Email: ${customer.email}`}
              {customer?.cpf && ` | CPF: ${customer.cpf}`}
            </DialogDescription>
          </DialogHeader>

          {selectedConversation && selectedConversation.mode === 'ai' && (
            <div className="space-y-2">
              {selectedConversation.needsHumanAttention && (
                <div className="bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
                  <p className="text-sm font-medium text-orange-800 dark:text-orange-200">
                    O agente solicitou ajuda de um atendente humano
                  </p>
                  {selectedConversation.transferReason && (
                    <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                      Motivo: {selectedConversation.transferReason}
                    </p>
                  )}
                </div>
              )}
              <Button
                onClick={handleTakeover}
                disabled={takeoverMutation.isPending}
                variant={selectedConversation.needsHumanAttention ? "default" : "outline"}
                className="w-full"
                data-testid="button-takeover"
              >
                <Headphones className="w-4 h-4 mr-2" />
                {takeoverMutation.isPending ? "Assumindo..." : "Assumir Conversa"}
              </Button>
            </div>
          )}

          <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {messages.map((message) => {
                const isOperator = message.role === 'operator';
                const isUser = message.role === 'user';
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${isUser ? 'justify-start' : 'justify-end'}`}
                    data-testid={`message-${message.id}`}
                  >
                    {isUser && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className="bg-muted">
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                    )}
                    
                    <div className={`flex flex-col gap-1 max-w-[70%] ${!isUser ? 'items-end' : ''}`}>
                      <div
                        className={`rounded-lg px-4 py-2 ${
                          isUser
                            ? 'bg-muted'
                            : isOperator
                            ? 'bg-blue-500 text-white'
                            : 'bg-primary text-primary-foreground'
                        }`}
                      >
                        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.createdAt), "HH:mm", { locale: ptBR })}
                      </span>
                    </div>

                    {!isUser && (
                      <Avatar className="h-8 w-8 flex-shrink-0">
                        <AvatarFallback className={isOperator ? "bg-blue-500 text-white" : "bg-primary text-primary-foreground"}>
                          {isOperator ? <Headphones className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {selectedConversation && selectedConversation.status === 'active' && (
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                placeholder={
                  selectedConversation.mode === 'ai'
                    ? "Assuma a conversa para enviar mensagens..."
                    : "Digite sua mensagem..."
                }
                disabled={selectedConversation.mode === 'ai' || sendMessageMutation.isPending}
                data-testid="input-operator-message"
              />
              <Button
                type="submit"
                disabled={!messageText.trim() || sendMessageMutation.isPending}
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
