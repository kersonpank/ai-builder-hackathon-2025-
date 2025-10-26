import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  ShoppingBag, 
  Zap, 
  TrendingUp, 
  Users, 
  Clock,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  BarChart3,
  Shield,
  Globe
} from "lucide-react";
import heroImage from "@assets/generated_images/AI_multichannel_commerce_assistant_da2aede2.png";
import catalogImage from "@assets/generated_images/Smart_catalog_intelligence_dashboard_960873d8.png";
import automationImage from "@assets/generated_images/Multichannel_automation_flow_diagram_c2eb8021.png";
import analyticsImage from "@assets/generated_images/Conversion_analytics_metrics_dashboard_37b7f124.png";

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#090B1A] via-[#141B2D] to-[#090B1A]">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-lg bg-background/50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#2F6BFF] to-[#A3FF90] flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-[#2F6BFF] to-[#A3FF90] bg-clip-text text-transparent">
                Omni.AI
              </span>
            </div>
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Recursos
              </a>
              <a href="#results" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Resultados
              </a>
              <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                Preços
              </a>
              <Button variant="default" data-testid="button-cta-nav">
                Começar Agora
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-20 sm:py-32">
        <div className="absolute inset-0 bg-gradient-to-b from-[#2F6BFF]/10 via-transparent to-transparent" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <Badge className="bg-[#2F6BFF]/20 text-[#A3FF90] border-[#A3FF90]/30 hover:bg-[#2F6BFF]/30">
                <Zap className="w-3 h-3 mr-1" />
                Automatize seu atendimento em minutos
              </Badge>
              
              <div className="space-y-4">
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="text-foreground">Venda mais com</span>
                  <br />
                  <span className="bg-gradient-to-r from-[#2F6BFF] to-[#A3FF90] bg-clip-text text-transparent">
                    IA Conversacional
                  </span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-xl">
                  Automatize atendimento, recomende produtos e feche vendas 24/7 através de ChatWeb, WhatsApp e Instagram com agentes de IA personalizados.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Button 
                  size="lg" 
                  className="bg-gradient-to-r from-[#2F6BFF] to-[#A3FF90] hover:opacity-90 text-white border-0 text-lg h-14 px-8"
                  data-testid="button-cta-hero"
                >
                  Testar Grátis por 7 Dias
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-[#2F6BFF] text-[#2F6BFF] hover:bg-[#2F6BFF]/10 text-lg h-14 px-8"
                  data-testid="button-demo"
                >
                  Ver Demonstração
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-6 pt-8">
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-[#A3FF90]">24/7</div>
                  <div className="text-sm text-muted-foreground">Atendimento</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-[#A3FF90]">16%+</div>
                  <div className="text-sm text-muted-foreground">Conversão</div>
                </div>
                <div className="space-y-1">
                  <div className="text-3xl font-bold text-[#A3FF90]">-70%</div>
                  <div className="text-sm text-muted-foreground">Custos</div>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-[#2F6BFF]/30 to-[#A3FF90]/30 blur-3xl rounded-full" />
              <img 
                src={heroImage} 
                alt="Omni.AI - Agente de IA multicanal" 
                className="relative rounded-2xl shadow-2xl border border-white/10"
                data-testid="img-hero"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Trusted By */}
      <section className="py-12 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Confiado por empresas de e-commerce inovadoras
          </p>
          <div className="flex flex-wrap justify-center items-center gap-12 opacity-50">
            {["E-commerce Pro", "Moda Digital", "Tech Store", "Casa & Decor", "Beauty Brasil"].map((company) => (
              <div key={company} className="text-xl font-semibold text-muted-foreground">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Problem & Opportunity */}
      <section className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Seus clientes esperam <span className="text-[#2F6BFF]">respostas imediatas</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Atendimento manual é caro e limitado. Com Omni.AI, você automatiza 90%+ das conversas e aumenta vendas enquanto reduz custos.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <Card className="bg-red-500/5 border-red-500/20">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/10 flex items-center justify-center">
                  <Clock className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-2xl font-bold text-red-500">Sem Automação</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">✗</span>
                    <span>Tempo de resposta lento (horas)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">✗</span>
                    <span>Custos altos com equipe de atendimento</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">✗</span>
                    <span>Vendas perdidas fora do horário comercial</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-red-500 mt-1">✗</span>
                    <span>Informações inconsistentes sobre produtos</span>
                  </li>
                </ul>
              </CardContent>
            </Card>

            <Card className="bg-[#A3FF90]/5 border-[#A3FF90]/20">
              <CardContent className="p-8 space-y-4">
                <div className="w-12 h-12 rounded-xl bg-[#A3FF90]/10 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-[#A3FF90]" />
                </div>
                <h3 className="text-2xl font-bold text-[#A3FF90]">Com Omni.AI</h3>
                <ul className="space-y-3 text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#A3FF90] mt-1" />
                    <span>Resposta instantânea (&lt;1 segundo)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#A3FF90] mt-1" />
                    <span>Redução de 70% nos custos operacionais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#A3FF90] mt-1" />
                    <span>Atendimento 24/7 em todos os canais</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-[#A3FF90] mt-1" />
                    <span>Recomendações personalizadas que convertem</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 sm:py-32 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4 bg-[#2F6BFF]/20 text-[#2F6BFF] border-[#2F6BFF]/30">
              Recursos Poderosos
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Tudo que você precisa para <span className="text-[#2F6BFF]">vender mais</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="order-2 md:order-1">
              <img 
                src={catalogImage} 
                alt="Catálogo Inteligente" 
                className="rounded-2xl shadow-2xl border border-white/10"
                data-testid="img-catalog"
              />
            </div>
            <div className="order-1 md:order-2 space-y-6">
              <div className="w-12 h-12 rounded-xl bg-[#2F6BFF]/10 flex items-center justify-center">
                <ShoppingBag className="w-6 h-6 text-[#2F6BFF]" />
              </div>
              <h3 className="text-3xl font-bold">Catálogo Inteligente</h3>
              <p className="text-lg text-muted-foreground">
                Seu agente de IA conhece todo o catálogo e recomenda os produtos perfeitos para cada cliente, aumentando o ticket médio e a satisfação.
              </p>
              <ul className="space-y-3">
                {[
                  "Recomendações personalizadas por IA",
                  "Busca inteligente com linguagem natural",
                  "Carrinho de compras integrado",
                  "Checkout simplificado"
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 text-[#A3FF90]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="space-y-6">
              <div className="w-12 h-12 rounded-xl bg-[#A3FF90]/10 flex items-center justify-center">
                <MessageSquare className="w-6 h-6 text-[#A3FF90]" />
              </div>
              <h3 className="text-3xl font-bold">Agente IA Personalizável</h3>
              <p className="text-lg text-muted-foreground">
                Configure o tom de voz, personalidade e estratégia de vendas do seu agente. De passivo a proativo, você decide como atender seus clientes.
              </p>
              <ul className="space-y-3">
                {[
                  "3 perfis de personalidade vendedora",
                  "Instruções customizadas por segmento",
                  "Upload de documentos de contexto",
                  "Estratégias de upsell e cross-sell"
                ].map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                    <CheckCircle2 className="w-5 h-5 text-[#A3FF90]" />
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <img 
                src={automationImage} 
                alt="Automação Multicanal" 
                className="rounded-2xl shadow-2xl border border-white/10"
                data-testid="img-automation"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Globe,
                title: "Multicanal",
                description: "ChatWeb, WhatsApp e Instagram integrados em uma única plataforma"
              },
              {
                icon: Zap,
                title: "Setup em Minutos",
                description: "Comece a vender em menos de 10 minutos sem conhecimento técnico"
              },
              {
                icon: Shield,
                title: "Seguro e Confiável",
                description: "Multi-tenant com isolamento total de dados entre empresas"
              }
            ].map((feature) => (
              <Card key={feature.title} className="bg-white/[0.02] border-white/10 hover-elevate transition-all">
                <CardContent className="p-6 space-y-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#2F6BFF]/20 to-[#A3FF90]/20 flex items-center justify-center">
                    <feature.icon className="w-6 h-6 text-[#2F6BFF]" />
                  </div>
                  <h4 className="text-xl font-bold">{feature.title}</h4>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Results */}
      <section id="results" className="py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <Badge className="mb-4 bg-[#A3FF90]/20 text-[#A3FF90] border-[#A3FF90]/30">
              Resultados Reais
            </Badge>
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              Métricas que <span className="text-[#A3FF90]">comprovam o ROI</span>
            </h2>
            <p className="text-xl text-muted-foreground">
              Empresas que usam Omni.AI aumentam vendas e reduzem custos operacionais drasticamente
            </p>
          </div>

          <div className="mb-16">
            <img 
              src={analyticsImage} 
              alt="Dashboard de Analytics" 
              className="rounded-2xl shadow-2xl border border-white/10 mx-auto"
              data-testid="img-analytics"
            />
          </div>

          <div className="grid md:grid-cols-4 gap-8">
            {[
              { metric: "16%+", label: "Taxa de conversão", icon: TrendingUp },
              { metric: "<1s", label: "Tempo de resposta", icon: Zap },
              { metric: "24/7", label: "Disponibilidade", icon: Clock },
              { metric: "90%+", label: "Casos resolvidos", icon: CheckCircle2 }
            ].map((stat) => (
              <Card key={stat.label} className="bg-gradient-to-br from-[#2F6BFF]/10 to-[#A3FF90]/10 border-white/10">
                <CardContent className="p-6 text-center space-y-2">
                  <stat.icon className="w-8 h-8 text-[#2F6BFF] mx-auto mb-2" />
                  <div className="text-4xl font-bold bg-gradient-to-r from-[#2F6BFF] to-[#A3FF90] bg-clip-text text-transparent">
                    {stat.metric}
                  </div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 sm:py-32 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold mb-6">
              O que nossos clientes <span className="text-[#2F6BFF]">dizem</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                company: "TechStore Brasil",
                segment: "Eletrônicos",
                quote: "Automatizamos 85% do atendimento e aumentamos as vendas em 23% no primeiro mês. Incrível!",
                author: "Carlos Silva",
                role: "CEO"
              },
              {
                company: "Moda Digital",
                segment: "Fashion",
                quote: "O agente de IA recomenda produtos melhor que nossa equipe. Taxa de conversão dobrou!",
                author: "Ana Paula",
                role: "Diretora de E-commerce"
              },
              {
                company: "Casa & Decor",
                segment: "Home & Garden",
                quote: "Atendimento 24/7 sem custo adicional. Nossos clientes adoram a rapidez nas respostas.",
                author: "Roberto Martins",
                role: "Fundador"
              }
            ].map((testimonial) => (
              <Card key={testimonial.company} className="bg-white/[0.02] border-white/10">
                <CardContent className="p-8 space-y-4">
                  <div className="flex items-center gap-1 text-[#A3FF90]">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span key={star}>★</span>
                    ))}
                  </div>
                  <p className="text-lg italic text-muted-foreground">"{testimonial.quote}"</p>
                  <div className="pt-4 border-t border-white/10">
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                    <div className="text-sm text-[#2F6BFF] mt-1">{testimonial.company}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="py-20 sm:py-32">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-[#2F6BFF] to-[#A3FF90] opacity-20" />
            <div className="relative px-8 py-16 sm:px-16 sm:py-24 space-y-8">
              <h2 className="text-4xl sm:text-5xl font-bold">
                Comece a vender mais <span className="text-[#A3FF90]">hoje</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Teste grátis por 7 dias. Sem cartão de crédito. Cancele quando quiser.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg" 
                  className="bg-white text-[#2F6BFF] hover:bg-white/90 text-lg h-14 px-8"
                  data-testid="button-cta-final"
                >
                  Começar Teste Grátis
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="border-white text-white hover:bg-white/10 text-lg h-14 px-8"
                  data-testid="button-schedule-demo"
                >
                  Agendar Demonstração
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                ✓ Setup em minutos &nbsp; ✓ Suporte em português &nbsp; ✓ Garantia de 30 dias
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-12 bg-white/[0.02]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2F6BFF] to-[#A3FF90] flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">Omni.AI</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Automatize atendimento e venda mais com IA conversacional.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Produto</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#features" className="hover:text-foreground transition-colors">Recursos</a></li>
                <li><a href="#pricing" className="hover:text-foreground transition-colors">Preços</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Integrações</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Empresa</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Sobre</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Carreiras</a></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Suporte</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li><a href="#" className="hover:text-foreground transition-colors">Central de Ajuda</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Documentação</a></li>
                <li><a href="#" className="hover:text-foreground transition-colors">Contato</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 Omni.AI. Todos os direitos reservados.
            </p>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Termos</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
