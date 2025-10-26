# Plano de Implementação: Sistema Omnichannel com Identificação Única de Clientes

## Análise da Situação Atual

### Estado Atual do Sistema
O Omni.AI é uma plataforma B2B SaaS multi-tenant com as seguintes características:

**✅ Funcionalidades Implementadas:**
- Multi-tenancy completo com empresas isoladas
- ChatWeb funcional com IA conversacional (GPT-4)
- Catálogo de produtos com imagens
- Sistema de pedidos com código de confirmação
- Tabela de clientes básica (phone único por empresa)
- Admin panel com logs
- Carrinho de compras e checkout

**⚠️ Limitações Identificadas:**
1. **Identificação de clientes limitada**: Apenas telefone é usado como identificador único
2. **Falta de deduplicação cross-canal**: Mesmo cliente em diferentes canais = registros duplicados
3. **Ausência de CPF/CNPJ**: Essencial para vendas B2B
4. **Canais simulados**: WhatsApp e Instagram não implementados
5. **Sem agrupamento inteligente**: Dados do cliente não são consolidados
6. **Falta normalização de telefone**: +55, (11), 11 são tratados como diferentes

---

## Objetivos do Projeto

### 1. Sistema de Identificação Única (Customer Identity Resolution)
Criar um sistema robusto que identifica o mesmo cliente através de múltiplos canais usando:
- Telefone (normalizado)
- Email
- CPF/CNPJ
- IP (opcional, para tracking)
- Device ID (futuro)

### 2. Consolidação de Dados (Customer Data Platform - CDP)
Agrupar automaticamente dados do mesmo cliente:
- Histórico de conversas em todos os canais
- Pedidos consolidados
- Preferências e comportamentos
- Valor total do cliente (LTV)

### 3. Vendas B2B
Suportar clientes empresariais:
- Campos específicos: CNPJ, Razão Social, Inscrição Estadual
- Múltiplos contatos por empresa
- Histórico de compras corporativas

---

## Plano de Implementação

### FASE 1: Reformulação do Schema de Clientes (PRIORITÁRIA)

#### 1.1. Nova Estrutura da Tabela `customers`

**Campos de Identificação:**
```typescript
// Identificadores únicos
phone: text("phone").notNull()              // Telefone normalizado
phoneRaw: text("phone_raw")                 // Telefone original
email: text("email")                        // Email
cpf: text("cpf")                            // CPF (pessoa física)
cnpj: text("cnpj")                          // CNPJ (pessoa jurídica)
customerType: text("customer_type")         // 'individual' ou 'business'

// Para empresas (B2B)
companyName: text("company_name")           // Razão social
tradeName: text("trade_name")               // Nome fantasia
stateRegistration: text("state_registration") // Inscrição estadual

// Tracking
ipAddresses: text("ip_addresses").array()   // IPs usados
deviceIds: text("device_ids").array()       // Device fingerprints (futuro)

// Metadados
firstSeenChannel: text("first_seen_channel") // Primeiro canal de contato
channels: text("channels").array()           // Canais já utilizados
```

**Índices Compostos para Deduplicação:**
```typescript
// Criar índices únicos compostos:
// (companyId, phone) - já existe
// (companyId, email) - adicionar
// (companyId, cpf) - adicionar
// (companyId, cnpj) - adicionar
```

#### 1.2. Tabela de Merge/Unificação
```typescript
export const customerMerges = pgTable("customer_merges", {
  id: varchar("id").primaryKey(),
  companyId: varchar("company_id").notNull(),
  primaryCustomerId: varchar("primary_customer_id").notNull(), // Cliente principal
  mergedCustomerIds: text("merged_customer_ids").array(),      // IDs mesclados
  mergeReason: text("merge_reason"),                           // phone_match, email_match, manual
  mergedBy: text("merged_by"),                                 // system ou userId
  mergedAt: timestamp("merged_at").notNull(),
  metadata: jsonb("metadata"),                                 // Dados preservados
});
```

---

### FASE 2: Normalização e Deduplicação

#### 2.1. Serviço de Normalização de Telefone
```typescript
// server/utils/phoneNormalizer.ts
export function normalizePhone(phone: string): string {
  // Remove todos os caracteres não numéricos
  let cleaned = phone.replace(/\D/g, '');
  
  // Remove código do país se presente (55)
  if (cleaned.startsWith('55') && cleaned.length > 11) {
    cleaned = cleaned.substring(2);
  }
  
  // Remove zero do DDD se presente
  if (cleaned.length === 11 && cleaned.startsWith('0')) {
    cleaned = cleaned.substring(1);
  }
  
  // Formato final: 11987654321 (DDD + número)
  return cleaned;
}
```

#### 2.2. Serviço de Validação de CPF/CNPJ
```typescript
// server/utils/documentValidator.ts
export function validateCPF(cpf: string): boolean {
  // Algoritmo de validação de CPF
}

export function validateCNPJ(cnpj: string): boolean {
  // Algoritmo de validação de CNPJ
}

export function normalizeCPF(cpf: string): string {
  return cpf.replace(/\D/g, '');
}
```

#### 2.3. Motor de Deduplicação
```typescript
// server/services/customerDeduplication.ts
export class CustomerDeduplicationService {
  
  async findDuplicates(
    companyId: string, 
    identifiers: {
      phone?: string;
      email?: string;
      cpf?: string;
      cnpj?: string;
    }
  ): Promise<Customer[]> {
    // Busca por qualquer identificador único
    // Retorna possíveis duplicatas
  }
  
  async mergeCustomers(
    primaryId: string, 
    duplicateIds: string[],
    reason: string
  ): Promise<Customer> {
    // 1. Consolida dados dos duplicados no principal
    // 2. Atualiza pedidos para apontar ao principal
    // 3. Atualiza conversas
    // 4. Registra merge na tabela customerMerges
    // 5. Soft delete dos duplicados
  }
  
  async autoDeduplicateOnSave(customerData: any): Promise<Customer> {
    // Verifica duplicatas automaticamente ao salvar
    // Se encontrar, mescla automaticamente
  }
}
```

---

### FASE 3: Agente de IA para Deduplicação

#### 3.1. Sistema de Prompts Inteligente
```typescript
// server/agents/deduplicationAgent.ts
export class DeduplicationAgent {
  
  async analyzePotentialDuplicates(
    customers: Customer[]
  ): Promise<{
    confidence: number;
    shouldMerge: boolean;
    reason: string;
  }> {
    // Usa GPT-4 para analisar se clientes são a mesma pessoa
    // Analisa: nome similar, endereço, padrões de compra
    const prompt = `
      Analise se os seguintes clientes são a mesma pessoa:
      ${JSON.stringify(customers, null, 2)}
      
      Considere:
      - Similaridade de nomes (João Silva vs J Silva)
      - Endereços próximos ou iguais
      - Padrões de compra similares
      - Diferenças aceitáveis (telefone atualizado, email novo)
      
      Retorne JSON: { confidence: 0-100, shouldMerge: boolean, reason: string }
    `;
    
    // Chama OpenAI
    // Retorna análise
  }
}
```

#### 3.2. Agente de Melhoria de Prompts
```typescript
// server/agents/promptOptimizationAgent.ts
export class PromptOptimizationAgent {
  
  async analyzeConversations(): Promise<string[]> {
    // Analisa conversas com baixa conversão
    // Identifica padrões de falha
    // Sugere melhorias no prompt do agente
  }
  
  async optimizeAgentPrompt(
    currentPrompt: string, 
    metrics: ConversationMetrics
  ): Promise<string> {
    // Usa GPT-4 para melhorar o prompt baseado em métricas
    // Taxa de conversão, tempo médio, abandono
  }
}
```

---

### FASE 4: Atualização do Fluxo de Criação de Pedidos

#### 4.1. Coleta Automática de CPF/CNPJ
Atualizar o prompt do agente para coletar:
```typescript
const systemPrompt = `
...
Quando o cliente quiser fazer um pedido:

Para PESSOA FÍSICA:
1. Nome completo
2. CPF (obrigatório para vendas)
3. Telefone
4. Email (opcional)
5. Endereço completo

Para PESSOA JURÍDICA (B2B):
1. Razão Social (nome da empresa)
2. Nome Fantasia
3. CNPJ (obrigatório)
4. Inscrição Estadual (se aplicável)
5. Nome do responsável
6. Telefone
7. Email corporativo
8. Endereço de entrega

IMPORTANTE: Pergunte "A compra é para você ou para uma empresa?" 
para determinar se é B2C ou B2B.
...
`;
```

#### 4.2. Function Calling Atualizada
```typescript
{
  name: "create_order",
  parameters: {
    customerType: { 
      type: "string", 
      enum: ["individual", "business"],
      description: "Tipo de cliente: pessoa física ou jurídica"
    },
    // Para pessoa física
    cpf: { type: "string", description: "CPF do cliente (apenas números)" },
    
    // Para pessoa jurídica
    cnpj: { type: "string", description: "CNPJ da empresa" },
    companyName: { type: "string", description: "Razão social" },
    tradeName: { type: "string", description: "Nome fantasia" },
    stateRegistration: { type: "string", description: "Inscrição estadual" },
    
    // Comum
    customerName: { ... },
    phone: { ... },
    email: { ... },
    // ...
  }
}
```

---

### FASE 5: Dashboard de Clientes Aprimorado

#### 5.1. Visão 360° do Cliente
```typescript
// client/src/pages/customer-detail.tsx
// Exibir:
- Todos os identificadores (telefone, email, CPF/CNPJ)
- Histórico completo de pedidos (todos os canais)
- Conversas em todos os canais
- Gráfico de LTV (Lifetime Value)
- Produtos mais comprados
- Frequência de compra
- Canais preferidos
- Última interação
```

#### 5.2. Detecção de Duplicatas em Tempo Real
```typescript
// Interface para revisar duplicatas detectadas
- Lista de possíveis duplicatas
- Score de confiança (IA)
- Botão "Mesclar" ou "Ignorar"
- Histórico de mesclagens
```

---

### FASE 6: Multi-Agent System (Futuro)

#### 6.1. Arquitetura de Agentes
```
┌─────────────────────────────────────┐
│   Orchestrator Agent (Coordenador)   │
└─────────────────┬───────────────────┘
                  │
        ┌─────────┴──────────┐
        │                    │
┌───────▼────────┐  ┌───────▼────────┐
│ Sales Agent    │  │ Support Agent  │
│ (Vendas)       │  │ (Suporte)      │
└────────────────┘  └────────────────┘
        │                    │
┌───────▼────────┐  ┌───────▼────────┐
│ Deduplication  │  │ Prompt         │
│ Agent          │  │ Optimizer      │
└────────────────┘  └────────────────┘
```

#### 6.2. Responsabilidades
- **Orchestrator**: Roteia conversas para agente apropriado
- **Sales Agent**: Foco em vendas e recomendações
- **Support Agent**: Rastreamento de pedidos, dúvidas
- **Deduplication Agent**: Consolida clientes automaticamente
- **Prompt Optimizer**: Melhora contínua dos prompts

---

## Priorização de Implementação

### 🔴 ALTA PRIORIDADE (Implementar agora)
1. ✅ **Adicionar campos CPF/CNPJ à tabela customers**
2. ✅ **Criar serviço de normalização de telefone**
3. ✅ **Atualizar prompt do agente para coletar CPF/CNPJ**
4. ✅ **Adicionar campos B2B (companyName, tradeName, etc.)**
5. ✅ **Implementar validação de CPF/CNPJ**

### 🟡 MÉDIA PRIORIDADE (Próximas sprints)
6. Criar motor de deduplicação básico
7. Adicionar tabela customerMerges
8. Implementar UI de detecção de duplicatas
9. Criar visão 360° do cliente
10. Adicionar tracking de IPs

### 🟢 BAIXA PRIORIDADE (Backlog)
11. Agente de IA para deduplicação
12. Agente de otimização de prompts
13. Sistema multi-agente completo
14. Device fingerprinting
15. Integração real com WhatsApp/Instagram

---

## Checklist de Implementação Imediata

### Etapa 1: Schema do Banco de Dados
- [ ] Adicionar campo `cpf` (text, nullable)
- [ ] Adicionar campo `cnpj` (text, nullable)
- [ ] Adicionar campo `customerType` ('individual' | 'business')
- [ ] Adicionar campo `phoneRaw` (telefone original)
- [ ] Adicionar campo `companyName` (razão social)
- [ ] Adicionar campo `tradeName` (nome fantasia)
- [ ] Adicionar campo `stateRegistration` (IE)
- [ ] Adicionar campo `firstSeenChannel`
- [ ] Adicionar campo `channels` (array)
- [ ] Criar índices únicos: (companyId, cpf), (companyId, cnpj)
- [ ] Executar migration

### Etapa 2: Utilitários
- [ ] Criar `server/utils/phoneNormalizer.ts`
- [ ] Criar `server/utils/documentValidator.ts`
- [ ] Criar testes unitários para normalização

### Etapa 3: Lógica de Negócio
- [ ] Atualizar `storage.createCustomer` para normalizar telefone
- [ ] Atualizar `storage.getCustomerByPhone` para usar telefone normalizado
- [ ] Adicionar métodos `getCustomerByCPF` e `getCustomerByCNPJ`
- [ ] Modificar fluxo de criação de pedidos para salvar CPF/CNPJ

### Etapa 4: Prompt do Agente
- [ ] Atualizar system prompt para identificar tipo de cliente
- [ ] Adicionar coleta de CPF para pessoa física
- [ ] Adicionar coleta de CNPJ + dados empresariais para PJ
- [ ] Atualizar function calling com novos parâmetros

### Etapa 5: Frontend
- [ ] Atualizar página de clientes para mostrar CPF/CNPJ
- [ ] Adicionar filtro por tipo de cliente (PF/PJ)
- [ ] Exibir razão social para clientes empresariais
- [ ] Adicionar badge de tipo de cliente

### Etapa 6: Validação
- [ ] Testar criação de pedido PF com CPF
- [ ] Testar criação de pedido PJ com CNPJ
- [ ] Verificar deduplicação por telefone normalizado
- [ ] Validar formatação de CPF/CNPJ no frontend

---

## Métricas de Sucesso

### Curto Prazo
- ✅ 100% dos pedidos com CPF ou CNPJ
- ✅ Redução de 80% em duplicatas por telefone
- ✅ Suporte completo a vendas B2B

### Médio Prazo
- 🎯 Redução de 95% em duplicatas cross-identificador
- 🎯 Consolidação automática de 90% dos casos
- 🎯 LTV calculado com precisão para cada cliente

### Longo Prazo
- 🚀 Sistema multi-agente operacional
- 🚀 Otimização automática de prompts
- 🚀 Integração real com todos os canais

---

## Riscos e Mitigações

### Risco 1: Dados Existentes
**Problema**: Clientes já cadastrados sem CPF/CNPJ  
**Mitigação**: 
- Campos nullable (opcional)
- Campanha para coletar dados faltantes
- Agente pergunta CPF em próxima interação

### Risco 2: Performance
**Problema**: Queries de deduplicação lentas  
**Mitigação**:
- Índices bem planejados
- Deduplicação assíncrona (background jobs)
- Cache de resultados

### Risco 3: Mesclagens Incorretas
**Problema**: Juntar clientes diferentes  
**Mitigação**:
- Confirmação manual para baixa confiança
- Log completo de mesclagens
- Capacidade de "desfazer" merge

---

## Conclusão

Este plano transforma o Omni.AI em uma verdadeira plataforma omnichannel com:
- ✅ Identificação robusta de clientes
- ✅ Suporte completo a B2B
- ✅ Deduplicação inteligente
- ✅ Consolidação de dados cross-canal
- ✅ Base para sistema multi-agente

**Próximo Passo**: Implementar Etapa 1-6 do checklist imediato.
