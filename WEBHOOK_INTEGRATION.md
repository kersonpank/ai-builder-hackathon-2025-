# Webhook Integration Guide - Omni.AI

Este documento descreve a estrutura de mensagens e como integrar canais externos (WhatsApp, Instagram, etc.) via webhooks.

## Estrutura de Mensagens

### Mensagem do Cliente para o Agente

```typescript
{
  conversationId: string;  // ID da conversa
  role: "user";
  content: string;         // Texto da mensagem
  metadata?: {
    imageUrl?: string;     // URL da imagem enviada pelo cliente (opcional)
    audioUrl?: string;     // URL do áudio enviado pelo cliente (opcional)
  }
}
```

### Mensagem do Agente para o Cliente

```typescript
{
  id: string;
  conversationId: string;
  role: "assistant";
  content: string;         // Texto da resposta do agente
  metadata?: {
    // Imagens de produtos mencionados (detectadas automaticamente)
    productImages?: Array<{
      name: string;        // Nome do produto
      imageUrl: string;    // URL da primeira imagem do produto
      hasMore: boolean;    // Indica se há mais imagens disponíveis
    }>;
    
    // Imagens anexadas pelo agente
    attachedImages?: Array<{
      url: string;         // URL da imagem
      caption?: string;    // Legenda opcional
    }>;
  }
}
```

## Upload de Mídia

### Imagens

Endpoint: `POST /api/company/:companyId/upload/image`

Headers:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Body:
```
file: <image_file>
```

Response:
```json
{
  "url": "/public/uploads/image-xxxxx.jpg"
}
```

### Áudio

Endpoint: `POST /api/company/:companyId/upload/audio`

Headers:
```
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

Body:
```
file: <audio_file>
```

Response:
```json
{
  "url": "/public/uploads/audio-xxxxx.mp3",
  "transcription": "Texto transcrito do áudio"
}
```

## Webhooks

### Webhook de Entrada (Canal → Omni.AI)

Quando uma mensagem chega no canal externo (WhatsApp, Instagram), o webhook deve enviar:

**Endpoint:** `POST /api/webhook/:companyId/message`

**Payload:**
```json
{
  "channel": "whatsapp" | "instagram",
  "externalConversationId": "string",  // ID da conversa no canal externo
  "customerPhone": "string",           // Telefone do cliente
  "customerName": "string",            // Nome do cliente (opcional)
  "message": {
    "type": "text" | "image" | "audio",
    "content": "string",               // Texto ou URL da mídia
    "timestamp": "ISO8601"
  }
}
```

**Resposta:**
```json
{
  "conversationId": "uuid",            // ID da conversa no Omni.AI
  "assistantMessage": {
    "id": "uuid",
    "content": "string",               // Resposta do agente
    "metadata": {
      "productImages": [...],
      "attachedImages": [...]
    }
  }
}
```

### Webhook de Saída (Omni.AI → Canal)

Quando o agente responde, o Omni.AI envia para o webhook configurado:

**Configuração no Dashboard:** `/channels/webhook-config`

**Payload enviado:**
```json
{
  "conversationId": "uuid",
  "externalConversationId": "string",  // ID que você enviou no webhook de entrada
  "channel": "whatsapp" | "instagram",
  "message": {
    "type": "text",
    "content": "string",               // Resposta do agente
    "images": [                        // Imagens a serem enviadas
      {
        "url": "string",
        "caption": "string"
      }
    ],
    "timestamp": "ISO8601"
  }
}
```

## Fluxo de Integração

1. **Cliente envia mensagem no canal externo**
   - WhatsApp/Instagram recebe a mensagem
   - Webhook envia para `/api/webhook/:companyId/message`

2. **Omni.AI processa**
   - Cria/recupera conversa
   - Processa mídia (se houver)
   - Envia para o agente IA
   - Detecta produtos mencionados
   - Gera resposta

3. **Omni.AI responde**
   - Salva mensagem do agente
   - Envia webhook de saída para o canal
   - Canal externo envia mensagem ao cliente

## Exemplo Completo: WhatsApp

### 1. Cliente envia mensagem de texto

```bash
curl -X POST https://omni.ai/api/webhook/company-123/message \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "whatsapp",
    "externalConversationId": "5511999999999",
    "customerPhone": "+5511999999999",
    "customerName": "João Silva",
    "message": {
      "type": "text",
      "content": "Olá! Quero saber sobre produtos de eletrônicos",
      "timestamp": "2025-10-26T01:00:00Z"
    }
  }'
```

### 2. Omni.AI responde

Response:
```json
{
  "conversationId": "conv-uuid-123",
  "assistantMessage": {
    "id": "msg-uuid-456",
    "content": "Olá João! 😊 Temos ótimos produtos de eletrônicos! Te recomendo o [iPhone 15 Pro]!",
    "metadata": {
      "productImages": [
        {
          "name": "iPhone 15 Pro",
          "imageUrl": "/public/products/iphone-15-pro.jpg",
          "hasMore": true
        }
      ]
    }
  }
}
```

### 3. Seu sistema envia ao WhatsApp

```javascript
// Você processa a resposta e envia ao WhatsApp
const response = omniResponse.assistantMessage;

// Envia texto
await whatsapp.sendMessage(customerPhone, response.content);

// Envia imagens (se houver)
if (response.metadata.productImages) {
  for (const product of response.metadata.productImages) {
    await whatsapp.sendImage(
      customerPhone,
      product.imageUrl,
      product.name
    );
  }
}
```

## Segurança

### Autenticação

Todos os webhooks de entrada devem incluir um token de autenticação:

```
X-Webhook-Token: <secret_token>
```

Configure o token no dashboard: `/channels/webhook-config`

### Validação de Assinatura

Para webhooks de saída, incluímos uma assinatura HMAC:

```
X-Signature: sha256=<hash>
```

Verifique a assinatura usando:

```javascript
const crypto = require('crypto');

function verifySignature(payload, signature, secret) {
  const hash = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(payload))
    .digest('hex');
  
  return `sha256=${hash}` === signature;
}
```

## Limitações Atuais

- Webhooks de saída: **Não implementado** (próxima versão)
- Canais suportados: **ChatWeb** (WhatsApp e Instagram em desenvolvimento)
- Upload de áudio via webhook: **Em desenvolvimento**

## Próximos Passos

1. Implementar webhooks de saída
2. Adicionar suporte completo para WhatsApp Business API
3. Integração com Instagram Direct
4. Suporte para mensagens de áudio
5. Mensagens com botões e listas interativas
