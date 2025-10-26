import { Home, Package, ShoppingCart, MessageSquare, Settings, LogOut, Building2, Bot, FileText, Users, Headphones } from "lucide-react";
import { useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useQuery } from "@tanstack/react-query";

const userMenuItems = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Agente", url: "/agent", icon: Bot },
  { title: "Produtos", url: "/products", icon: Package },
  { title: "Pedidos", url: "/orders", icon: ShoppingCart },
  { title: "Clientes", url: "/customers", icon: Users },
  { title: "Conversas", url: "/conversations", icon: MessageSquare },
  { title: "Monitor", url: "/conversations-monitor", icon: Headphones },
];

const adminMenuItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: Home },
  { title: "Empresas", url: "/admin/companies", icon: Building2 },
  { title: "Logs", url: "/admin/logs", icon: FileText },
];

export function AppSidebar({ isAdmin = false }: { isAdmin?: boolean }) {
  const [location, setLocation] = useLocation();
  const menuItems = isAdmin ? adminMenuItems : userMenuItems;

  const { data: company } = useQuery<any>({
    queryKey: ["/api/company"],
    enabled: !isAdmin,
  });

  const handleLogout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_type");
    localStorage.removeItem("company_id");
    setLocation("/");
  };

  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-lg font-bold px-2 py-4">
            Omni.AI {isAdmin && "Admin"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.url;
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={isActive ? "bg-sidebar-accent" : ""}
                      data-testid={`nav-${item.title.toLowerCase()}`}
                    >
                      <a href={item.url} onClick={(e) => {
                        e.preventDefault();
                        setLocation(item.url);
                      }}>
                        <Icon className="w-4 h-4" />
                        <span>{item.title}</span>
                      </a>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton onClick={handleLogout} data-testid="button-logout">
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        {!isAdmin && company && (
          <div className="px-3 py-2 border-t">
            <div className="flex items-center gap-3">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                  {company.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{company.name}</div>
                <div className="text-xs text-muted-foreground truncate">{company.segment}</div>
              </div>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
