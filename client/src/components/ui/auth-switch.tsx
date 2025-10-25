import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { Mail, Lock, User, Sparkles, Globe } from "lucide-react";
import { SiGoogle, SiFacebook, SiX, SiLinkedin } from "react-icons/si";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

const languages = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

export default function AuthSwitch() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [language, setLanguage] = useState("pt");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginForm) => {
      const response = await apiRequest("POST", "/api/auth/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.token);
      localStorage.setItem("user_type", "user");
      localStorage.setItem("company_id", data.company.id);
      setLocation("/dashboard");
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: "Erro no login",
        description: "Credenciais inválidas. Verifique seus dados e tente novamente.",
      });
    },
  });

  const onSubmit = (data: LoginForm) => {
    loginMutation.mutate(data);
  };

  const handleSignUpClick = () => {
    setLocation("/onboarding");
  };

  return (
    <div className="relative w-full">
      {/* Language Selector */}
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {languages.map((lang) => (
          <button
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
              language === lang.code
                ? "bg-indigo-600 text-white shadow-md"
                : "bg-white/90 text-gray-700 hover-elevate"
            )}
            data-testid={`button-lang-${lang.code}`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang.label}</span>
          </button>
        ))}
      </div>

      {/* Desktop Layout */}
      <div className="hidden md:block relative w-full h-[600px] bg-background rounded-3xl overflow-hidden shadow-2xl">
        <div className="grid grid-cols-2 h-full">
          {/* Left Panel */}
          <motion.div
            initial={false}
            animate={{
              background: mode === "signin"
                ? "linear-gradient(135deg, rgb(99, 102, 241), rgb(168, 85, 247), rgb(59, 130, 246))"
                : "transparent",
            }}
            transition={{ duration: 0.5 }}
            className={cn(
              "relative flex flex-col items-center justify-center p-12 text-white",
              mode === "signup" && "bg-background text-foreground"
            )}
            style={{
              clipPath: mode === "signin" ? "polygon(0 0, 100% 0, 85% 100%, 0% 100%)" : "none",
            }}
          >
            {mode === "signin" ? (
              <motion.div
                key="signup-cta"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 max-w-md text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-10 h-10" />
                  <h1 className="text-5xl font-bold">Omni.AI</h1>
                </div>
                <h2 className="text-3xl font-bold">Novo por aqui?</h2>
                <p className="text-lg text-indigo-100">
                  Junte-se a nós hoje e descubra um mundo de possibilidades. Crie sua conta em segundos!
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setMode("signup")}
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 transition-all duration-300 px-12 rounded-full"
                  data-testid="button-signup-cta"
                >
                  CADASTRAR
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="signup-form"
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md space-y-6"
              >
                <h1 className="text-4xl font-bold text-center">Cadastro</h1>
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                    <Input
                      type="text"
                      placeholder="Nome completo"
                      className="pl-12 h-14 bg-muted border-0 rounded-full text-base"
                      data-testid="input-username"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                    <Input
                      type="email"
                      placeholder="Email"
                      className="pl-12 h-14 bg-muted border-0 rounded-full text-base"
                      data-testid="input-signup-email"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
                    <Input
                      type="password"
                      placeholder="Senha"
                      className="pl-12 h-14 bg-muted border-0 rounded-full text-base"
                      data-testid="input-signup-password"
                    />
                  </div>
                  <Button
                    onClick={handleSignUpClick}
                    size="lg"
                    className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-base font-semibold"
                    data-testid="button-signup"
                  >
                    CADASTRAR
                  </Button>
                </div>
                <div className="space-y-4">
                  <p className="text-center text-sm text-muted-foreground">
                    Ou cadastre-se com redes sociais
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                      data-testid="button-google-signup"
                      aria-label="Cadastrar com Google"
                    >
                      <SiGoogle className="w-5 h-5" />
                    </button>
                    <button
                      className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                      data-testid="button-facebook-signup"
                      aria-label="Cadastrar com Facebook"
                    >
                      <SiFacebook className="w-5 h-5" />
                    </button>
                    <button
                      className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                      data-testid="button-twitter-signup"
                      aria-label="Cadastrar com X"
                    >
                      <SiX className="w-5 h-5" />
                    </button>
                    <button
                      className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                      data-testid="button-linkedin-signup"
                      aria-label="Cadastrar com LinkedIn"
                    >
                      <SiLinkedin className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right Panel */}
          <motion.div
            initial={false}
            animate={{
              background: mode === "signup"
                ? "linear-gradient(135deg, rgb(99, 102, 241), rgb(168, 85, 247), rgb(59, 130, 246))"
                : "transparent",
            }}
            transition={{ duration: 0.5 }}
            className={cn(
              "relative flex flex-col items-center justify-center p-12",
              mode === "signin" ? "bg-background text-foreground" : "text-white"
            )}
            style={{
              clipPath: mode === "signup" ? "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)" : "none",
            }}
          >
            {mode === "signin" ? (
              <motion.div
                key="signin-form"
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md space-y-6"
              >
                <h1 className="text-4xl font-bold text-center">Entrar</h1>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                              <Input
                                type="email"
                                placeholder="Email"
                                className="pl-12 h-14 bg-muted border-0 rounded-full text-base"
                                data-testid="input-email"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
                              <Input
                                type="password"
                                placeholder="Senha"
                                className="pl-12 h-14 bg-muted border-0 rounded-full text-base"
                                data-testid="input-password"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      disabled={loginMutation.isPending}
                      className="w-full h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full text-base font-semibold"
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "ENTRANDO..." : "ENTRAR"}
                    </Button>
                  </form>
                </Form>
                <div className="space-y-4">
                  <p className="text-center text-sm text-muted-foreground">
                    Ou entre com redes sociais
                  </p>
                  <div className="flex justify-center gap-4">
                    <button
                      className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                      data-testid="button-google"
                      aria-label="Entrar com Google"
                    >
                      <SiGoogle className="w-5 h-5" />
                    </button>
                    <button
                      className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                      data-testid="button-facebook"
                      aria-label="Entrar com Facebook"
                    >
                      <SiFacebook className="w-5 h-5" />
                    </button>
                    <button
                      className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                      data-testid="button-twitter"
                      aria-label="Entrar com X"
                    >
                      <SiX className="w-5 h-5" />
                    </button>
                    <button
                      className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                      data-testid="button-linkedin"
                      aria-label="Entrar com LinkedIn"
                    >
                      <SiLinkedin className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="signin-cta"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 max-w-md text-center"
              >
                <h2 className="text-3xl font-bold">Já tem conta?</h2>
                <p className="text-lg text-indigo-100">
                  Bem-vindo de volta! Entre para continuar sua jornada conosco.
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setMode("signin")}
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 transition-all duration-300 px-12 rounded-full"
                  data-testid="button-signin-cta"
                >
                  ENTRAR
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden bg-background rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex flex-col">
          {/* Mobile Header with Logo */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 text-white p-8 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-8 h-8" />
              <h1 className="text-4xl font-bold">Omni.AI</h1>
            </div>
            <p className="text-sm text-indigo-100">
              Inteligência artificial para vendas conversacionais
            </p>
          </div>

          {/* Mobile Toggle */}
          <div className="flex gap-2 p-4 bg-muted">
            <button
              onClick={() => setMode("signin")}
              className={cn(
                "flex-1 py-3 px-6 rounded-full font-semibold text-sm transition-all",
                mode === "signin"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-background text-foreground hover-elevate"
              )}
              data-testid="button-mobile-signin"
            >
              Entrar
            </button>
            <button
              onClick={() => setMode("signup")}
              className={cn(
                "flex-1 py-3 px-6 rounded-full font-semibold text-sm transition-all",
                mode === "signup"
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-background text-foreground hover-elevate"
              )}
              data-testid="button-mobile-signup"
            >
              Cadastrar
            </button>
          </div>

          {/* Mobile Form Content */}
          <div className="p-6">
            {mode === "signin" ? (
              <motion.div
                key="mobile-signin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                              <Input
                                type="email"
                                placeholder="Email"
                                className="pl-12 h-12 bg-muted border-0 rounded-full"
                                data-testid="input-email-mobile"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
                              <Input
                                type="password"
                                placeholder="Senha"
                                className="pl-12 h-12 bg-muted border-0 rounded-full"
                                data-testid="input-password-mobile"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      size="lg"
                      disabled={loginMutation.isPending}
                      className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold"
                      data-testid="button-login-mobile"
                    >
                      {loginMutation.isPending ? "ENTRANDO..." : "ENTRAR"}
                    </Button>
                  </form>
                </Form>
                <div className="space-y-4">
                  <p className="text-center text-xs text-muted-foreground">
                    Ou entre com redes sociais
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover-elevate"
                      data-testid="button-google-mobile"
                    >
                      <SiGoogle className="w-4 h-4" />
                    </button>
                    <button
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover-elevate"
                      data-testid="button-facebook-mobile"
                    >
                      <SiFacebook className="w-4 h-4" />
                    </button>
                    <button
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover-elevate"
                      data-testid="button-twitter-mobile"
                    >
                      <SiX className="w-4 h-4" />
                    </button>
                    <button
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover-elevate"
                      data-testid="button-linkedin-mobile"
                    >
                      <SiLinkedin className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="mobile-signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                    <Input
                      type="text"
                      placeholder="Nome completo"
                      className="pl-12 h-12 bg-muted border-0 rounded-full"
                      data-testid="input-username-mobile"
                    />
                  </div>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                    <Input
                      type="email"
                      placeholder="Email"
                      className="pl-12 h-12 bg-muted border-0 rounded-full"
                      data-testid="input-signup-email-mobile"
                    />
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-orange-500" />
                    <Input
                      type="password"
                      placeholder="Senha"
                      className="pl-12 h-12 bg-muted border-0 rounded-full"
                      data-testid="input-signup-password-mobile"
                    />
                  </div>
                  <Button
                    onClick={handleSignUpClick}
                    size="lg"
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold"
                    data-testid="button-signup-mobile"
                  >
                    CADASTRAR
                  </Button>
                </div>
                <div className="space-y-4">
                  <p className="text-center text-xs text-muted-foreground">
                    Ou cadastre-se com redes sociais
                  </p>
                  <div className="flex justify-center gap-3">
                    <button
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover-elevate"
                      data-testid="button-google-signup-mobile"
                    >
                      <SiGoogle className="w-4 h-4" />
                    </button>
                    <button
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover-elevate"
                      data-testid="button-facebook-signup-mobile"
                    >
                      <SiFacebook className="w-4 h-4" />
                    </button>
                    <button
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover-elevate"
                      data-testid="button-twitter-signup-mobile"
                    >
                      <SiX className="w-4 h-4" />
                    </button>
                    <button
                      className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover-elevate"
                      data-testid="button-linkedin-signup-mobile"
                    >
                      <SiLinkedin className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
