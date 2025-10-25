import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  hashPassword, 
  comparePassword, 
  generateToken, 
  requireAuth, 
  requireAdminAuth,
  optionalAuth,
  type AuthRequest 
} from "./auth";
import { z } from "zod";
import { insertUserSchema, insertCompanySchema, insertAgentSchema, insertProductSchema, insertOrderSchema, insertConversationSchema, insertMessageSchema, insertChannelSchema } from "@shared/schema";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============ AUTH ROUTES ============
  
  // Admin Login
  app.post("/api/admin/login", async (req, res) => {
    try {
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      const admin = await storage.getAdminUserByEmail(email);
      if (!admin || !(await comparePassword(password, admin.password))) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const token = generateToken({ userId: admin.id, type: 'admin' });
      res.json({ token, user: { id: admin.id, email: admin.email, name: admin.name } });
    } catch (error) {
      res.status(400).json({ error: "Erro na validação dos dados" });
    }
  });

  // User Register (during onboarding)
  app.post("/api/auth/register", async (req, res) => {
    try {
      const schema = z.object({
        company: insertCompanySchema,
        user: z.object({
          email: z.string().email(),
          password: z.string().min(6),
          name: z.string(),
        }),
      });

      const { company, user } = schema.parse(req.body);

      // Check if company already exists
      const existingCompany = await storage.getCompanyByCNPJ(company.cnpj);
      if (existingCompany) {
        return res.status(400).json({ error: "CNPJ já cadastrado" });
      }

      // Create company
      const newCompany = await storage.createCompany(company);

      // Create user
      const hashedPassword = await hashPassword(user.password);
      const newUser = await storage.createUser({
        companyId: newCompany.id,
        email: user.email,
        password: hashedPassword,
        name: user.name,
        role: 'owner',
      });

      // Create default channel configuration
      await storage.createChannel({
        companyId: newCompany.id,
        chatweb: true,
        whatsapp: false,
        instagram: false,
        chatwebUrl: `${process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000'}/chat/${newCompany.id}`,
      });

      const token = generateToken({ 
        userId: newUser.id, 
        companyId: newCompany.id, 
        type: 'user' 
      });

      res.json({ 
        token, 
        user: { 
          id: newUser.id, 
          email: newUser.email, 
          name: newUser.name, 
          companyId: newCompany.id 
        },
        company: newCompany,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(400).json({ error: "Erro no cadastro" });
    }
  });

  // User Login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password, cnpj } = z.object({
        email: z.string().email(),
        password: z.string(),
        cnpj: z.string(),
      }).parse(req.body);

      const company = await storage.getCompanyByCNPJ(cnpj);
      if (!company) {
        return res.status(401).json({ error: "Empresa não encontrada" });
      }

      const user = await storage.getUserByEmail(email, company.id);
      if (!user || !(await comparePassword(password, user.password))) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const token = generateToken({ 
        userId: user.id, 
        companyId: company.id, 
        type: 'user' 
      });

      res.json({ 
        token, 
        user: { 
          id: user.id, 
          email: user.email, 
          name: user.name, 
          companyId: company.id 
        },
        company,
      });
    } catch (error) {
      res.status(400).json({ error: "Erro na validação dos dados" });
    }
  });

  // ============ ADMIN ROUTES ============
  
  // Get all companies (admin only)
  app.get("/api/admin/companies", requireAdminAuth, async (req, res) => {
    const companies = await storage.getAllCompanies();
    res.json(companies);
  });

  // Update company status (admin only)
  app.patch("/api/admin/companies/:id", requireAdminAuth, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const company = await storage.updateCompany(id, { status });
    res.json(company);
  });

  // Delete company (admin only)
  app.delete("/api/admin/companies/:id", requireAdminAuth, async (req, res) => {
    const { id } = req.params;
    await storage.deleteCompany(id);
    res.json({ success: true });
  });

  // ============ USER ROUTES ============

  // Get current company
  app.get("/api/company", requireAuth, async (req: AuthRequest, res) => {
    const company = await storage.getCompany(req.user!.companyId!);
    res.json(company);
  });

  // Update company
  app.patch("/api/company", requireAuth, async (req: AuthRequest, res) => {
    const updates = insertCompanySchema.partial().parse(req.body);
    const company = await storage.updateCompany(req.user!.companyId!, updates);
    res.json(company);
  });

  // Get company stats
  app.get("/api/stats", requireAuth, async (req: AuthRequest, res) => {
    const stats = await storage.getCompanyStats(req.user!.companyId!);
    res.json(stats);
  });

  // ============ AGENT ROUTES ============

  // Get agent configuration
  app.get("/api/agent", requireAuth, async (req: AuthRequest, res) => {
    const agent = await storage.getAgentByCompany(req.user!.companyId!);
    res.json(agent);
  });

  // Create or update agent
  app.post("/api/agent", requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = insertAgentSchema.parse({ 
        ...req.body, 
        companyId: req.user!.companyId! 
      });

      const existing = await storage.getAgentByCompany(req.user!.companyId!);
      
      if (existing) {
        const updated = await storage.updateAgent(req.user!.companyId!, data);
        return res.json(updated);
      }

      const agent = await storage.createAgent(data);
      res.json(agent);
    } catch (error) {
      res.status(400).json({ error: "Erro ao salvar agente" });
    }
  });

  // ============ PRODUCT ROUTES ============

  // Get all products
  app.get("/api/products", requireAuth, async (req: AuthRequest, res) => {
    const products = await storage.getProductsByCompany(req.user!.companyId!);
    res.json(products);
  });

  // Get single product
  app.get("/api/products/:id", requireAuth, async (req: AuthRequest, res) => {
    const product = await storage.getProduct(req.params.id, req.user!.companyId!);
    res.json(product);
  });

  // Create product
  app.post("/api/products", requireAuth, async (req: AuthRequest, res) => {
    try {
      const data = insertProductSchema.parse({ 
        ...req.body, 
        companyId: req.user!.companyId! 
      });
      const product = await storage.createProduct(data);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Erro ao criar produto" });
    }
  });

  // Update product
  app.patch("/api/products/:id", requireAuth, async (req: AuthRequest, res) => {
    try {
      const updates = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(req.params.id, req.user!.companyId!, updates);
      res.json(product);
    } catch (error) {
      res.status(400).json({ error: "Erro ao atualizar produto" });
    }
  });

  // Delete product
  app.delete("/api/products/:id", requireAuth, async (req: AuthRequest, res) => {
    await storage.deleteProduct(req.params.id, req.user!.companyId!);
    res.json({ success: true });
  });

  // Bulk create products (CSV upload)
  app.post("/api/products/bulk", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { products } = z.object({
        products: z.array(insertProductSchema.omit({ companyId: true })),
      }).parse(req.body);

      const productsWithCompany = products.map(p => ({
        ...p,
        companyId: req.user!.companyId!,
      }));

      const created = await storage.createProductsBulk(productsWithCompany);
      res.json(created);
    } catch (error) {
      res.status(400).json({ error: "Erro ao importar produtos" });
    }
  });

  // Generate AI description for product
  app.post("/api/products/generate-description", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { name, category } = z.object({
        name: z.string(),
        category: z.string().optional(),
      }).parse(req.body);

      const prompt = `Crie uma descrição de produto atraente e persuasiva para: ${name}${category ? ` (categoria: ${category})` : ''}. A descrição deve ter 2-3 frases, destacar benefícios e ser apropriada para e-commerce.`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 150,
        temperature: 0.7,
      });

      const description = completion.choices[0].message.content?.trim() || "";
      res.json({ description });
    } catch (error) {
      console.error('OpenAI error:', error);
      res.status(500).json({ error: "Erro ao gerar descrição" });
    }
  });

  // ============ ORDER ROUTES ============

  // Get all orders
  app.get("/api/orders", requireAuth, async (req: AuthRequest, res) => {
    const orders = await storage.getOrdersByCompany(req.user!.companyId!);
    res.json(orders);
  });

  // Get single order
  app.get("/api/orders/:id", requireAuth, async (req: AuthRequest, res) => {
    const order = await storage.getOrder(req.params.id, req.user!.companyId!);
    res.json(order);
  });

  // Update order status
  app.patch("/api/orders/:id/status", requireAuth, async (req: AuthRequest, res) => {
    try {
      const { status } = z.object({ status: z.string() }).parse(req.body);
      const order = await storage.updateOrderStatus(req.params.id, req.user!.companyId!, status);
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: "Erro ao atualizar pedido" });
    }
  });

  // ============ CONVERSATION ROUTES ============

  // Get all conversations
  app.get("/api/conversations", requireAuth, async (req: AuthRequest, res) => {
    const conversations = await storage.getConversationsByCompany(req.user!.companyId!);
    res.json(conversations);
  });

  // Get single conversation with messages
  app.get("/api/conversations/:id", requireAuth, async (req: AuthRequest, res) => {
    const conversation = await storage.getConversation(req.params.id);
    if (!conversation || conversation.companyId !== req.user!.companyId!) {
      return res.status(404).json({ error: "Conversa não encontrada" });
    }
    const messages = await storage.getMessagesByConversation(req.params.id);
    res.json({ ...conversation, messages });
  });

  // ============ CHANNEL ROUTES ============

  // Get channels configuration
  app.get("/api/channels", requireAuth, async (req: AuthRequest, res) => {
    const channels = await storage.getChannelByCompany(req.user!.companyId!);
    res.json(channels);
  });

  // Update channels configuration
  app.patch("/api/channels", requireAuth, async (req: AuthRequest, res) => {
    try {
      const updates = insertChannelSchema.partial().parse(req.body);
      const channels = await storage.updateChannel(req.user!.companyId!, updates);
      res.json(channels);
    } catch (error) {
      res.status(400).json({ error: "Erro ao atualizar canais" });
    }
  });

  // ============ PUBLIC CHATWEB ROUTES ============

  // Get company info for ChatWeb (public)
  app.get("/api/chatweb/:companyId", async (req, res) => {
    const { companyId } = req.params;
    const company = await storage.getCompany(companyId);
    if (!company) {
      return res.status(404).json({ error: "Empresa não encontrada" });
    }
    const agent = await storage.getAgentByCompany(companyId);
    res.json({ company, agent });
  });

  // Get products for ChatWeb (public)
  app.get("/api/chatweb/:companyId/products", async (req, res) => {
    const { companyId } = req.params;
    const products = await storage.getProductsByCompany(companyId);
    const activeProducts = products.filter(p => p.isActive);
    res.json(activeProducts);
  });

  // Create conversation (public)
  app.post("/api/chatweb/:companyId/conversations", async (req, res) => {
    try {
      const { companyId } = req.params;
      const data = insertConversationSchema.parse({
        companyId,
        channel: 'chatweb',
        status: 'active',
      });
      const conversation = await storage.createConversation(data);
      res.json(conversation);
    } catch (error) {
      res.status(400).json({ error: "Erro ao criar conversa" });
    }
  });

  // Send message and get AI response (public)
  app.post("/api/chatweb/:companyId/conversations/:conversationId/messages", async (req, res) => {
    try {
      const { companyId, conversationId } = req.params;
      const { content } = z.object({ content: z.string() }).parse(req.body);

      // Save user message
      await storage.createMessage({
        conversationId,
        role: 'user',
        content,
        metadata: null,
      });

      // Get company context
      const company = await storage.getCompany(companyId);
      const agent = await storage.getAgentByCompany(companyId);
      const products = await storage.getProductsByCompany(companyId);
      const activeProducts = products.filter(p => p.isActive);

      // Build system prompt
      const toneInstructions = {
        'Empático': 'Seja caloroso, acolhedor e demonstre empatia genuína. Use linguagem amigável e próxima.',
        'Divertido': 'Seja descontraído, use um tom leve e bem-humorado. Torne a experiência divertida.',
        'Profissional': 'Seja formal, objetivo e profissional. Mantenha um tom respeitoso e direto.',
      };

      const systemPrompt = `Você é ${agent?.name || 'um assistente virtual'} da ${company?.name}.

Tom de voz: ${toneInstructions[agent?.toneOfVoice as keyof typeof toneInstructions] || toneInstructions['Profissional']}

${agent?.customInstructions ? `Instruções adicionais: ${agent.customInstructions}` : ''}

Você tem acesso ao catálogo de produtos da empresa. Quando o cliente demonstrar interesse em produtos, recomende opções relevantes do catálogo.

Seu objetivo é:
1. Atender o cliente de forma personalizada
2. Recomendar produtos que atendam suas necessidades
3. Ajudar a fechar vendas
4. Fornecer informações sobre produtos, preços e disponibilidade

Catálogo disponível (${activeProducts.length} produtos):
${activeProducts.slice(0, 10).map(p => `- ${p.name}: R$ ${(p.price / 100).toFixed(2)}${p.description ? ` - ${p.description}` : ''}`).join('\n')}

Quando recomendar produtos, mencione apenas o nome e preço. O sistema irá exibir os cards de produto automaticamente.`;

      // Get conversation history
      const messages = await storage.getMessagesByConversation(conversationId);
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          ...conversationHistory,
          { role: "user", content },
        ],
        max_tokens: 500,
        temperature: 0.8,
      });

      const assistantMessage = completion.choices[0].message.content || "Desculpe, não consegui processar sua mensagem.";

      // Save assistant message
      const savedMessage = await storage.createMessage({
        conversationId,
        role: 'assistant',
        content: assistantMessage,
        metadata: null,
      });

      // Update conversation timestamp
      await storage.updateConversation(conversationId, { updatedAt: new Date() });

      res.json(savedMessage);
    } catch (error) {
      console.error('Chat error:', error);
      res.status(500).json({ error: "Erro ao processar mensagem" });
    }
  });

  // Create order from ChatWeb (public)
  app.post("/api/chatweb/:companyId/orders", async (req, res) => {
    try {
      const { companyId } = req.params;
      const data = insertOrderSchema.parse({
        ...req.body,
        companyId,
      });
      const order = await storage.createOrder(data);
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: "Erro ao criar pedido" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
