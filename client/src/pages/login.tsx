import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AuthSwitch from "@/components/ui/auth-switch";
import { Sparkles } from "lucide-react";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-2">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h1 className="text-5xl font-bold tracking-tight">Omni.AI</h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Inteligência artificial para vendas conversacionais
            </p>
          </div>
        </div>

        <Card className="border-2">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-2xl text-center">Bem-vindo</CardTitle>
            <CardDescription className="text-center">
              Entre na sua conta ou crie uma nova
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AuthSwitch />

            <div className="mt-8 pt-6 border-t text-center">
              <Link href="/admin/login">
                <Button variant="ghost" size="sm" data-testid="link-admin">
                  Acesso Administrativo
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>
            Ao continuar, você concorda com nossos{" "}
            <a href="#" className="underline underline-offset-4 hover:text-foreground" data-testid="link-terms">
              Termos de Serviço
            </a>{" "}
            e{" "}
            <a href="#" className="underline underline-offset-4 hover:text-foreground" data-testid="link-privacy">
              Política de Privacidade
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
