import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Building2, Bot, Package, Share2 } from "lucide-react";

const segments = [
  "E-commerce",
  "Alimentação",
  "Moda e Vestuário",
  "Beleza e Cosméticos",
  "Eletrônicos",
  "Serviços",
  "Outro",
];

const toneOptions = [
  {
    value: "Empático",
    label: "Empático",
    description: "Caloroso, acolhedor e demonstra empatia genuína",
    icon: "💙",
  },
  {
    value: "Divertido",
    label: "Divertido",
    description: "Descontraído, leve e bem-humorado",
    icon: "🎉",
  },
  {
    value: "Profissional",
    label: "Profissional",
    description: "Formal, objetivo e respeitoso",
    icon: "💼",
  },
];

const step1Schema = z.object({
  companyName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  segment: z.string().min(1, "Selecione um segmento"),
  cnpj: z.string().min(14, "CNPJ inválido"),
  userName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

const step2Schema = z.object({
  agentName: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
  toneOfVoice: z.enum(["Empático", "Divertido", "Profissional"]),
  customInstructions: z.string().max(500, "Máximo 500 caracteres").optional(),
});

type Step1Form = z.infer<typeof step1Schema>;
type Step2Form = z.infer<typeof step2Schema>;

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [companyData, setCompanyData] = useState<any>(null);

  const step1Form = useForm<Step1Form>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      companyName: "",
      segment: "",
      cnpj: "",
      userName: "",
      email: "",
      password: "",
    },
  });

  const step2Form = useForm<Step2Form>({
    resolver: zodResolver(step2Schema),
    defaultValues: {
      agentName: "",
      toneOfVoice: "Profissional",
      customInstructions: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { company: any; user: any }) => {
      const response = await apiRequest<{ token: string; user: any; company: any }>({
        url: "/api/auth/register",
        method: "POST",
        body: data,
      });
      return response;
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_type", "user");
      localStorage.setItem("company_id", data.company.id);
      setCompanyData(data.company);
      setCurrentStep(2);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: "Erro ao criar conta. Verifique seus dados e tente novamente.",
      });
    },
  });

  const agentMutation = useMutation({
    mutationFn: async (data: Step2Form) => {
      const response = await fetch("/api/agent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem("auth_token")}`,
        },
        body: JSON.stringify({
          name: data.agentName,
          toneOfVoice: data.toneOfVoice,
          customInstructions: data.customInstructions || null,
          isActive: true,
        }),
      });
      return response.json();
    },
    onSuccess: () => {
      setCurrentStep(3);
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Erro ao configurar agente. Tente novamente.",
      });
    },
  });

  const onStep1Submit = (data: Step1Form) => {
    registerMutation.mutate({
      company: {
        name: data.companyName,
        segment: data.segment,
        cnpj: data.cnpj,
        status: "active",
      },
      user: {
        name: data.userName,
        email: data.email,
        password: data.password,
      },
    });
  };

  const onStep2Submit = (data: Step2Form) => {
    agentMutation.mutate(data);
  };

  const skipToProducts = () => {
    setCurrentStep(3);
  };

  const skipToDashboard = () => {
    toast({
      title: "Configuração completa!",
      description: "Você pode adicionar produtos e configurar canais depois.",
    });
    setLocation("/dashboard");
  };

  const finishOnboarding = () => {
    toast({
      title: "Bem-vindo ao Omni.AI!",
      description: "Sua plataforma está configurada e pronta para uso.",
    });
    setLocation("/dashboard");
  };

  const steps = [
    { number: 1, title: "Empresa", icon: Building2, completed: currentStep > 1 },
    { number: 2, title: "Agente", icon: Bot, completed: currentStep > 2 },
    { number: 3, title: "Catálogo", icon: Package, completed: currentStep > 3 },
    { number: 4, title: "Canais", icon: Share2, completed: currentStep > 4 },
  ];

  const progress = ((currentStep - 1) / 4) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4 py-12">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Bem-vindo ao Omni.AI</h1>
          <p className="text-lg text-muted-foreground">
            Configure sua loja conversacional em 4 passos simples
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          <div className="grid grid-cols-4 gap-4">
            {steps.map((step) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              return (
                <div
                  key={step.number}
                  className={`flex flex-col items-center gap-2 ${
                    isActive ? "text-primary" : step.completed ? "text-green-600" : "text-muted-foreground"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : step.completed
                        ? "bg-green-600 text-white"
                        : "bg-muted"
                    }`}
                  >
                    {step.completed ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-6 h-6" />}
                  </div>
                  <span className="text-sm font-medium">{step.title}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Empresa */}
        {currentStep === 1 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Dados da Empresa</CardTitle>
              <CardDescription>
                Comece informando os dados básicos da sua empresa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...step1Form}>
                <form onSubmit={step1Form.handleSubmit(onStep1Submit)} className="space-y-4">
                  <FormField
                    control={step1Form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome da Empresa</FormLabel>
                        <FormControl>
                          <Input placeholder="Minha Loja Online" data-testid="input-company-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid md:grid-cols-2 gap-4">
                    <FormField
                      control={step1Form.control}
                      name="segment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Segmento</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-segment">
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {segments.map((segment) => (
                                <SelectItem key={segment} value={segment}>
                                  {segment}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={step1Form.control}
                      name="cnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CNPJ</FormLabel>
                          <FormControl>
                            <Input placeholder="00.000.000/0000-00" data-testid="input-company-cnpj" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="border-t pt-4 mt-6">
                    <h3 className="font-semibold mb-4">Seus Dados de Acesso</h3>
                    
                    <div className="space-y-4">
                      <FormField
                        control={step1Form.control}
                        name="userName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Seu Nome</FormLabel>
                            <FormControl>
                              <Input placeholder="João Silva" data-testid="input-user-name" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={step1Form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                              <Input type="email" placeholder="seu@email.com" data-testid="input-user-email" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={step1Form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Mínimo 6 caracteres" data-testid="input-user-password" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button type="submit" disabled={registerMutation.isPending} data-testid="button-next-step">
                      {registerMutation.isPending ? "Criando conta..." : "Continuar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Agente */}
        {currentStep === 2 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Configure seu Agente de IA</CardTitle>
              <CardDescription>
                Personalize como seu assistente virtual irá interagir com clientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...step2Form}>
                <form onSubmit={step2Form.handleSubmit(onStep2Submit)} className="space-y-6">
                  <FormField
                    control={step2Form.control}
                    name="agentName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nome do Agente</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Assistente Virtual, Ana, Bot da Loja..." data-testid="input-agent-name" {...field} />
                        </FormControl>
                        <FormDescription>
                          Este nome será usado nas conversas com clientes
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={step2Form.control}
                    name="toneOfVoice"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tom de Voz</FormLabel>
                        <FormControl>
                          <RadioGroup
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                            className="grid md:grid-cols-3 gap-4"
                          >
                            {toneOptions.map((option) => (
                              <FormItem key={option.value}>
                                <FormControl>
                                  <RadioGroupItem value={option.value} id={option.value} className="sr-only" />
                                </FormControl>
                                <FormLabel
                                  htmlFor={option.value}
                                  className={`flex flex-col items-center gap-3 rounded-xl border-2 p-6 cursor-pointer hover-elevate transition-all ${
                                    field.value === option.value
                                      ? "border-primary bg-primary/5"
                                      : "border-muted"
                                  }`}
                                  data-testid={`tone-${option.value.toLowerCase()}`}
                                >
                                  <span className="text-4xl">{option.icon}</span>
                                  <div className="text-center space-y-1">
                                    <div className="font-semibold">{option.label}</div>
                                    <div className="text-xs text-muted-foreground">
                                      {option.description}
                                    </div>
                                  </div>
                                </FormLabel>
                              </FormItem>
                            ))}
                          </RadioGroup>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={step2Form.control}
                    name="customInstructions"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Instruções Personalizadas (Opcional)</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ex: Sempre mencionar que temos frete grátis acima de R$100..."
                            className="min-h-24"
                            data-testid="input-custom-instructions"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Máximo 500 caracteres
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-between gap-3 pt-4">
                    <Button type="button" variant="outline" onClick={skipToProducts} data-testid="button-skip-agent">
                      Pular esta etapa
                    </Button>
                    <Button type="submit" disabled={agentMutation.isPending} data-testid="button-save-agent">
                      {agentMutation.isPending ? "Salvando..." : "Continuar"}
                    </Button>
                  </div>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Catálogo */}
        {currentStep === 3 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Adicione seu Catálogo</CardTitle>
              <CardDescription>
                Importe produtos ou adicione-os manualmente depois
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="border-2 border-dashed rounded-xl p-12 text-center space-y-4">
                <Package className="w-16 h-16 mx-auto text-muted-foreground" />
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Adicione produtos depois</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Você poderá adicionar produtos manualmente ou importar via CSV no painel principal.
                    Vamos pular esta etapa por enquanto.
                  </p>
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(2)} data-testid="button-back">
                  Voltar
                </Button>
                <Button onClick={() => setCurrentStep(4)} data-testid="button-next">
                  Continuar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Canais */}
        {currentStep === 4 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">Canais de Atendimento</CardTitle>
              <CardDescription>
                Seu ChatWeb já está ativo! Outros canais podem ser configurados depois
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="rounded-xl border-2 border-green-200 bg-green-50 dark:bg-green-950 dark:border-green-800 p-6">
                  <div className="flex items-start gap-4">
                    <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 mt-1" />
                    <div className="flex-1 space-y-2">
                      <div className="font-semibold text-green-900 dark:text-green-100">ChatWeb Ativo</div>
                      <p className="text-sm text-green-700 dark:text-green-300">
                        Seu chat conversacional está pronto! Compartilhe o link com seus clientes.
                      </p>
                      {companyData && (
                        <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded-lg border">
                          <code className="text-xs break-all">
                            {`${window.location.origin}/chat/${companyData.id}`}
                          </code>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-muted p-6 opacity-60">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-muted mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold">WhatsApp (Em breve)</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Integração com WhatsApp Business em desenvolvimento
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border-2 border-muted p-6 opacity-60">
                  <div className="flex items-start gap-4">
                    <div className="w-6 h-6 rounded-full bg-muted mt-1" />
                    <div className="flex-1">
                      <div className="font-semibold">Instagram Direct (Em breve)</div>
                      <p className="text-sm text-muted-foreground mt-1">
                        Integração com Instagram Direct em desenvolvimento
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-between gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setCurrentStep(3)} data-testid="button-back-channels">
                  Voltar
                </Button>
                <Button onClick={finishOnboarding} size="lg" data-testid="button-finish">
                  Ir para o Painel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
