import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
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

const translations = {
  pt: {
    appName: "Omni.AI",
    tagline: "Inteligência artificial para vendas conversacionais",
    signIn: "Entrar",
    signUp: "Cadastrar",
    newHere: "Novo por aqui?",
    newHereDesc: "Junte-se a nós hoje e descubra um mundo de possibilidades. Crie sua conta em segundos!",
    alreadyMember: "Já tem conta?",
    alreadyMemberDesc: "Bem-vindo de volta! Entre para continuar sua jornada conosco.",
    email: "Email",
    password: "Senha",
    fullName: "Nome completo",
    loading: "ENTRANDO...",
    signInButton: "ENTRAR",
    signUpButton: "CADASTRAR",
    socialLogin: "Em breve o login com redes sociais",
    socialSignup: "Em breve o login com redes sociais",
    errors: {
      invalidEmail: "Email inválido",
      passwordMin: "Senha deve ter no mínimo 6 caracteres",
      loginError: "Erro no login",
      loginErrorDesc: "Credenciais inválidas. Verifique seus dados e tente novamente.",
    },
  },
  en: {
    appName: "Omni.AI",
    tagline: "Artificial intelligence for conversational sales",
    signIn: "Sign In",
    signUp: "Sign Up",
    newHere: "New here?",
    newHereDesc: "Join us today and discover a world of possibilities. Create your account in seconds!",
    alreadyMember: "Already a member?",
    alreadyMemberDesc: "Welcome back! Sign in to continue your journey with us.",
    email: "Email",
    password: "Password",
    fullName: "Full name",
    loading: "LOADING...",
    signInButton: "SIGN IN",
    signUpButton: "SIGN UP",
    socialLogin: "Social login coming soon",
    socialSignup: "Social login coming soon",
    errors: {
      invalidEmail: "Invalid email",
      passwordMin: "Password must be at least 6 characters",
      loginError: "Login error",
      loginErrorDesc: "Invalid credentials. Please check your details and try again.",
    },
  },
  es: {
    appName: "Omni.AI",
    tagline: "Inteligencia artificial para ventas conversacionales",
    signIn: "Iniciar sesión",
    signUp: "Registrarse",
    newHere: "¿Nuevo aquí?",
    newHereDesc: "Únete a nosotros hoy y descubre un mundo de posibilidades. ¡Crea tu cuenta en segundos!",
    alreadyMember: "¿Ya tienes cuenta?",
    alreadyMemberDesc: "¡Bienvenido de nuevo! Inicia sesión para continuar tu viaje con nosotros.",
    email: "Correo electrónico",
    password: "Contraseña",
    fullName: "Nombre completo",
    loading: "CARGANDO...",
    signInButton: "INICIAR SESIÓN",
    signUpButton: "REGISTRARSE",
    socialLogin: "Inicio de sesión social próximamente",
    socialSignup: "Inicio de sesión social próximamente",
    errors: {
      invalidEmail: "Correo electrónico inválido",
      passwordMin: "La contraseña debe tener al menos 6 caracteres",
      loginError: "Error de inicio de sesión",
      loginErrorDesc: "Credenciales inválidas. Por favor, verifica tus datos e intenta de nuevo.",
    },
  },
};

const languages = [
  { code: "pt", label: "PT" },
  { code: "en", label: "EN" },
  { code: "es", label: "ES" },
];

export default function AuthSwitch() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [language, setLanguage] = useState<"pt" | "en" | "es">("pt");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const t = translations[language];

  const loginSchema = useMemo(() => z.object({
    email: z.string().email(t.errors.invalidEmail),
    password: z.string().min(6, t.errors.passwordMin),
  }), [language]);

  type LoginForm = z.infer<typeof loginSchema>;

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
        title: t.errors.loginError,
        description: t.errors.loginErrorDesc,
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
      {/* Desktop Layout */}
      <div className="hidden md:block relative w-full h-[600px] bg-background rounded-3xl overflow-hidden shadow-2xl">
        {/* Language Selector - Desktop */}
        <div className="absolute top-6 right-6 z-50 flex gap-2">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setLanguage(lang.code as "pt" | "en" | "es")}
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
                  <h1 className="text-5xl font-bold">{t.appName}</h1>
                </div>
                <h2 className="text-3xl font-bold">{t.newHere}</h2>
                <p className="text-lg text-indigo-100">
                  {t.newHereDesc}
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setMode("signup")}
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 transition-all duration-300 px-12 rounded-full"
                  data-testid="button-signup-cta"
                >
                  {t.signUpButton}
                </Button>
              </motion.div>
            ) : (
              <motion.div
                key="signup-cta-left"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 max-w-md text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Sparkles className="w-10 h-10" />
                  <h1 className="text-5xl font-bold">{t.appName}</h1>
                </div>
                <h2 className="text-3xl font-bold">{t.newHere}</h2>
                <p className="text-lg">
                  {t.newHereDesc}
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSignUpClick}
                  className="bg-indigo-600 border-2 border-indigo-600 text-white hover:bg-indigo-700 hover:border-indigo-700 transition-all duration-300 px-12 rounded-full"
                  data-testid="button-signup"
                >
                  {t.signUpButton}
                </Button>
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
                <h1 className="text-4xl font-bold text-center">{t.signIn}</h1>
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
                                placeholder={t.email}
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
                                placeholder={t.password}
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
                      {loginMutation.isPending ? t.loading : t.signInButton}
                    </Button>
                  </form>
                </Form>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {t.socialLogin}
                  </p>
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
                <h2 className="text-3xl font-bold">{t.alreadyMember}</h2>
                <p className="text-lg text-indigo-100">
                  {t.alreadyMemberDesc}
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setMode("signin")}
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 transition-all duration-300 px-12 rounded-full"
                  data-testid="button-signin-cta"
                >
                  {t.signInButton}
                </Button>
              </motion.div>
            )}
          </motion.div>
        </div>
      </div>

      {/* Mobile Layout */}
      <div className="md:hidden bg-background rounded-3xl overflow-hidden shadow-2xl">
        <div className="flex flex-col">
          {/* Mobile Header with Logo and Language Selector */}
          <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 text-white p-6 text-center relative">
            {/* Language Selector - Mobile */}
            <div className="absolute top-2 right-2 flex gap-1">
              {languages.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setLanguage(lang.code as "pt" | "en" | "es")}
                  className={cn(
                    "flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all",
                    language === lang.code
                      ? "bg-white text-indigo-600 shadow-md"
                      : "bg-indigo-700/50 text-white"
                  )}
                  data-testid={`button-lang-${lang.code}-mobile`}
                >
                  <Globe className="w-3 h-3" />
                  <span>{lang.label}</span>
                </button>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-8 h-8" />
              <h1 className="text-4xl font-bold">{t.appName}</h1>
            </div>
            <p className="text-sm text-indigo-100">
              {t.tagline}
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
              {t.signIn}
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
              {t.signUp}
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
                                placeholder={t.email}
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
                                placeholder={t.password}
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
                      {loginMutation.isPending ? t.loading : t.signInButton}
                    </Button>
                  </form>
                </Form>
                <div className="text-center">
                  <p className="text-xs text-muted-foreground">
                    {t.socialLogin}
                  </p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="mobile-signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6 text-center"
              >
                <h2 className="text-2xl font-bold">{t.newHere}</h2>
                <p className="text-sm text-muted-foreground">
                  {t.newHereDesc}
                </p>
                <Button
                  onClick={handleSignUpClick}
                  size="lg"
                  className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-semibold"
                  data-testid="button-signup-mobile"
                >
                  {t.signUpButton}
                </Button>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
