import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { MessageSquare, User, Send, UserCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

interface Conversation {
  id: string;
  companyId: string;
  channel: string;
  customerName: string | null;
  customerPhone: string | null;
  status: string;
  mode: string;
  takenOverBy: string | null;
  takenOverAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: string;
  role: string;
  content: string;
  operatorName: string | null;
  createdAt: string;
  metadata: any;
}

export default function ConversationsMonitor() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const { data: conversations = [], isLoading } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations/active"],
    refetchInterval: 3000, // Auto-refresh every 3 seconds
  });

  const { data: conversationDetail } = useQuery<{ messages: Message[] }>({
    queryKey: ["/api/conversations", selectedConversation],
    enabled: !!selectedConversation,
    refetchInterval: 2000,
  });

  const takeoverMutation = useMutation({
    mutationFn: async (conversationId: string) => {
      return apiRequest("POST", `/api/conversations/${conversationId}/takeover`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations/active"] });
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation] });
      toast({ title: "Conversa assumida com sucesso!" });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: string; content: string }) => {
      return apiRequest("POST", `/api/conversations/${conversationId}/operator-message`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", selectedConversation] });
      setReplyText("");
      toast({ title: "Mensagem enviada!" });
    },
  });

  const handleTakeover = (conversationId: string) => {
    takeoverMutation.mutate(conversationId);
  };

  const handleSendMessage = () => {
    if (!selectedConversation || !replyText.trim()) return;
    sendMessageMutation.mutate({ conversationId: selectedConversation, content: replyText });
  };

  if (isLoading) {
    return <div className="p-8">Carregando conversas...</div>;
  }

  return (
    <div className="h-screen flex">
      {/* Left Sidebar - Conversations List */}
      <div className="w-80 border-r flex flex-col">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold">Conversas Ativas</h2>
          <p className="text-sm text-muted-foreground">{conversations.length} conversas</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-2">
            {conversations.map((conv) => (
              <Card
                key={conv.id}
                className={`cursor-pointer hover-elevate ${
                  selectedConversation === conv.id ? "ring-2 ring-primary" : ""
                }`}
                onClick={() => setSelectedConversation(conv.id)}
                data-testid={`conversation-${conv.id}`}
              >
                <CardHeader className="p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          <User className="w-4 h-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-sm truncate">
                          {conv.customerName || "Cliente"}
                        </CardTitle>
                        <CardDescription className="text-xs truncate">
                          {conv.customerPhone || "Sem telefone"}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={conv.mode === "ai" ? "secondary" : "default"} className="text-xs">
                      {conv.mode === "ai" ? "IA" : "Humano"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true, locale: ptBR })}
                  </p>
                </CardHeader>
              </Card>
            ))}
            {conversations.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhuma conversa ativa</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right Side - Conversation Detail */}
      <div className="flex-1 flex flex-col">
        {selectedConversation ? (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h3 className="font-bold">
                  {conversations.find((c) => c.id === selectedConversation)?.customerName || "Cliente"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {conversations.find((c) => c.id === selectedConversation)?.customerPhone}
                </p>
              </div>
              {conversations.find((c) => c.id === selectedConversation)?.mode === "ai" && (
                <Button
                  onClick={() => handleTakeover(selectedConversation)}
                  data-testid="button-takeover"
                  disabled={takeoverMutation.isPending}
                >
                  <UserCheck className="w-4 h-4 mr-2" />
                  Assumir Conversa
                </Button>
              )}
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {conversationDetail?.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role !== "user" && (
                      <Avatar className="h-8 w-8 mt-1">
                        <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                          {msg.role === "operator" ? "OP" : "IA"}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <Card
                      className={`max-w-md ${
                        msg.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : msg.role === "operator"
                          ? "bg-accent"
                          : "bg-card"
                      }`}
                    >
                      <CardContent className="p-3">
                        {msg.role === "operator" && msg.operatorName && (
                          <p className="text-xs font-semibold mb-1">{msg.operatorName}</p>
                        )}
                        {msg.metadata?.productImage && (
                          <img
                            src={msg.metadata.productImage}
                            alt="Product"
                            className="w-full aspect-square object-cover rounded mb-2"
                          />
                        )}
                        <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        <p className="text-xs opacity-70 mt-1">
                          {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true, locale: ptBR })}
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {conversations.find((c) => c.id === selectedConversation)?.mode === "human" && (
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    className="min-h-[60px]"
                    data-testid="input-message"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!replyText.trim() || sendMessageMutation.isPending}
                    data-testid="button-send"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p>Selecione uma conversa para visualizar</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
