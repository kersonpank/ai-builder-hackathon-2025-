import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import AuthSwitch from "@/components/ui/auth-switch";

export default function Login() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-100 via-indigo-50 to-blue-100 p-4">
      <div className="w-full max-w-5xl">
        <AuthSwitch />
        
        <div className="mt-6 text-center">
          <Link href="/admin/login">
            <Button variant="ghost" size="sm" data-testid="link-admin">
              Acesso Administrativo
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
