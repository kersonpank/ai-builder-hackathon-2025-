import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Bot, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export default function ChatWeb() {
  const { companyId } = useParams<{ companyId: string }>();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data: companyData } = useQuery<{ company: any; agent: any }>({
    queryKey: [`/api/chatweb/${companyId}`],
    enabled: !!companyId,
  });

  const { data: products = [] } = useQuery<any[]>({
    queryKey: [`/api/chatweb/${companyId}/products`],
    enabled: !!companyId,
  });

  const createConversationMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/chatweb/${companyId}/conversations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Erro ao criar conversa");
      return response.json();
    },
    onSuccess: (data) => {
      setConversationId(data.id);
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!conversationId) throw new Error("No conversation");
      
      const response = await fetch(`/api/chatweb/${companyId}/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!response.ok) throw new Error("Erro ao enviar mensagem");
      return response.json();
    },
    onSuccess: (assistantMessage) => {
      setMessages(prev => [...prev, assistantMessage]);
    },
  });

  useEffect(() => {
    if (companyId && !conversationId) {
      createConversationMutation.mutate();
    }
  }, [companyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !conversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    sendMessageMutation.mutate(input);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!companyData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">Carregando...</div>
          <div className="text-sm text-muted-foreground">Conectando ao agente</div>
        </div>
      </div>
    );
  }

  const { company, agent } = companyData;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <div className="bg-card border-b px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center gap-4">
          <Avatar className="h-12 w-12">
            <AvatarFallback className="bg-primary text-primary-foreground text-lg">
              {company.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-xl font-bold">{company.name}</h1>
            <p className="text-sm text-muted-foreground">
              {agent?.name || "Assistente Virtual"}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.length === 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bot className="w-6 h-6 text-primary" />
                  Olá! Como posso ajudar?
                </CardTitle>
                <CardDescription>
                  Estou aqui para te ajudar a encontrar o produto perfeito e tirar suas dúvidas.
                  {products.length > 0 && ` Temos ${products.length} produtos disponíveis!`}
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          {messages.map((message) => (
            <div
              key={message.id}
              className={cn(
                "flex gap-3",
                message.role === "user" ? "justify-end" : "justify-start"
              )}
            >
              {message.role === "assistant" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
              
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 max-w-md",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border rounded-bl-sm"
                )}
              >
                <p className="text-base leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>

              {message.role === "user" && (
                <Avatar className="h-8 w-8 mt-1">
                  <AvatarFallback className="bg-muted">
                    <User className="w-4 h-4" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}

          {sendMessageMutation.isPending && (
            <div className="flex gap-3 justify-start">
              <Avatar className="h-8 w-8 mt-1">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <div className="rounded-2xl rounded-bl-sm px-4 py-3 bg-card border">
                <div className="flex gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-card border-t px-4 py-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex gap-3">
          <Input
            placeholder="Digite sua mensagem..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sendMessageMutation.isPending || !conversationId}
            className="flex-1"
            data-testid="input-message"
          />
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sendMessageMutation.isPending || !conversationId}
            size="icon"
            data-testid="button-send"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
