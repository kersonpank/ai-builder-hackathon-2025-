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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { LogIn, UserPlus } from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AuthSwitch() {
  const [mode, setMode] = useState<"login" | "register">("login");
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

  const handleRegisterClick = () => {
    setLocation("/onboarding");
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex gap-2 p-1 bg-muted rounded-lg mb-6">
        <button
          onClick={() => setMode("login")}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all duration-200",
            mode === "login"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover-elevate"
          )}
          data-testid="button-switch-login"
        >
          <LogIn className="w-4 h-4 inline mr-2" />
          Entrar
        </button>
        <button
          onClick={() => setMode("register")}
          className={cn(
            "flex-1 py-2.5 px-4 rounded-md font-medium text-sm transition-all duration-200",
            mode === "register"
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover-elevate"
          )}
          data-testid="button-switch-register"
        >
          <UserPlus className="w-4 h-4 inline mr-2" />
          Cadastrar
        </button>
      </div>

      <motion.div
        key={mode}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2 }}
      >
        {mode === "login" ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="seu@email.com"
                        data-testid="input-email"
                        {...field}
                      />
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
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input
                        type="password"
                        placeholder="••••••"
                        data-testid="input-password"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="w-full"
                size="lg"
                disabled={loginMutation.isPending}
                data-testid="button-login"
              >
                {loginMutation.isPending ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </Form>
        ) : (
          <div className="space-y-4">
            <div className="text-center space-y-3">
              <p className="text-muted-foreground">
                Crie sua conta e comece a vender com IA em minutos
              </p>
              <Button
                onClick={handleRegisterClick}
                className="w-full"
                size="lg"
                data-testid="button-start-onboarding"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Começar Cadastro
              </Button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
