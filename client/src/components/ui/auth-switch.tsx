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
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User } from "lucide-react";
import { SiGoogle, SiFacebook, SiX, SiLinkedin } from "react-icons/si";

const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function AuthSwitch() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
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
    <div className="relative w-full h-[600px] bg-background rounded-3xl overflow-hidden shadow-2xl">
      <div className="absolute inset-0 flex">
        {/* Left Panel - Animated */}
        <AnimatePresence mode="wait">
          {mode === "signin" ? (
            <motion.div
              key="signup-panel"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute left-0 top-0 w-1/2 h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 text-white flex flex-col items-center justify-center p-12 z-10"
              style={{
                clipPath: "polygon(0 0, 100% 0, 85% 100%, 0% 100%)",
              }}
            >
              <div className="space-y-6 max-w-md text-center">
                <h2 className="text-4xl font-bold">New here?</h2>
                <p className="text-lg text-indigo-100">
                  Join us today and discover a world of possibilities. Create your account in seconds!
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={handleSignUpClick}
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 transition-all duration-300 px-12 rounded-full"
                  data-testid="button-signup-cta"
                >
                  SIGN UP
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="signin-panel"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-br from-indigo-600 via-purple-600 to-blue-500 text-white flex flex-col items-center justify-center p-12 z-10"
              style={{
                clipPath: "polygon(15% 0, 100% 0, 100% 100%, 0% 100%)",
              }}
            >
              <div className="space-y-6 max-w-md text-center">
                <h2 className="text-4xl font-bold">One of us?</h2>
                <p className="text-lg text-indigo-100">
                  Welcome back! Sign in to continue your journey with us.
                </p>
                <Button
                  variant="outline"
                  size="lg"
                  onClick={() => setMode("signin")}
                  className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-indigo-600 transition-all duration-300 px-12 rounded-full"
                  data-testid="button-signin-cta"
                >
                  SIGN IN
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Right Panel - Sign In Form */}
        <motion.div
          animate={{ x: mode === "signin" ? "50%" : "0%" }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute right-0 top-0 w-1/2 h-full bg-background flex flex-col items-center justify-center p-12"
        >
          <div className="w-full max-w-md space-y-8">
            <h1 className="text-4xl font-bold text-center text-foreground">
              {mode === "signin" ? "Sign in" : "Sign up"}
            </h1>

            {mode === "signin" ? (
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
                              placeholder="Password"
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
                    {loginMutation.isPending ? "LOADING..." : "LOGIN"}
                  </Button>
                </form>
              </Form>
            ) : (
              <div className="space-y-4">
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500" />
                  <Input
                    type="text"
                    placeholder="Username"
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
                    placeholder="Password"
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
                  SIGN UP
                </Button>
              </div>
            )}

            <div className="space-y-4">
              <p className="text-center text-sm text-muted-foreground">
                Or sign {mode === "signin" ? "in" : "up"} with social platforms
              </p>
              <div className="flex justify-center gap-4">
                <button
                  className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                  data-testid="button-google"
                  aria-label="Sign in with Google"
                >
                  <SiGoogle className="w-5 h-5 text-foreground" />
                </button>
                <button
                  className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                  data-testid="button-facebook"
                  aria-label="Sign in with Facebook"
                >
                  <SiFacebook className="w-5 h-5 text-foreground" />
                </button>
                <button
                  className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                  data-testid="button-twitter"
                  aria-label="Sign in with X (Twitter)"
                >
                  <SiX className="w-5 h-5 text-foreground" />
                </button>
                <button
                  className="w-12 h-12 rounded-full bg-muted flex items-center justify-center hover-elevate transition-all"
                  data-testid="button-linkedin"
                  aria-label="Sign in with LinkedIn"
                >
                  <SiLinkedin className="w-5 h-5 text-foreground" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
