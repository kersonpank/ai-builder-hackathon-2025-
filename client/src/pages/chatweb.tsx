import { useState, useEffect, useRef } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Bot, User, Image as ImageIcon, Mic, X, ShoppingBag, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useCart } from "@/context/CartContext";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  metadata?: {
    productImages?: Array<{
      name: string;
      imageUrl: string | null;
      hasMore: boolean;
    }>;
    attachedImages?: Array<{
      url: string;
      caption?: string;
    }>;
  } | null;
}

const CONVERSATION_STORAGE_KEY = "omni_conversation_";

export default function ChatWeb() {
  const { companyId } = useParams<{ companyId: string }>();
  const { toast } = useToast();
  const { items: cartItems, total: cartTotal, clearCart } = useCart();
  const [conversationId, setConversationId] = useState<string | null>(() => {
    if (!companyId) return null;
    return localStorage.getItem(CONVERSATION_STORAGE_KEY + companyId);
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

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
      if (companyId) {
        localStorage.setItem(CONVERSATION_STORAGE_KEY + companyId, data.id);
      }
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, image, audio }: { content: string; image?: File; audio?: Blob }) => {
      if (!conversationId) throw new Error("No conversation");
      
      const formData = new FormData();
      formData.append("content", content);
      if (image) formData.append("image", image);
      if (audio) formData.append("audio", audio, "audio.webm");
      
      const response = await fetch(`/api/chatweb/${companyId}/conversations/${conversationId}/messages`, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Erro ao enviar mensagem");
      return response.json();
    },
    onSuccess: (assistantMessage) => {
      setMessages(prev => [...prev, assistantMessage]);
      setSelectedImage(null);
      setAudioBlob(null);
    },
  });

  useEffect(() => {
    const loadConversation = async () => {
      if (!companyId) return;
      
      if (conversationId) {
        // Load existing conversation messages
        setIsLoadingMessages(true);
        try {
          const response = await fetch(`/api/chatweb/${companyId}/conversations/${conversationId}/messages`);
          if (response.ok) {
            const existingMessages = await response.json();
            setMessages(existingMessages);
          } else {
            // Conversation doesn't exist anymore, create new one
            localStorage.removeItem(CONVERSATION_STORAGE_KEY + companyId);
            setConversationId(null);
            createConversationMutation.mutate();
          }
        } catch (error) {
          console.error("Error loading messages:", error);
          // Create new conversation on error
          localStorage.removeItem(CONVERSATION_STORAGE_KEY + companyId);
          setConversationId(null);
          createConversationMutation.mutate();
        } finally {
          setIsLoadingMessages(false);
        }
      } else {
        // No conversation exists, create new one
        createConversationMutation.mutate();
      }
    };
    
    loadConversation();
  }, [companyId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      toast({ variant: "destructive", title: "Erro ao acessar microfone" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: "destructive", title: "Imagem muito grande (máx 5MB)" });
        return;
      }
      setSelectedImage(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !selectedImage && !audioBlob) || !conversationId) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input || (selectedImage ? "📷 Imagem enviada" : "🎤 Áudio enviado"),
      createdAt: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    
    sendMessageMutation.mutate({ 
      content: input, 
      image: selectedImage || undefined,
      audio: audioBlob || undefined
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSendCartToAgent = () => {
    if (cartItems.length === 0 || !conversationId) return;
    
    const cartSummary = cartItems.map(item => 
      `- ${item.name} (${item.quantity}x) - R$ ${(item.price * item.quantity / 100).toFixed(2)}`
    ).join('\n');
    
    const cartMessage = `Olá! Gostaria de finalizar esta compra:\n\n${cartSummary}\n\nTotal: R$ ${(cartTotal / 100).toFixed(2)}`;
    
    setInput(cartMessage);
    toast({ title: "Carrinho adicionado à conversa!" });
  };

  if (!companyData || isLoadingMessages) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-muted">
        <div className="text-center space-y-2">
          <div className="text-lg font-semibold">Carregando...</div>
          <div className="text-sm text-muted-foreground">
            {isLoadingMessages ? "Carregando conversa..." : "Conectando ao agente"}
          </div>
        </div>
      </div>
    );
  }

  const { company, agent } = companyData;

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-primary/5 via-background to-accent/5">
      {/* Header */}
      <div className="bg-card border-b px-6 py-4 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-12 w-12">
              {company.logoUrl && (
                <AvatarImage src={company.logoUrl} alt={company.name} />
              )}
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
          <div className="flex items-center gap-2">
            {cartItems.length > 0 && (
              <Button 
                variant="default"
                onClick={handleSendCartToAgent}
                data-testid="button-send-cart"
              >
                <ShoppingBag className="w-4 h-4 mr-2" />
                Enviar Carrinho ({cartItems.length})
              </Button>
            )}
            <Button 
              variant="outline"
              onClick={() => window.location.href = `/catalog/${companyId}`}
              data-testid="button-view-catalog"
            >
              <Store className="w-4 h-4 mr-2" />
              Ver Catálogo
            </Button>
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
                  "rounded-2xl px-4 py-3 max-w-md flex flex-col gap-3",
                  message.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border rounded-bl-sm"
                )}
              >
                {/* Single Product Image (new format - one per message) */}
                {message.role === "assistant" && message.metadata && 'productImage' in message.metadata && typeof message.metadata.productImage === 'string' && (
                  <div className="rounded-lg overflow-hidden border bg-background">
                    <img 
                      src={message.metadata.productImage} 
                      alt={('productName' in message.metadata && typeof (message.metadata as any).productName === 'string' ? (message.metadata as any).productName : "Produto")}
                      className="w-full aspect-square object-cover"
                    />
                  </div>
                )}

                {/* Attached Images */}
                {message.role === "assistant" && message.metadata?.attachedImages && message.metadata.attachedImages.length > 0 && (
                  <div className="flex flex-col gap-2">
                    {message.metadata.attachedImages.map((image, index) => (
                      <div key={index} className="rounded-lg overflow-hidden border bg-background">
                        <img 
                          src={image.url} 
                          alt={image.caption || "Imagem enviada pelo agente"}
                          className="w-full object-cover max-h-64"
                        />
                        {image.caption && (
                          <div className="px-3 py-2 text-sm text-muted-foreground border-t bg-muted/30">
                            {image.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Message Text */}
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
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Preview Section */}
          {(selectedImage || audioBlob) && (
            <div className="flex gap-2 flex-wrap">
              {selectedImage && (
                <div className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border">
                  <ImageIcon className="w-4 h-4" />
                  <span className="text-sm">{selectedImage.name}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 rounded-full"
                    onClick={() => setSelectedImage(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
              {audioBlob && (
                <div className="relative inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border">
                  <Mic className="w-4 h-4" />
                  <span className="text-sm">Áudio gravado</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 rounded-full"
                    onClick={() => setAudioBlob(null)}
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              )}
            </div>
          )}
          
          {/* Input Row */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageSelect}
              className="hidden"
            />
            <Button
              size="icon"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={sendMessageMutation.isPending || !conversationId || !!selectedImage}
              data-testid="button-image-upload"
              title="Enviar imagem"
            >
              <ImageIcon className="w-4 h-4" />
            </Button>
            <Button
              size="icon"
              variant={isRecording ? "destructive" : "outline"}
              onClick={isRecording ? stopRecording : startRecording}
              disabled={sendMessageMutation.isPending || !conversationId || !!audioBlob}
              data-testid="button-audio-record"
              title={isRecording ? "Parar gravação" : "Gravar áudio"}
            >
              <Mic className={cn("w-4 h-4", isRecording && "animate-pulse")} />
            </Button>
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
              disabled={(!input.trim() && !selectedImage && !audioBlob) || sendMessageMutation.isPending || !conversationId}
              size="icon"
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
