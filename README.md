# Omni.AI - Multi-Tenant AI Customer Service Platform

<img width="1049" height="699" alt="image" src="https://github.com/user-attachments/assets/41c7c3c1-e84d-40a4-b2ea-2bc6379abf45" />

<div align="center">
  <h3>Plataforma B2B SaaS de Atendimento ao Cliente com IA</h3>
  <p>Sistema completo de catálogo conversacional com IA, gestão de pedidos e identificação omnichannel de clientes</p>
</div>

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Funcionalidades Principais](#-funcionalidades-principais)
- [Arquitetura](#-arquitetura)
- [Tecnologias](#-tecnologias)
- [Instalação](#-instalação)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Fluxos de Uso](#-fluxos-de-uso)
- [Configuração](#-configuração)
- [API](#-api)
- [Contribuindo](#-contribuindo)

---

## 🎯 Visão Geral

**Omni.AI** é uma plataforma SaaS B2B que permite empresas criarem agentes de IA conversacionais para atendimento ao cliente, recomendação de produtos e processamento de pedidos. O sistema oferece:

- **Multi-tenancy**: Múltiplas empresas em uma única instância
- **Agentes IA Personalizáveis**: Configure tom de voz, personalidade e instruções customizadas
- **Catálogo Híbrido**: Navegação tradicional + chat com IA
- **Carrinho Inteligente**: IA adiciona produtos automaticamente durante conversas
- **Identificação Omnichannel**: Reconhece clientes por telefone, email, CPF ou CNPJ
- **Suporte B2B e B2C**: Atende tanto pessoas físicas quanto jurídicas

---

## ✨ Funcionalidades Principais

### 🤖 Agente de IA Conversacional

- **Function Calling**: Adiciona produtos ao carrinho e cria pedidos automaticamente
- **Exibição de Imagens**: Envia fotos dos produtos durante a conversa
- **Memória de Contexto**: Mantém histórico da conversa
- **Personalidades**: Escolha entre consultivo, direto, empático ou equilibrado
- **Tons de Voz**: Profissional, casual, técnico ou amigável

### 🛒 Sistema de Carrinho

- **Sincronização**: Carrinho compartilhado entre catálogo e chat
- **Persistência**: LocalStorage mantém carrinho entre sessões
- **Adição Inteligente**: IA identifica interesse e adiciona produtos automaticamente
- **Notificações**: Feedback visual quando produtos são adicionados

### 👥 Gestão de Clientes Omnichannel

- **Identificação Única**: Deduplica clientes via telefone normalizado, email, CPF ou CNPJ
- **Normalização de Telefone**: Suporta formatos brasileiros (DDD, operadora, internacional)
- **Validação de Documentos**: CPF e CNPJ com dígitos verificadores
- **Tracking de Canal**: Registra em qual canal (ChatWeb, WhatsApp, Instagram) o cliente foi visto
- **Perfil B2B**: Campos para Razão Social, Nome Fantasia e Inscrição Estadual

### 📦 Gestão de Produtos

- **Upload de Imagens**: Múltiplas imagens por produto (até 3)
- **Importação em Massa**: Upload de CSV/Excel com extração de dados via IA
- **Status de Publicação**: Rascunhos e produtos publicados
- **Categorização**: Organização por categorias
- **Otimização de Imagens**: Redimensionamento automático via Sharp

### 📝 Processamento de Pedidos

- **Criação Automática**: Via function calling da IA
- **Validação de Preços**: Backend recalcula totais (não confia na IA)
- **Código de Confirmação**: Gerado automaticamente
- **Múltiplas Formas de Pagamento**: PIX, cartão, boleto, dinheiro
- **Rastreamento de Status**: Pendente, processando, enviado, entregue, cancelado

### 🎙️ Multimodalidade

- **Transcrição de Áudio**: Whisper API (OpenAI) converte voz em texto
- **Upload de Imagens**: Clientes podem enviar fotos
- **Respostas com Imagens**: Produtos exibidos automaticamente

---

## 🏗️ Arquitetura

### Frontend
```
React 18 + TypeScript + Vite
├── Wouter (Routing)
├── TanStack Query (Server State)
├── React Hook Form + Zod (Formulários)
├── shadcn/ui + Radix UI (Componentes)
└── Tailwind CSS (Estilização)
```

### Backend
```
Node.js + Express + TypeScript
├── Drizzle ORM (Database)
├── OpenAI API (IA Conversacional)
├── Whisper API (Transcrição de Áudio)
├── Google Cloud Storage (Imagens)
├── JWT + bcrypt (Autenticação)
└── PostgreSQL (Neon Serverless)
```

### Banco de Dados
```
PostgreSQL (Multi-tenant)
├── Companies (Tenant)
├── Users (Funcionários)
├── Admin Users (Gestão)
├── Customers (Clientes Omnichannel)
├── Products (Catálogo)
├── Orders (Pedidos)
├── Agents (Configuração IA)
├── Conversations (Sessões de Chat)
└── Messages (Histórico de Mensagens)
```

---

## 🛠️ Tecnologias

### Core
- **Runtime**: Node.js 20+ com TypeScript
- **Framework**: Express.js (backend) + React 18 (frontend)
- **Build**: Vite + esbuild
- **Database**: PostgreSQL (Neon) + Drizzle ORM

### IA & ML
- **OpenAI GPT-4o-mini**: Agente conversacional
- **Whisper API**: Transcrição de áudio
- **Function Calling**: Automação de ações (carrinho, pedidos)

### UI/UX
- **shadcn/ui**: Sistema de componentes
- **Radix UI**: Primitivos acessíveis
- **Tailwind CSS**: Estilização utilitária
- **Lucide React**: Ícones

### Autenticação & Segurança
- **JWT**: Tokens HTTP-only
- **bcrypt**: Hash de senhas
- **RBAC**: Admin vs Company users
- **Zod**: Validação de schemas

### Storage & Media
- **Google Cloud Storage**: Imagens de produtos
- **Sharp**: Processamento de imagens
- **Multer**: Upload de arquivos

---

## 📦 Instalação

### Pré-requisitos
```bash
Node.js 20+
PostgreSQL
Conta OpenAI (API Key)
Conta Google Cloud (Object Storage)
```

### Passos

1. **Clone o repositório**
```bash
git clone https://github.com/kersonpank/ai-builder-hackathon-2025-OmniSellAI.git
cd ai-builder-hackathon-2025-OmniSellAI
```

2. **Instale as dependências**
```bash
npm install
```

3. **Configure as variáveis de ambiente**
```bash
# .env
DATABASE_URL=postgresql://user:password@host:port/database
OPENAI_API_KEY=sk-...
SESSION_SECRET=seu-secret-aqui
DEFAULT_OBJECT_STORAGE_BUCKET_ID=seu-bucket-id
PUBLIC_OBJECT_SEARCH_PATHS=/public
PRIVATE_OBJECT_DIR=/.private
```

4. **Execute as migrações**
```bash
npm run db:push
```

5. **Inicie o servidor de desenvolvimento**
```bash
npm run dev
```

O sistema estará disponível em `http://localhost:5000`

---

## 📁 Estrutura do Projeto

```
.
├── client/                    # Frontend React
│   ├── src/
│   │   ├── components/       # Componentes reutilizáveis
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── pages/           # Páginas da aplicação
│   │   │   ├── admin.tsx    # Dashboard Admin
│   │   │   ├── dashboard.tsx # Dashboard Empresa
│   │   │   ├── chatweb.tsx  # Chat público
│   │   │   └── catalog.tsx  # Catálogo público
│   │   ├── context/         # React Contexts
│   │   │   └── CartContext.tsx
│   │   └── lib/             # Utilitários
│   └── index.html
│
├── server/                   # Backend Express
│   ├── index.ts             # Entry point
│   ├── routes.ts            # API routes
│   ├── storage.ts           # Database abstraction
│   ├── vite.ts              # Vite SSR
│   └── utils/
│       ├── phoneNormalizer.ts
│       └── cpfCnpjValidator.ts
│
├── shared/                   # Código compartilhado
│   └── schema.ts            # Schemas Drizzle + Zod
│
├── attached_assets/         # Assets estáticos
│
└── public/                  # Assets públicos
```

---

## 🔄 Fluxos de Uso

### Fluxo 1: Cliente Conhece Produtos via Chat

1. Cliente acessa `/chat/{companyId}`
2. Conversa com agente: "Quais produtos vocês têm?"
3. Agente lista produtos com formato `[Nome do Produto]`
4. Sistema envia automaticamente imagens dos produtos
5. Cliente demonstra interesse: "Quero o produto X"
6. IA chama função `add_to_cart` automaticamente
7. Produto aparece no carrinho
8. Cliente pode ir ao catálogo e ver carrinho sincronizado

### Fluxo 2: Cliente Navega Catálogo e Finaliza no Chat

1. Cliente acessa `/catalog/{companyId}`
2. Adiciona produtos ao carrinho manualmente
3. Clica em "Falar com Agente"
4. Sistema transfere carrinho para o chat
5. IA analisa carrinho e auxilia na finalização
6. Cliente fornece dados (CPF/CNPJ, endereço, etc)
7. IA chama função `create_order`
8. Sistema valida preços e cria pedido
9. Cliente recebe código de confirmação

### Fluxo 3: Empresa Configura Agente

1. Login no dashboard da empresa
2. Acessa "Configurar Agente"
3. Define:
   - Nome do agente
   - Tom de voz (profissional, casual, técnico, amigável)
   - Personalidade de vendedor (consultivo, direto, empático)
   - Instruções customizadas
4. Salva configurações
5. Agente atualizado imediatamente

### Fluxo 4: Admin Gerencia Sistema

1. Login como admin
2. Visualiza todas as empresas
3. Monitora logs de API
4. Vê estatísticas globais
5. Pode acessar dashboard de qualquer empresa

---

## ⚙️ Configuração

### Agente de IA

Configure o comportamento do agente em **Dashboard → Agente**:

**Tom de Voz:**
- **Profissional**: Formal e respeitoso
- **Casual**: Descontraído e informal
- **Técnico**: Preciso com termos específicos
- **Amigável**: Caloroso e acolhedor

**Personalidade de Vendedor:**
- **Consultivo**: Faz perguntas e entende necessidades
- **Direto**: Objetivo e eficiente
- **Empático**: Conecta emocionalmente
- **Equilibrado**: Balanceado entre todos

**Estilo de Resposta:**
- Textos curtos (2-3 frases) ou detalhados

**Instruções Customizadas:**
- Adicione regras específicas do seu negócio
- Exemplo: "Sempre ofereça frete grátis acima de R$ 100"

### Catálogo de Produtos

**Adição Manual:**
1. Dashboard → Produtos → Novo Produto
2. Preencha nome, preço, descrição
3. Upload de até 3 imagens
4. Publique ou salve como rascunho

**Importação em Massa:**
1. Prepare CSV/Excel com colunas: nome, preço, descrição
2. Dashboard → Produtos → Importar
3. Upload do arquivo
4. IA extrai dados automaticamente
5. Revise e publique

### Clientes Omnichannel

O sistema identifica clientes unicamente através de:
- **Telefone** (normalizado: remove DDD, operadora, zeros à esquerda)
- **Email**
- **CPF** (pessoa física)
- **CNPJ** (pessoa jurídica)

Quando um cliente já existe, o sistema:
- Atualiza informações mais recentes
- Mantém histórico de canais onde foi visto
- Acumula estatísticas (total gasto, pedidos)

---

## 🔌 API

### Autenticação

```typescript
POST /api/auth/register
POST /api/auth/login
GET /api/auth/me
POST /api/auth/logout
```

### Empresas (Admin)

```typescript
GET /api/admin/companies
POST /api/admin/companies
PUT /api/admin/companies/:id
DELETE /api/admin/companies/:id
```

### Produtos

```typescript
GET /api/products              // Lista produtos publicados
GET /api/products/drafts       // Lista rascunhos
POST /api/products             // Cria produto
PUT /api/products/:id          // Atualiza produto
DELETE /api/products/:id       // Deleta produto
POST /api/products/:id/images  // Upload de imagens
POST /api/products/bulk-import // Importação em massa
```

### Chat (Público)

```typescript
GET /api/chatweb/:companyId                                    // Info da empresa
GET /api/chatweb/:companyId/products                          // Produtos ativos
POST /api/chatweb/:companyId/conversations                    // Nova conversa
GET /api/chatweb/:companyId/conversations/:conversationId     // Carregar conversa
POST /api/chatweb/:companyId/conversations/:conversationId/messages // Enviar mensagem
```

### Pedidos

```typescript
GET /api/orders                    // Lista pedidos
POST /api/orders                   // Cria pedido
GET /api/orders/:id               // Detalhes do pedido
PUT /api/orders/:id/status        // Atualiza status
```

### Clientes

```typescript
GET /api/customers                 // Lista clientes
GET /api/customers/:id            // Detalhes do cliente
PUT /api/customers/:id            // Atualiza cliente
```

---

## 🎨 Personalização

### Cores do Tema

Edite `client/src/index.css`:

```css
:root {
  --primary: 262 83% 58%;        /* Cor principal */
  --secondary: 220 14% 96%;      /* Cor secundária */
  --accent: 262 83% 58%;         /* Cor de destaque */
  /* ... mais variáveis ... */
}
```

### Logo da Empresa

Upload via Dashboard → Configurações da Empresa → Logo

### Fontes

Sistema usa:
- **Inter**: Textos gerais
- **Manrope**: Headings
- **JetBrains Mono**: Código

---

## 🚀 Deploy

### Replit (Recomendado)

1. Fork este repositório
2. Configure Secrets no Replit
3. Clique em "Run"
4. Publique via Deploy Button

### Outros Provedores

**Vercel / Netlify:**
- Configure build command: `npm run build`
- Output directory: `dist`
- Environment variables no painel

**Docker:**
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["npm", "start"]
```

---

## 🧪 Testes

```bash
# Executar testes (se implementados)
npm test

# Verificar types
npm run type-check

# Lint
npm run lint
```

---

## 📊 Funcionalidades Futuras

- [ ] WhatsApp Integration (via Twilio/Meta)
- [ ] Instagram Direct Integration
- [ ] Analytics Dashboard
- [ ] Webhooks para eventos
- [ ] API para integrações externas
- [ ] Multi-idioma
- [ ] Voice responses (TTS)
- [ ] Video chamadas
- [ ] Agendamento de atendimento
- [ ] CRM integrado

---

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch: `git checkout -b feature/nova-funcionalidade`
3. Commit suas mudanças: `git commit -m 'feat: Adiciona nova funcionalidade'`
4. Push para a branch: `git push origin feature/nova-funcionalidade`
5. Abra um Pull Request

---

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👨‍💻 Autor

**Desenvolvido para AI Builder Hackathon 2025**

---

## 🙏 Agradecimentos

- OpenAI pela API GPT-4 e Whisper
- Replit pela plataforma de desenvolvimento
- shadcn/ui pelos componentes incríveis
- Comunidade open source

---

<div align="center">
  <p>Feito com ❤️ para transformar atendimento ao cliente</p>
</div>
