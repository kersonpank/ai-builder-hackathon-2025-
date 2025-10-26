import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, TrendingUp, Users, Brain, ThumbsUp, ThumbsDown, Minus } from "lucide-react";

interface AnalyticsData {
  overview: {
    totalConversations: number;
    activeConversations: number;
    humanTakenOver: number;
    aiHandled: number;
  };
  sentiment: {
    average: number;
    positive: number;
    neutral: number;
    negative: number;
  };
  intents: Record<string, number>;
  agentTypes: Record<string, number>;
  complexity: {
    average: number;
    low: number;
    medium: number;
    high: number;
  };
}

const intentLabels: Record<string, string> = {
  browsing: "Navegando",
  purchase_intent: "Intenção de Compra",
  support: "Suporte",
  complaint: "Reclamação",
  technical_question: "Questão Técnica",
};

const agentTypeLabels: Record<string, string> = {
  seller: "Vendedor",
  consultant: "Consultor",
  support: "Suporte",
  technical: "Técnico",
};

export default function Analytics() {
  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ["/api/conversations/analytics"],
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Carregando analytics...</div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Nenhum dado disponível</div>
      </div>
    );
  }

  const sentimentPercentage = (count: number) => {
    const total = analytics.sentiment.positive + analytics.sentiment.neutral + analytics.sentiment.negative;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  const complexityPercentage = (count: number) => {
    const total = analytics.complexity.low + analytics.complexity.medium + analytics.complexity.high;
    return total > 0 ? Math.round((count / total) * 100) : 0;
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container mx-auto p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Analytics de Conversas</h1>
          <p className="text-muted-foreground">
            Inteligência artificial analisando qualidade e desempenho dos atendimentos
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card data-testid="card-total-conversations">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-total-conversations">
                {analytics.overview.totalConversations}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.overview.activeConversations} ativas
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-ai-handled">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resolvidas por IA</CardTitle>
              <Brain className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-ai-handled">
                {analytics.overview.aiHandled}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.overview.totalConversations > 0
                  ? Math.round((analytics.overview.aiHandled / analytics.overview.totalConversations) * 100)
                  : 0}% autonomia
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-human-takeover">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Assumidas por Humanos</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-human-takeover">
                {analytics.overview.humanTakenOver}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.overview.totalConversations > 0
                  ? Math.round((analytics.overview.humanTakenOver / analytics.overview.totalConversations) * 100)
                  : 0}% taxa de transferência
              </p>
            </CardContent>
          </Card>

          <Card data-testid="card-avg-sentiment">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Sentimento Médio</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold" data-testid="text-avg-sentiment">
                {analytics.sentiment.average > 0 ? '+' : ''}{analytics.sentiment.average}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.sentiment.average > 30 ? 'Positivo' : analytics.sentiment.average < -30 ? 'Negativo' : 'Neutro'}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="card-sentiment-distribution">
            <CardHeader>
              <CardTitle>Distribuição de Sentimento</CardTitle>
              <CardDescription>Como os clientes estão se sentindo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <ThumbsUp className="h-5 w-5 text-green-600" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Positivo</span>
                    <span className="text-sm text-muted-foreground" data-testid="text-positive-count">
                      {analytics.sentiment.positive} ({sentimentPercentage(analytics.sentiment.positive)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${sentimentPercentage(analytics.sentiment.positive)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <Minus className="h-5 w-5 text-yellow-600" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Neutro</span>
                    <span className="text-sm text-muted-foreground" data-testid="text-neutral-count">
                      {analytics.sentiment.neutral} ({sentimentPercentage(analytics.sentiment.neutral)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-yellow-600 h-2 rounded-full transition-all"
                      style={{ width: `${sentimentPercentage(analytics.sentiment.neutral)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <ThumbsDown className="h-5 w-5 text-red-600" />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">Negativo</span>
                    <span className="text-sm text-muted-foreground" data-testid="text-negative-count">
                      {analytics.sentiment.negative} ({sentimentPercentage(analytics.sentiment.negative)}%)
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-red-600 h-2 rounded-full transition-all"
                      style={{ width: `${sentimentPercentage(analytics.sentiment.negative)}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="card-complexity-distribution">
            <CardHeader>
              <CardTitle>Complexidade das Conversas</CardTitle>
              <CardDescription>Dificuldade detectada pela IA</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Baixa Complexidade</span>
                  <span className="text-sm text-muted-foreground" data-testid="text-low-complexity">
                    {analytics.complexity.low} ({complexityPercentage(analytics.complexity.low)}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{ width: `${complexityPercentage(analytics.complexity.low)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Média Complexidade</span>
                  <span className="text-sm text-muted-foreground" data-testid="text-medium-complexity">
                    {analytics.complexity.medium} ({complexityPercentage(analytics.complexity.medium)}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-yellow-600 h-2 rounded-full transition-all"
                    style={{ width: `${complexityPercentage(analytics.complexity.medium)}%` }}
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">Alta Complexidade</span>
                  <span className="text-sm text-muted-foreground" data-testid="text-high-complexity">
                    {analytics.complexity.high} ({complexityPercentage(analytics.complexity.high)}%)
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-red-600 h-2 rounded-full transition-all"
                    style={{ width: `${complexityPercentage(analytics.complexity.high)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Complexidade Média</span>
                  <span className="text-lg font-bold" data-testid="text-avg-complexity">
                    {analytics.complexity.average}/100
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <Card data-testid="card-intent-distribution">
            <CardHeader>
              <CardTitle>Intenções dos Clientes</CardTitle>
              <CardDescription>O que os clientes estão buscando</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(analytics.intents).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(analytics.intents)
                    .sort(([, a], [, b]) => b - a)
                    .map(([intent, count]) => (
                      <div key={intent} className="flex items-center justify-between">
                        <span className="text-sm" data-testid={`text-intent-${intent}`}>
                          {intentLabels[intent] || intent}
                        </span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum dado disponível ainda</p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="card-agent-distribution">
            <CardHeader>
              <CardTitle>Agentes Especializados Ativos</CardTitle>
              <CardDescription>Distribuição automática de especialistas</CardDescription>
            </CardHeader>
            <CardContent>
              {Object.keys(analytics.agentTypes).length > 0 ? (
                <div className="space-y-2">
                  {Object.entries(analytics.agentTypes)
                    .sort(([, a], [, b]) => b - a)
                    .map(([agentType, count]) => (
                      <div key={agentType} className="flex items-center justify-between">
                        <span className="text-sm" data-testid={`text-agent-${agentType}`}>
                          {agentTypeLabels[agentType] || agentType}
                        </span>
                        <span className="text-sm font-medium">{count}</span>
                      </div>
                    ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Nenhum dado disponível ainda</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
