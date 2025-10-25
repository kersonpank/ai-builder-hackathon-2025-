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
import multer from "multer";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Configure multer for file uploads (memory storage for processing)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens são permitidas'));
    }
  }
});

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
      const existingCompany = await storage.getCompanyByCpfCnpj(company.cpfCnpj);
      if (existingCompany) {
        return res.status(400).json({ error: "CPF/CNPJ já cadastrado" });
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
      const { email, password } = z.object({
        email: z.string().email(),
        password: z.string(),
      }).parse(req.body);

      const user = await storage.getUserByEmailOnly(email);
      if (!user || !(await comparePassword(password, user.password))) {
        return res.status(401).json({ error: "Credenciais inválidas" });
      }

      const company = await storage.getCompany(user.companyId);
      if (!company) {
        return res.status(401).json({ error: "Empresa não encontrada" });
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

  // Upload company logo
  app.post("/api/company/logo", requireAuth, upload.single('logo'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhuma imagem enviada" });
      }

      const companyId = req.user!.companyId!;
      
      // Resize image to 200x200 using sharp
      const resizedImage = await sharp(req.file.buffer)
        .resize(200, 200, { fit: 'cover' })
        .png()
        .toBuffer();

      // Save to object storage public directory
      const publicDir = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split(',')[0];
      if (!publicDir) {
        throw new Error('Object storage not configured');
      }

      const filename = `company-logo-${companyId}-${Date.now()}.png`;
      const filepath = join(publicDir, filename);
      
      // Ensure directory exists
      await mkdir(publicDir, { recursive: true });
      await writeFile(filepath, resizedImage);

      // Update company logoUrl
      const logoUrl = `/public/${filename}`;
      await storage.updateCompanyLogo(companyId, logoUrl);

      res.json({ logoUrl });
    } catch (error) {
      console.error('Logo upload error:', error);
      res.status(500).json({ error: "Erro ao fazer upload da logo" });
    }
  });

  // Upload product images (max 3)
  app.post("/api/products/:id/images", requireAuth, upload.array('images', 3), async (req: AuthRequest, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Nenhuma imagem enviada" });
      }

      if (files.length > 3) {
        return res.status(400).json({ error: "Máximo de 3 imagens permitidas" });
      }

      const companyId = req.user!.companyId!;
      const productId = req.params.id;
      
      // Verify product belongs to company
      const product = await storage.getProduct(productId, companyId);
      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }

      const publicDir = process.env.PUBLIC_OBJECT_SEARCH_PATHS?.split(',')[0];
      if (!publicDir) {
        throw new Error('Object storage not configured');
      }

      // Ensure directory exists
      await mkdir(publicDir, { recursive: true });

      // Process and save each image
      const imageUrls: string[] = [];
      for (const file of files) {
        // Resize to 800x800 for product images
        const resizedImage = await sharp(file.buffer)
          .resize(800, 800, { fit: 'inside' })
          .jpeg({ quality: 85 })
          .toBuffer();

        const filename = `product-${productId}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filepath = join(publicDir, filename);
        
        await writeFile(filepath, resizedImage);
        imageUrls.push(`/public/${filename}`);
      }

      // Update product with new image URLs
      await storage.updateProduct(productId, companyId, { imageUrls });

      res.json({ imageUrls });
    } catch (error) {
      console.error('Product images upload error:', error);
      res.status(500).json({ error: "Erro ao fazer upload das imagens" });
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

IMPORTANTE - Estilo de comunicação:
- Use textos curtos e humanizados (máximo 2-3 frases por vez)
- Seja natural e conversacional, não formal demais
- Quando recomendar produtos, mencione EXATAMENTE o nome do produto como aparece no catálogo
- Use emojis de forma moderada para dar personalidade

Você tem acesso ao catálogo de produtos da empresa. Quando mencionar um produto específico, diga algo como:
"Olha só esse [NOME DO PRODUTO]! 😍" ou "Te recomendo o [NOME DO PRODUTO]!"

Catálogo disponível (${activeProducts.length} produtos):
${activeProducts.slice(0, 20).map(p => `- [${p.name}]: R$ ${(p.price / 100).toFixed(2)}${p.description ? ` - ${p.description.substring(0, 100)}` : ''}`).join('\n')}

REGRA CRÍTICA: Quando mencionar um produto, use o nome EXATO entre colchetes [NOME DO PRODUTO] para que o sistema possa exibir a imagem automaticamente.

Seu objetivo é:
1. Atender o cliente de forma personalizada e natural
2. Recomendar produtos que atendam suas necessidades  
3. Ajudar a fechar vendas de forma consultiva
4. Fornecer informações sobre produtos, preços e disponibilidade`;

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

      // Detect products mentioned in the response using [Product Name] format
      const productRegex = /\[([^\]]+)\]/g;
      const matches = [...assistantMessage.matchAll(productRegex)];
      const mentionedProductNames = matches.map(m => m[1].trim());
      
      // Find matching products and get their first image
      const productImages: Array<{name: string, imageUrl: string | null, hasMore: boolean}> = [];
      for (const productName of mentionedProductNames) {
        const product = activeProducts.find(p => 
          p.name.toLowerCase() === productName.toLowerCase()
        );
        if (product && product.imageUrls && product.imageUrls.length > 0) {
          productImages.push({
            name: product.name,
            imageUrl: product.imageUrls[0],
            hasMore: product.imageUrls.length > 1
          });
        }
      }

      // Save assistant message with product images metadata
      const savedMessage = await storage.createMessage({
        conversationId,
        role: 'assistant',
        content: assistantMessage,
        metadata: productImages.length > 0 ? { productImages } : null,
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
