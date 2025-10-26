# Análise e Resolução: Perda de Contexto do Agente IA

## 📊 Problema Identificado

O agente continua respondendo com "Olá! Como posso ajudar você hoje?" mesmo quando já há histórico de conversa, fazendo parecer que perdeu o contexto.

## 🔍 Investigação Profunda

### Arquivos Analisados
- `server/routes.ts` (linhas 1360-2144): Fluxo completo de mensagens
- `server/storage.ts` (linhas 465-472): Persistência de mensagens
- Logs do sistema: Confirmam que histórico está sendo carregado corretamente

### Descobertas

#### ✅ O que ESTÁ funcionando corretamente:
1. **Salvamento de mensagens**: Todas as mensagens (user/assistant) são salvas no banco
2. **Carregamento do histórico**: As mensagens são carregadas corretamente do banco
3. **Filtragem anti-duplicação**: A mensagem atual não é duplicada (linha 1491)
4. **Ordenação**: Mensagens estão em ordem cronológica crescente
5. **Contexto enviado ao OpenAI**: O array `openaiMessages` contém histórico completo

**Evidência dos logs:**
```
📊 Conversation context: {
  totalMessages: 7,
  historyMessages: 6,  // ✓ Histórico sendo carregado
  historyUsed: 6,      // ✓ 6 mensagens enviadas ao OpenAI
  currentContent: 'Quero duas mangas ,'
}
```

#### ❌ PROBLEMA RAIZ ENCONTRADO:

**Localização:** `server/routes.ts`, linha 1426

```typescript
PASSO 1: PRODUTO
→ Se é a primeira mensagem: cumprimente  // ← PROBLEMA AQUI
→ Identifique qual produto o cliente quer
```

**Por que é um problema:**
A instrução no prompt diz "Se é a primeira mensagem: cumprimente", mas o modelo NÃO TEM FORMA DE SABER se é a primeira mensagem ou não! O prompt não contém nenhuma informação condicional sobre o tamanho do histórico.

O OpenAI recebe:
1. System prompt (com a instrução de cumprimentar)
2. Histórico de mensagens
3. Mensagem atual

Mas como a instrução está no **system prompt** (que é fixo), o modelo pode interpretar que deve cumprimentar sempre, especialmente quando muda de specialist (de "consultant" para "seller", por exemplo).

## 🎯 Estratégia de Correção

### Solução Principal: Prompt Condicional Baseado em Histórico

**Objetivo:** Modificar o system prompt para incluir instrução de cumprimento SOMENTE quando não há histórico.

### Mudanças Necessárias

#### 1. Adicionar Lógica Condicional (server/routes.ts, ~linha 1425)

**ANTES:**
```typescript
PASSO 1: PRODUTO
→ Se é a primeira mensagem: cumprimente
→ Identifique qual produto o cliente quer
```

**DEPOIS:**
```typescript
PASSO 1: PRODUTO
${conversationHistory.length === 0 
  ? '→ Esta é a PRIMEIRA mensagem da conversa: cumprimente o cliente de forma amigável' 
  : '→ JÁ EXISTE HISTÓRICO: Continue a conversa naturalmente SEM cumprimentar novamente'}
→ Identifique qual produto o cliente quer
```

#### 2. Adicionar Regra Explícita Anti-Repetição (server/routes.ts, ~linha 1418)

Adicionar ANTES do FLUXO SIMPLES:

```typescript
⚠️ REGRA CRÍTICA - CONTEXTO:
${conversationHistory.length > 0 
  ? `ATENÇÃO: Esta conversa JÁ TEM ${conversationHistory.length} mensagens anteriores!
     - NÃO cumprimente novamente
     - NÃO pergunte "como posso ajudar"
     - CONTINUE a conversa de onde parou
     - LEIA as mensagens anteriores para entender o contexto`
  : 'Esta é a PRIMEIRA mensagem da conversa. Cumprimente o cliente.'}
```

#### 3. Melhorar Fallback (server/routes.ts, linha 2068)

**ANTES:**
```typescript
if (!assistantMessage || assistantMessage.length === 0) {
  assistantMessage = "Olá! Como posso ajudar você hoje?";
}
```

**DEPOIS:**
```typescript
if (!assistantMessage || assistantMessage.length === 0) {
  assistantMessage = conversationHistory.length === 0 
    ? "Olá! Como posso ajudar você hoje?" 
    : "Desculpe, pode reformular? Não entendi.";
}
```

### Implementação Passo a Passo

1. **Modificar construção do systemPrompt** (linha ~1399-1483)
   - Adicionar lógica condicional baseada em `conversationHistory.length`
   - Incluir regra explícita anti-repetição

2. **Atualizar fallback** (linha ~2068)
   - Tornar condicional ao histórico

3. **Testar cenários**
   - [ ] Primeira mensagem deve ter cumprimento
   - [ ] Segunda mensagem NÃO deve cumprimentar
   - [ ] Mensagens subsequentes devem manter contexto
   - [ ] Mudança de specialist NÃO deve resetar contexto

## 🔄 Efeitos Colaterais a Monitorar

1. **Specialist Routing:** Quando muda de "consultant" → "seller", garantir que não reseta
2. **Conversation Analysis:** Garantir que análise de sentimento não interfere
3. **Tool Calls:** Verificar que chamar funções não quebra contexto
4. **Product Messages:** Mensagens de produto separadas não devem confundir histórico

## ✅ Critérios de Sucesso

1. ✅ Primeira mensagem: "Olá! Como posso ajudar?"
2. ✅ Segunda mensagem em diante: Continua conversa sem cumprimentar
3. ✅ Logs mostram histórico sendo usado
4. ✅ OpenAI recebe contexto completo
5. ✅ Nenhum reset de contexto entre mensagens

## 📝 Notas Técnicas

### Por que funcionava antes?
Provavelmente havia uma versão anterior do prompt sem a instrução "Se é a primeira mensagem: cumprimente", ou essa instrução estava condicionada de alguma forma.

### Por que o problema apareceu agora?
A simplificação do fluxo de 10 etapas para 3 passos introduziu essa instrução sem a lógica condicional necessária.

### Arquitetura do Fluxo de Mensagens

```
User envia mensagem
    ↓
1. Salva mensagem do usuário (linha 1320)
    ↓
2. Análise de conversa (linha 1341)
    ↓
3. Seleciona specialist (linha 1397)
    ↓
4. Constrói system prompt (linha 1399-1483) ← PROBLEMA AQUI
    ↓
5. Carrega histórico SEM mensagem atual (linha 1488-1513)
    ↓
6. Monta array para OpenAI (linha 1540-1544)
    ↓
7. Chama OpenAI (linha 1662-1669)
    ↓
8. Processa resposta + tool calls (linha 1675-2063)
    ↓
9. Salva resposta do assistente (linha 2095-2100)
    ↓
10. Retorna para frontend (linha 2136-2139)
```

## 🚀 Implementação

O código será atualizado seguindo esta estratégia para resolver definitivamente o problema de perda de contexto.
