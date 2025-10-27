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
import { ObjectStorageService } from "./objectStorage";
import { parseString } from "xml2js";
import { promisify } from "util";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const parseXML = promisify(parseString);

// Configure multer for image uploads
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

// Configure multer for document uploads (PDF, XML, TXT)
const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit for documents
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['application/pdf', 'application/xml', 'text/xml', 'text/plain'];
    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.xml') || file.originalname.endsWith('.txt')) {
      cb(null, true);
    } else {
      cb(new Error('Apenas arquivos PDF, XML ou TXT são permitidos'));
    }
  }
});

// Configure multer for ChatWeb (images + audio)
const chatWebUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit (Whisper max)
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/', 'audio/', 'video/webm'];
    const isAllowed = allowedTypes.some(type => file.mimetype.startsWith(type) || file.mimetype === 'video/webm');
    if (isAllowed) {
      cb(null, true);
    } else {
      cb(new Error('Apenas imagens e áudio são permitidos'));
    }
  }
});

// Specialist Agent Prompts
const SPECIALIST_PROMPTS = {
  seller: `PERFIL: Vendedor Focado em Conversão
- Seu objetivo é FECHAR A VENDA de forma natural e consultiva
- Identifique rapidamente o que o cliente quer e conduza para a compra
- Use gatilhos mentais sutis (escassez, prova social, urgência)
- Seja direto e objetivo nas recomendações
- Antecipe objeções e trate-as proativamente`,

  consultant: `PERFIL: Consultor Educador
- Seu objetivo é EDUCAR e construir confiança antes de vender
- O cliente está pesquisando, então forneça informações detalhadas
- Compare opções, explique benefícios e diferenciais
- Não pressione, deixe o cliente amadurecer a decisão
- Faça perguntas para entender melhor as necessidades
- Só sugira compra quando sentir que o cliente está pronto`,

  support: `PERFIL: Suporte Pós-Venda
- Seu objetivo é RESOLVER PROBLEMAS e manter o cliente satisfeito
- Seja empático e demonstre que você se importa
- Foque em solucionar o problema, não em vender mais
- Peça desculpas se necessário e assuma responsabilidade
- Ofereça soluções claras e prazos realistas
- Só mencione novos produtos se for genuinamente útil para o problema`,

  technical: `PERFIL: Especialista Técnico
- Seu objetivo é esclarecer DÚVIDAS TÉCNICAS complexas
- Use linguagem clara mas precisa
- Forneça detalhes técnicos quando necessário
- Confirme entendimento perguntando "ficou claro?"
- Se não souber, seja honesto e ofereça transferir para humano
- Mantenha foco técnico, evite tangenciar para vendas`
};

// Conversation Intelligence Analyzer
async function analyzeConversation(messages: any[]): Promise<{
  intent: string;
  sentiment: number;
  complexity: number;
  suggestedAgent: string;
}> {
  try {
    // Use last 6 messages for analysis
    const recentMessages = messages.slice(-6).map(m => `${m.role}: ${m.content}`).join('\n');
    
    const analysisPrompt = `Analise esta conversa e identifique a intenção, sentimento e complexidade.

Conversa:
${recentMessages}

Critérios:
- intent: intenção principal do cliente neste momento (browsing, purchase_intent, support, complaint, technical_question)
- sentiment: -100 (muito negativo/frustrado) a +100 (muito positivo/satisfeito)
- complexity: 0 (simples) a 100 (muito complexo/confuso)
- suggestedAgent: 
  * seller = cliente quer comprar, está decidido
  * consultant = cliente está pesquisando, precisa ser educado
  * support = cliente tem problema/dúvida pós-venda
  * technical = questão técnica complexa`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { 
          role: "system", 
          content: "You are a conversation analyzer. Respond ONLY with valid JSON matching the schema." 
        },
        { 
          role: "user", 
          content: analysisPrompt 
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: 200,
    });

    const result = JSON.parse(completion.choices[0].message.content || '{}');
    
    // Validate and log the result
    if (!result.intent || !result.suggestedAgent) {
      console.error('Invalid analysis result:', result);
      throw new Error('Invalid analysis response from OpenAI');
    }
    
    console.log('✅ Analysis successful:', result);
    
    return {
      intent: result.intent || 'browsing',
      sentiment: result.sentiment || 0,
      complexity: result.complexity || 30,
      suggestedAgent: result.suggestedAgent || 'seller',
    };
  } catch (error) {
    console.error('Error analyzing conversation:', error);
    // Return defaults on error
    return {
      intent: 'browsing',
      sentiment: 0,
      complexity: 30,
      suggestedAgent: 'seller',
    };
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  
  // ============ PUBLIC FILE SERVING ============
  
  // Serve public objects from object storage
  app.get("/public/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    const objectStorageService = new ObjectStorageService();
    try {
      const file = await objectStorageService.searchPublicObject(filePath);
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }
      objectStorageService.downloadObject(file, res);
    } catch (error) {
      console.error("Error searching for public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // ============ PUBLIC ROUTES ============
  
  // Get all active companies (for landing page)
  app.get("/api/public/companies", async (req, res) => {
    try {
      const companies = await storage.getActiveCompanies();
      // Return only public information
      const publicCompanies = companies.map(company => ({
        id: company.id,
        name: company.name,
        logoUrl: company.logoUrl,
        slug: company.id, // Using ID as slug for now
      }));
      res.json(publicCompanies);
    } catch (error) {
      console.error("Error fetching public companies:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  
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
      const objectStorageService = new ObjectStorageService();
      const filename = `company-logo-${companyId}-${Date.now()}.png`;
      const logoUrl = await objectStorageService.uploadToPublicStorage(
        resizedImage,
        filename,
        'image/png'
      );

      // Update company logoUrl
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

      const objectStorageService = new ObjectStorageService();

      // Process and save each image
      const imageUrls: string[] = [];
      for (const file of files) {
        // Resize to 800x800 for product images
        const resizedImage = await sharp(file.buffer)
          .resize(800, 800, { fit: 'inside' })
          .jpeg({ quality: 85 })
          .toBuffer();

        const filename = `product-${productId}-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const imageUrl = await objectStorageService.uploadToPublicStorage(
          resizedImage,
          filename,
          'image/jpeg'
        );
        imageUrls.push(imageUrl);
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

  // Get API logs (admin only)
  app.get("/api/admin/logs", requireAdminAuth, async (req, res) => {
    const { type, companyId, limit } = req.query;
    let logs;
    
    if (type && typeof type === 'string') {
      logs = await storage.getApiLogsByType(type, limit ? Number(limit) : 100);
    } else if (companyId && typeof companyId === 'string') {
      logs = await storage.getApiLogsByCompany(companyId, limit ? Number(limit) : 100);
    } else {
      logs = await storage.getApiLogs(limit ? Number(limit) : 100);
    }
    
    res.json(logs);
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

  // Generate webhook token for company
  app.post("/api/company/webhook-token/generate", requireAuth, async (req: AuthRequest, res) => {
    const crypto = await import('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const company = await storage.updateCompany(req.user!.companyId!, {
      webhookToken: token,
      webhookAuthEnabled: true,
    });
    res.json({ token: company?.webhookToken });
  });

  // Toggle webhook authentication
  app.patch("/api/company/webhook-auth", requireAuth, async (req: AuthRequest, res) => {
    const { enabled } = req.body;
    const company = await storage.updateCompany(req.user!.companyId!, {
      webhookAuthEnabled: enabled,
    });
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

  // Update agent configuration
  app.patch("/api/agent", requireAuth, async (req: AuthRequest, res) => {
    try {
      const updates = insertAgentSchema.partial().parse(req.body);
      const agent = await storage.updateAgent(req.user!.companyId!, updates);
      res.json(agent);
    } catch (error) {
      res.status(400).json({ error: "Erro ao atualizar agente" });
    }
  });

  // Upload context documents for agent
  app.post("/api/agent/documents", requireAuth, documentUpload.array('documents', 10), async (req: AuthRequest, res) => {
    try {
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const objectStorageService = new ObjectStorageService();
      const documentUrls: string[] = [];

      for (const file of files) {
        const fileName = `documents/${req.user!.companyId!}/${Date.now()}-${file.originalname}`;
        const url = await objectStorageService.uploadToPublicStorage(file.buffer, fileName, file.mimetype);
        documentUrls.push(url);
      }

      const agent = await storage.getAgentByCompany(req.user!.companyId!);
      const existingDocs = agent?.contextDocuments || [];
      const updatedDocs = [...existingDocs, ...documentUrls];

      const updated = await storage.updateAgent(req.user!.companyId!, {
        contextDocuments: updatedDocs,
      });

      res.json(updated);
    } catch (error) {
      console.error('Error uploading documents:', error);
      res.status(500).json({ error: "Erro ao enviar documentos" });
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

  // Bulk import products from PDF/XML file using AI
  app.post("/api/products/bulk-import", requireAuth, documentUpload.single('file'), async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo foi enviado" });
      }

      let extractedText = "";
      let extractedImages: Buffer[] = [];

      // Extract text and images based on file type
      if (req.file.mimetype === 'application/pdf') {
        // Dynamic import for ESM compatibility  
        const pdfParseModule = await import('pdf-parse');
        // pdf-parse might export as default or as the module itself
        const pdfParse = (pdfParseModule as any).default || pdfParseModule;
        const pdfData = await pdfParse(req.file.buffer);
        extractedText = pdfData.text;

        console.log('PDF parsed successfully. Text length:', extractedText.length);

        // Convert PDF pages to images for GPT-4 Vision analysis
        try {
          const pdfToImg = await import('pdf-img-convert');
          const pdfImages = await pdfToImg.convert(req.file.buffer, {
            width: 2000,
            height: 2000,
            page_numbers: [1, 2, 3, 4, 5], // First 5 pages max for cost efficiency
            base64: true
          }) as string[];

          console.log(`Extracted ${pdfImages.length} images from PDF`);
          
          // Store images as base64 strings for later processing
          extractedImages = pdfImages.map(img => Buffer.from(img, 'base64'));
        } catch (imgError) {
          console.error('Error extracting images from PDF:', imgError);
          // Continue even if image extraction fails
        }
      } else if (req.file.mimetype === 'application/xml' || req.file.mimetype === 'text/xml' || req.file.originalname.endsWith('.xml')) {
        const xmlText = req.file.buffer.toString('utf-8');
        extractedText = xmlText;
      } else if (req.file.mimetype === 'text/plain') {
        extractedText = req.file.buffer.toString('utf-8');
      } else {
        return res.status(400).json({ error: "Formato de arquivo não suportado" });
      }

      if (!extractedText || extractedText.trim().length === 0) {
        return res.status(400).json({ error: "Não foi possível extrair texto do arquivo" });
      }

      let parsedData: any = { products: [] };

      // If we have images from PDF, use GPT-4 Vision for better extraction
      if (extractedImages.length > 0) {
        console.log('Processing PDF with GPT-4 Vision...');
        
        // Process each page image with Vision API
        for (let i = 0; i < extractedImages.length; i++) {
          try {
            const base64Image = extractedImages[i].toString('base64');
            
            const visionCompletion = await openai.chat.completions.create({
              model: "gpt-4o",
              messages: [{
                role: "user",
                content: [
                  {
                    type: "text",
                    text: `Você é um assistente especializado em extrair informações de catálogos de produtos.

Analise esta página de catálogo e extraia TODOS os produtos visíveis, retornando um JSON com a seguinte estrutura:
{
  "products": [
    {
      "name": "Nome do produto",
      "description": "Descrição breve do produto (se visível)",
      "price": preço_em_centavos (número inteiro, ex: 9990 para R$99,90, ou 0 se não visível),
      "category": "Categoria do produto (inferir se necessário)",
      "stock": 0,
      "hasImage": true/false (se há uma imagem do produto nesta página)
    }
  ]
}

REGRAS IMPORTANTES:
- Extraia TODOS os produtos visíveis na página
- O campo "price" DEVE ser um número inteiro em centavos
- Se o preço estiver como "7.00", "12.50", etc., converta para centavos (700, 1250)
- Se houver uma imagem do produto, marque hasImage como true
- Use "Geral" como categoria se não conseguir identificar
- Retorne APENAS o JSON, sem explicações`
                  },
                  {
                    type: "image_url",
                    image_url: {
                      url: `data:image/png;base64,${base64Image}`,
                      detail: "high"
                    }
                  }
                ]
              }],
              response_format: { type: "json_object" },
              max_tokens: 4000,
              temperature: 0.2,
            });

            const pageData = JSON.parse(visionCompletion.choices[0].message.content || "{}");
            if (pageData.products && Array.isArray(pageData.products)) {
              // Mark which page each product came from for image extraction later
              pageData.products.forEach((p: any) => {
                p.pageNumber = i + 1;
              });
              parsedData.products.push(...pageData.products);
            }
            
            console.log(`Extracted ${pageData.products?.length || 0} products from page ${i + 1}`);
          } catch (visionError) {
            console.error(`Error processing page ${i + 1} with Vision:`, visionError);
          }
        }
      } else {
        // Fallback to text-only extraction
        console.log('Processing with text-only extraction...');
        
        const prompt = `Você é um assistente especializado em extrair informações de produtos de documentos.

Analise o seguinte texto e extraia TODOS os produtos mencionados, retornando um JSON com a seguinte estrutura:
{
  "products": [
    {
      "name": "Nome do produto",
      "description": "Descrição breve do produto",
      "price": preço_em_centavos (número inteiro, ex: 9990 para R$99,90),
      "category": "Categoria do produto",
      "stock": 0
    }
  ]
}

REGRAS IMPORTANTES:
- O campo "price" DEVE ser um número inteiro em centavos (multiplique o valor em reais por 100)
- Se o preço estiver em formato "R$ 99,90", converta para 9990
- Se não houver categoria, use "Geral"
- Retorne APENAS o JSON, sem explicações adicionais

Texto do documento:
${extractedText.substring(0, 15000)}`;

        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: 4000,
          temperature: 0.3,
        });

        const responseContent = completion.choices[0].message.content || "{}";
        parsedData = JSON.parse(responseContent);
      }

      if (!parsedData.products || !Array.isArray(parsedData.products) || parsedData.products.length === 0) {
        return res.status(400).json({ error: "Nenhum produto foi encontrado no arquivo" });
      }

      console.log(`Total products extracted: ${parsedData.products.length}`);

      // For products with images, save the page as product image
      const objectStorage = new ObjectStorageService();
      
      for (const product of parsedData.products) {
        if (product.hasImage && product.pageNumber && extractedImages[product.pageNumber - 1]) {
          try {
            const pageImage = extractedImages[product.pageNumber - 1];
            
            // Upload page image to object storage as product image
            const timestamp = Date.now();
            const filename = `bulk-import/${req.user!.companyId!}/${timestamp}-page${product.pageNumber}.png`;
            
            const imageUrl = await objectStorage.uploadToPublicStorage(pageImage, filename, 'image/png');
            
            product.imageUrls = [imageUrl];
            console.log(`Uploaded image for product: ${product.name}`);
          } catch (uploadError) {
            console.error('Error uploading product image:', uploadError);
            product.imageUrls = [];
          }
        } else {
          product.imageUrls = [];
        }
      }

      // Create products in draft status
      const productsToCreate = parsedData.products.map((p: any) => ({
        companyId: req.user!.companyId!,
        name: p.name || "Produto sem nome",
        description: p.description || null,
        price: typeof p.price === 'number' ? p.price : 0,
        category: p.category || "Geral",
        stock: typeof p.stock === 'number' ? p.stock : 0,
        imageUrls: p.imageUrls || [],
        status: "draft",
        source: "bulk_import",
        isActive: false,
      }));

      const createdProducts = await storage.createProductsBulk(productsToCreate);
      
      res.json({
        success: true,
        count: createdProducts.length,
        products: createdProducts,
      });
    } catch (error) {
      console.error('Bulk import error:', error);
      res.status(500).json({ error: "Erro ao processar arquivo. Verifique o formato e tente novamente." });
    }
  });

  // Get draft products for review
  app.get("/api/products/drafts", requireAuth, async (req: AuthRequest, res) => {
    const drafts = await storage.getProductsByCompanyAndStatus(req.user!.companyId!, "draft");
    res.json(drafts);
  });

  // Publish a draft product (change status to published)
  app.post("/api/products/:id/publish", requireAuth, async (req: AuthRequest, res) => {
    try {
      const product = await storage.updateProductStatus(req.params.id, req.user!.companyId!, "published");
      if (!product) {
        return res.status(404).json({ error: "Produto não encontrado" });
      }
      // Also activate the product
      await storage.updateProduct(req.params.id, req.user!.companyId!, { isActive: true });
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Erro ao publicar produto" });
    }
  });

  // Publish all draft products at once
  app.post("/api/products/publish-all", requireAuth, async (req: AuthRequest, res) => {
    try {
      const drafts = await storage.getProductsByCompanyAndStatus(req.user!.companyId!, "draft");
      
      const updatePromises = drafts.map(draft => 
        storage.updateProduct(draft.id, req.user!.companyId!, { 
          status: "published", 
          isActive: true 
        })
      );
      
      await Promise.all(updatePromises);
      res.json({ success: true, count: drafts.length });
    } catch (error) {
      res.status(500).json({ error: "Erro ao publicar produtos" });
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
      
      // Send automatic notification to the conversation if order is linked to one
      if (order && order.conversationId) {
        try {
          // Get company info for personalized message
          const company = await storage.getCompany(req.user!.companyId!);
          
          // Create friendly status messages
          const companyName = company?.name ?? 'nossa equipe';
          const statusMessages: Record<string, string> = {
            'pending': `Seu pedido #${order.confirmationCode} foi registrado e está aguardando confirmação.`,
            'confirmed': `Boa notícia! Seu pedido #${order.confirmationCode} foi confirmado e está sendo preparado.`,
            'preparing': `Seu pedido #${order.confirmationCode} está sendo preparado com todo cuidado!`,
            'shipped': `Seu pedido #${order.confirmationCode} saiu para entrega! Em breve estará com você.`,
            'delivered': `Seu pedido #${order.confirmationCode} foi entregue! Esperamos que aproveite. Obrigado por comprar com ${companyName}!`,
            'cancelled': `Seu pedido #${order.confirmationCode} foi cancelado. Se tiver dúvidas, estou aqui para ajudar!`,
          };
          
          const notificationMessage = statusMessages[status] || 
            `Status do seu pedido #${order.confirmationCode} atualizado para: ${status}`;
          
          // Send automated agent message to the conversation
          await storage.createMessage({
            conversationId: order.conversationId,
            role: 'assistant',
            content: notificationMessage,
            metadata: {
              type: 'order_status_update',
              orderId: order.id,
              status: status,
              automated: true,
            },
          });
          
          // Log the notification
          await storage.createApiLog({
            companyId: req.user!.companyId!,
            type: 'order_status_notification',
            endpoint: '/api/orders/:id/status',
            method: 'PATCH',
            requestData: { orderId: order.id, newStatus: status },
            responseData: { messageSent: true },
            metadata: {
              conversationId: order.conversationId,
              confirmationCode: order.confirmationCode,
            },
          });
          
        } catch (notificationError) {
          console.error('Error sending order status notification:', notificationError);
          // Don't fail the status update if notification fails
        }
      }
      
      res.json(order);
    } catch (error) {
      res.status(400).json({ error: "Erro ao atualizar pedido" });
    }
  });

  // ============ CUSTOMER ROUTES ============

  // Get all customers
  app.get("/api/customers", requireAuth, async (req: AuthRequest, res) => {
    const customers = await storage.getCustomersByCompany(req.user!.companyId!);
    res.json(customers);
  });

  // Get single customer
  app.get("/api/customers/:id", requireAuth, async (req: AuthRequest, res) => {
    const customer = await storage.getCustomer(req.params.id, req.user!.companyId!);
    if (!customer) {
      return res.status(404).json({ error: "Cliente não encontrado" });
    }
    res.json(customer);
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

  // Get active conversations (for live monitoring)
  app.get("/api/conversations/active", requireAuth, async (req: AuthRequest, res) => {
    const conversations = await storage.getActiveConversations(req.user!.companyId!);
    res.json(conversations);
  });

  // Get conversation analytics and insights
  app.get("/api/conversations/analytics", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversations = await storage.getConversationsByCompany(req.user!.companyId!);
      
      // Calculate aggregate metrics
      const totalConversations = conversations.length;
      const activeConversations = conversations.filter(c => c.status === 'active').length;
      const humanTakenOver = conversations.filter(c => c.mode === 'human' || c.mode === 'hybrid').length;
      
      // Sentiment distribution
      const sentimentScores = conversations.filter(c => c.sentimentScore !== null).map(c => c.sentimentScore!);
      const avgSentiment = sentimentScores.length > 0 
        ? Math.round(sentimentScores.reduce((a, b) => a + b, 0) / sentimentScores.length)
        : 0;
      const positiveSentiment = sentimentScores.filter(s => s > 30).length;
      const neutralSentiment = sentimentScores.filter(s => s >= -30 && s <= 30).length;
      const negativeSentiment = sentimentScores.filter(s => s < -30).length;
      
      // Intent distribution
      const intentCounts: Record<string, number> = {};
      conversations.forEach(c => {
        if (c.currentIntent) {
          intentCounts[c.currentIntent] = (intentCounts[c.currentIntent] || 0) + 1;
        }
      });
      
      // Agent type distribution
      const agentTypeCounts: Record<string, number> = {};
      conversations.forEach(c => {
        if (c.activeAgentType) {
          agentTypeCounts[c.activeAgentType] = (agentTypeCounts[c.activeAgentType] || 0) + 1;
        }
      });
      
      // Complexity distribution
      const complexityScores = conversations.filter(c => c.complexityScore !== null).map(c => c.complexityScore!);
      const avgComplexity = complexityScores.length > 0
        ? Math.round(complexityScores.reduce((a, b) => a + b, 0) / complexityScores.length)
        : 0;
      const lowComplexity = complexityScores.filter(s => s < 30).length;
      const mediumComplexity = complexityScores.filter(s => s >= 30 && s <= 60).length;
      const highComplexity = complexityScores.filter(s => s > 60).length;
      
      res.json({
        overview: {
          totalConversations,
          activeConversations,
          humanTakenOver,
          aiHandled: totalConversations - humanTakenOver,
        },
        sentiment: {
          average: avgSentiment,
          positive: positiveSentiment,
          neutral: neutralSentiment,
          negative: negativeSentiment,
        },
        intents: intentCounts,
        agentTypes: agentTypeCounts,
        complexity: {
          average: avgComplexity,
          low: lowComplexity,
          medium: mediumComplexity,
          high: highComplexity,
        },
      });
    } catch (error) {
      console.error('Analytics error:', error);
      res.status(500).json({ error: "Erro ao calcular analytics" });
    }
  });

  // Takeover conversation (operator assumes control)
  app.post("/api/conversations/:id/takeover", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation || conversation.companyId !== req.user!.companyId!) {
        return res.status(404).json({ error: "Conversa não encontrada" });
      }

      await storage.takeoverConversation(req.params.id, req.user!.id!, req.user!.name!);
      
      // Send friendly system message to chat
      await storage.createMessage({
        conversationId: req.params.id,
        role: 'assistant',
        content: `Olá! Meu nome é ${req.user!.name} e agora vou continuar seu atendimento.`,
        metadata: { systemMessage: true, operatorName: req.user!.name },
      });

      res.json({ success: true });
    } catch (error) {
      console.error('Takeover error:', error);
      res.status(500).json({ error: "Erro ao assumir conversa" });
    }
  });

  // Send message as operator
  app.post("/api/conversations/:id/operator-message", requireAuth, async (req: AuthRequest, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation || conversation.companyId !== req.user!.companyId!) {
        return res.status(404).json({ error: "Conversa não encontrada" });
      }

      const { content } = req.body;
      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: "Mensagem vazia" });
      }

      const message = await storage.createMessage({
        conversationId: req.params.id,
        role: 'operator',
        content: content.trim(),
        operatorId: req.user!.id!,
        operatorName: req.user!.name!,
      });

      res.json(message);
    } catch (error) {
      console.error('Operator message error:', error);
      res.status(500).json({ error: "Erro ao enviar mensagem" });
    }
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
    // Only show published AND active products
    const activeProducts = products.filter(p => p.isActive && p.status === 'published');
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

  // Get conversation messages (public)
  app.get("/api/chatweb/:companyId/conversations/:conversationId/messages", async (req, res) => {
    try {
      const { companyId, conversationId } = req.params;
      
      // Verify conversation belongs to this company (security check)
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(403).json({ error: "Conversa não pertence a esta empresa" });
      }
      
      const messages = await storage.getMessagesByConversation(conversationId);
      res.json(messages);
    } catch (error) {
      res.status(400).json({ error: "Erro ao buscar mensagens" });
    }
  });

  // Send message and get AI response (public) with image and audio support
  app.post("/api/chatweb/:companyId/conversations/:conversationId/messages", 
    chatWebUpload.fields([{ name: 'image', maxCount: 1 }, { name: 'audio', maxCount: 1 }]),
    async (req, res) => {
    try {
      const { companyId, conversationId } = req.params;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const imageFile = files?.image?.[0];
      const audioFile = files?.audio?.[0];
      let content = req.body.content || '';

      console.log('Message received - content:', content, 'has image:', !!imageFile, 'has audio:', !!audioFile);

      // Verify conversation belongs to this company (security check)
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(403).json({ error: "Conversa não pertence a esta empresa" });
      }

      // Process image if uploaded
      let imageUrl: string | null = null;
      if (imageFile) {
        console.log('Processing image upload:', imageFile.originalname, imageFile.size, 'bytes');
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorage = new ObjectStorageService();
        imageUrl = await objectStorage.uploadToPublicStorage(
          imageFile.buffer, 
          `chatweb/images/${Date.now()}-${imageFile.originalname}`,
          imageFile.mimetype
        );
        console.log('Image uploaded to:', imageUrl);
        
        // Add image context to text if no other content
        if (!content.trim()) {
          content = 'O cliente enviou uma imagem. Por favor, analise e responda.';
        }
      }

      // Process audio if uploaded - transcribe with Whisper
      let audioTranscription = '';
      if (audioFile) {
        try {
          console.log('Processing audio upload:', audioFile.size, 'bytes');
          const fs = await import('fs');
          const path = await import('path');
          const tmpPath = path.join('/tmp', `audio-${Date.now()}.webm`);
          fs.writeFileSync(tmpPath, audioFile.buffer);
          
          console.log('Transcribing audio with Whisper...');
          const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tmpPath),
            model: "whisper-1",
            language: "pt",
          });
          
          audioTranscription = transcription.text;
          console.log('Audio transcription:', audioTranscription);
          fs.unlinkSync(tmpPath); // Clean up temp file
          
          if (audioTranscription) {
            content = (content ? content + ' ' : '') + audioTranscription;
          }
        } catch (error) {
          console.error('Audio transcription error:', error);
        }
      }

      // Validate we have some content
      if (!content.trim() && !imageUrl) {
        console.error('No content to process - content:', content, 'imageUrl:', imageUrl);
        return res.status(400).json({ error: "Mensagem vazia" });
      }
      
      console.log('Final content to be saved:', content.substring(0, 200));

      // Save user message with image in metadata
      const userMessage = await storage.createMessage({
        conversationId,
        role: 'user',
        content: content,
        metadata: imageUrl ? { imageUrl } : null,
      });

      // Check if conversation is in human mode - don't call AI if human took over
      console.log('🔍 Conversation mode:', conversation.mode);
      if (conversation.mode !== 'ai') {
        console.log('⚠️ Conversation NOT in AI mode - returning early');
        // Just return the user message without AI response
        return res.json(userMessage);
      }

      // Get company context
      const company = await storage.getCompany(companyId);
      const agent = await storage.getAgentByCompany(companyId);
      const products = await storage.getProductsByCompany(companyId);
      // Only use published AND active products for AI context
      const activeProducts = products.filter(p => p.isActive && p.status === 'published');

      // 🧠 CONVERSATION INTELLIGENCE: Analyze conversation to select best specialist agent
      const allMessages = await storage.getMessagesByConversation(conversationId);
      const analysis = await analyzeConversation(allMessages);
      
      // Update conversation with analysis results
      await storage.updateConversation(conversationId, {
        currentIntent: analysis.intent,
        sentimentScore: analysis.sentiment,
        complexityScore: analysis.complexity,
        activeAgentType: analysis.suggestedAgent,
        analysisUpdatedAt: new Date(),
      });

      console.log('🧠 Conversation Analysis:', {
        intent: analysis.intent,
        sentiment: analysis.sentiment,
        complexity: analysis.complexity,
        selectedAgent: analysis.suggestedAgent,
      });

      // Get conversation history FIRST (before building system prompt)
      const messages = await storage.getMessagesByConversation(conversationId);
      // Filter out the user message we just saved (last message) to avoid sending it twice
      const historyMessages = messages.filter(m => m.id !== userMessage.id);
      const conversationHistory = historyMessages.slice(-10).map(m => {
        // Check if message has image in metadata
        const metadata = m.metadata as { imageUrl?: string } | null;
        if (metadata?.imageUrl) {
          // Build full URL for image
          const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
          const fullImageUrl = metadata.imageUrl.startsWith('http') 
            ? metadata.imageUrl 
            : `https://${domain}${metadata.imageUrl}`;
          
          return {
            role: m.role as 'user' | 'assistant',
            content: [
              { type: "text" as const, text: m.content },
              { type: "image_url" as const, image_url: { url: fullImageUrl } }
            ]
          };
        }
        return {
          role: m.role as 'user' | 'assistant',
          content: m.content,
        };
      });

      console.log('📊 Conversation context:', {
        totalMessages: messages.length,
        historyMessages: historyMessages.length,
        historyUsed: conversationHistory.length,
        currentContent: content.substring(0, 100)
      });

      // Build system prompt (AFTER loading history)
      const toneInstructions = {
        'Empático': 'Seja caloroso, acolhedor e demonstre empatia genuína. Use linguagem amigável e próxima.',
        'Divertido': 'Seja descontraído, use um tom leve e bem-humorado. Torne a experiência divertida.',
        'Profissional': 'Seja formal, objetivo e profissional. Mantenha um tom respeitoso e direto.',
      };

      const personalityInstructions = {
        'passive': `PERSONALIDADE: Consultor Passivo
- Responda perguntas de forma educada e prestativa
- Aguarde o cliente tomar a iniciativa antes de sugerir produtos
- Seja informativo sem pressionar vendas
- Foque em responder exatamente o que foi perguntado`,
        
        'balanced': `PERSONALIDADE: Vendedor Equilibrado
- Seja proativo ao sugerir produtos relacionados quando relevante
- Destaque benefícios principais dos produtos mencionados
- Ofereça alternativas quando apropriado
- Respeite o ritmo do cliente, sem forçar decisões
${agent?.salesGoals ? `- Objetivo de vendas: ${agent.salesGoals}` : ''}
${agent?.productFocusStrategy ? `- Estratégia: ${agent.productFocusStrategy}` : ''}`,
        
        'proactive': `PERSONALIDADE: Vendedor Proativo
- Tome a iniciativa em oferecer produtos e soluções
- Crie senso de urgência quando apropriado (promoções, estoque limitado)
- Faça upsell e cross-sell ativamente
- Destaque todos os benefícios e diferenciais dos produtos
- Use gatilhos mentais para incentivar a compra
${agent?.salesGoals ? `- Objetivo principal: ${agent.salesGoals}` : ''}
${agent?.productFocusStrategy ? `- Foco estratégico: ${agent.productFocusStrategy}` : ''}`
      };

      const responseStyleInstruction = agent?.responseStyle 
        ? `Estilo de resposta: ${agent.responseStyle}` 
        : 'Use textos curtos e humanizados (máximo 2-3 frases por vez)';

      // Select specialist prompt based on analysis
      const specialistPrompt = SPECIALIST_PROMPTS[analysis.suggestedAgent as keyof typeof SPECIALIST_PROMPTS] || SPECIALIST_PROMPTS.seller;

      const systemPrompt = `Você é ${agent?.name || 'um assistente virtual'} da ${company?.name}.

Tom de voz: ${toneInstructions[agent?.toneOfVoice as keyof typeof toneInstructions] || toneInstructions['Profissional']}

${specialistPrompt}

CONTEXTO DA CONVERSA (Análise Inteligente):
- Intenção detectada: ${analysis.intent}
- Sentimento do cliente: ${analysis.sentiment > 30 ? 'Positivo' : analysis.sentiment < -30 ? 'Negativo' : 'Neutro'} (${analysis.sentiment}/100)
- Complexidade: ${analysis.complexity > 60 ? 'Alta' : analysis.complexity > 30 ? 'Média' : 'Baixa'} (${analysis.complexity}/100)
${analysis.complexity > 70 ? '⚠️ ATENÇÃO: Conversa complexa - considere transferir para humano se necessário' : ''}
${analysis.sentiment < -40 ? '⚠️ ATENÇÃO: Cliente frustrado - seja extra cuidadoso e empático' : ''}

${agent?.customInstructions ? `Instruções adicionais: ${agent.customInstructions}` : ''}

IMPORTANTE - Estilo de comunicação:
- ${responseStyleInstruction}
- Seja natural e conversacional
- Seja amigável e prestativo
- NUNCA peça a mesma informação duas vezes
- Leia o histórico antes de perguntar algo

═══════════════════════════════════════════════════════════════════
⚠️ REGRA CRÍTICA - CONTEXTO DA CONVERSA
═══════════════════════════════════════════════════════════════════
${conversationHistory.length > 0 
  ? `ATENÇÃO: Esta conversa JÁ TEM ${conversationHistory.length} mensagens anteriores!
     - NÃO cumprimente novamente
     - NÃO pergunte "como posso ajudar"
     - CONTINUE a conversa de onde parou
     - LEIA as mensagens anteriores para entender o contexto
     - Mantenha o assunto em andamento`
  : 'Esta é a PRIMEIRA mensagem da conversa. Cumprimente o cliente de forma amigável.'}

═══════════════════════════════════════════════════════════════════
🎯 FLUXO DE VENDA (3 ETAPAS - RÁPIDO E DIRETO)
═══════════════════════════════════════════════════════════════════

${conversationHistory.length === 0 
  ? '1️⃣ PRIMEIRA INTERAÇÃO: Cumprimente e pergunte o que o cliente procura' 
  : '1️⃣ PRODUTO: Identifique o que o cliente quer'}

→ SEMPRE mostre produtos com [Nome do Produto] para exibir imagem
→ Cliente disse que quer? CHAME add_to_cart IMEDIATAMENTE
→ Exemplo prático:
   Cliente: "quero café"
   Você: "Temos [Café Cuado] por R$ 12,00!" 
   Cliente: "quero 2"
   Você: [CHAMA add_to_cart com 2 unidades] + diz "Adicionei 2 [Café Cuado] no carrinho!"

2️⃣ DADOS PARA ENTREGA (pegue nome, telefone e CEP)

→ Produto no carrinho? Pergunte: "Nome, telefone e CEP?"
→ Cliente pode dar tudo junto ou separado
→ Recebeu CEP? CHAME get_address_by_cep IMEDIATAMENTE

3️⃣ FINALIZAR PEDIDO AUTOMATICAMENTE

⚠️⚠️⚠️ ATENÇÃO: Logo depois que get_address_by_cep retornar, você DEVE:
1. CHAMAR create_order IMEDIATAMENTE com os dados coletados
2. NÃO pedir confirmação
3. NÃO perguntar mais nada
4. SÓ informar: "Pedido confirmado! Código: XXX"

O pedido usa os itens que estão no carrinho (já adicionados com add_to_cart).

⚠️ SEQUÊNCIA OBRIGATÓRIA:
1. Cliente quer produto? → add_to_cart
2. Produto adicionado? → Pergunte dados
3. Cliente deu CEP? → get_address_by_cep  
4. CEP retornou? → create_order AGORA MESMO (não espere nada!)

═══════════════════════════════════════════════════════════════════
📦 CATÁLOGO (${activeProducts.length} produtos disponíveis)
═══════════════════════════════════════════════════════════════════

${activeProducts.slice(0, 20).map(p => `[${p.name}] - R$ ${(p.price / 100).toFixed(2)}`).join('\n')}

⚠️ IMPORTANTE: 
→ SEMPRE use [Nome do Produto] para mostrar imagem automática
→ Exemplo: "Temos [Café Cuado] disponível" ✅
→ NÃO faça: "Temos Café Cuado disponível" ❌ (sem colchetes = sem imagem!)

═══════════════════════════════════════════════════════════════════
🎯 SEU OBJETIVO
═══════════════════════════════════════════════════════════════════

Feche a venda RÁPIDO em 3 etapas:
1. Mostre produto → 2. add_to_cart → 3. create_order

SEJA DIRETO, NÃO ENROLE, NÃO PEÇA CONFIRMAÇÕES DESNECESSÁRIAS!`;

      // Prepare current message with image if present
      let currentMessage: any;
      if (imageUrl) {
        const domain = process.env.REPLIT_DOMAINS?.split(',')[0] || 'localhost:5000';
        const fullImageUrl = imageUrl.startsWith('http') 
          ? imageUrl 
          : `https://${domain}${imageUrl}`;
        
        currentMessage = {
          role: "user" as const,
          content: [
            { type: "text" as const, text: content },
            { type: "image_url" as const, image_url: { url: fullImageUrl } }
          ]
        };
      } else {
        currentMessage = { role: "user" as const, content };
      }

      // Prepare OpenAI messages
      const openaiMessages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory,
        currentMessage,
      ];

      // Define tools (functions) that the agent can use
      const tools = [
        {
          type: "function" as const,
          function: {
            name: "transfer_to_human",
            description: "Transfere o atendimento para um operador humano. Use esta função quando: 1) O cliente demonstrar frustração ou insatisfação com o atendimento automatizado, 2) O cliente solicitar explicitamente falar com um humano/atendente, 3) Houver uma situação complexa que você não consiga resolver, 4) O cliente não responder por muito tempo após várias tentativas suas.",
            parameters: {
              type: "object",
              properties: {
                reason: {
                  type: "string",
                  description: "Motivo da transferência (ex: 'cliente solicitou', 'frustração', 'sem resposta', 'situação complexa')"
                },
                summary: {
                  type: "string",
                  description: "Breve resumo do que foi conversado até agora para ajudar o atendente humano"
                }
              },
              required: ["reason", "summary"]
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "add_to_cart",
            description: "CHAME IMEDIATAMENTE quando cliente disser que quer um produto. Exemplos: 'quero café', 'me dá 2 mangas', 'adiciona no carrinho'. NÃO pergunte confirmação, ADICIONE DIRETO!",
            parameters: {
              type: "object",
              properties: {
                items: {
                  type: "array",
                  description: "Produtos para adicionar ao carrinho",
                  items: {
                    type: "object",
                    properties: {
                      productId: { type: "string", description: "Nome do produto (use o nome exato do catálogo)" },
                      quantity: { type: "number", description: "Quantidade desejada", default: 1 }
                    },
                    required: ["productId", "quantity"]
                  }
                }
              },
              required: ["items"]
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "get_address_by_cep",
            description: "CHAME AUTOMATICAMENTE quando cliente informar CEP (8 dígitos). Retorna endereço completo. Não precisa pedir autorização, BUSQUE DIRETO!",
            parameters: {
              type: "object",
              properties: {
                cep: {
                  type: "string",
                  description: "CEP brasileiro com 8 dígitos (pode conter ou não o hífen, ex: '01001000' ou '01001-000')"
                }
              },
              required: ["cep"]
            }
          }
        },
        {
          type: "function" as const,
          function: {
            name: "create_order",
            description: "CHAME AGORA quando tiver os 3 dados: Nome + Telefone + Endereço completo. NÃO pergunte se pode finalizar, NÃO peça confirmação. Só precisa desses 3 dados + produtos no carrinho. FINALIZE IMEDIATAMENTE!",
            parameters: {
              type: "object",
              properties: {
                customerName: {
                  type: "string",
                  description: "Nome completo do cliente"
                },
                customerPhone: {
                  type: "string",
                  description: "Telefone do cliente"
                },
                shippingAddress: {
                  type: "object",
                  description: "Endereço completo de entrega",
                  properties: {
                    street: { type: "string", description: "Rua e número (exemplo: 'Av Paulista, 1509')" },
                    complement: { type: "string", description: "Complemento (opcional)" },
                    neighborhood: { type: "string", description: "Bairro" },
                    city: { type: "string", description: "Cidade" },
                    state: { type: "string", description: "Estado (UF)" },
                    zip: { type: "string", description: "CEP" }
                  },
                  required: ["street", "neighborhood", "city", "state", "zip"]
                },
                items: {
                  type: "array",
                  description: "Lista de produtos do pedido (use os nomes exatos do catálogo)",
                  items: {
                    type: "object",
                    properties: {
                      productId: { type: "string", description: "Nome do produto (use o nome exato do catálogo)" },
                      name: { type: "string", description: "Nome do produto" },
                      price: { type: "number", description: "Preço unitário em centavos" },
                      quantity: { type: "number", description: "Quantidade" }
                    },
                    required: ["productId", "quantity"]
                  }
                }
              },
              required: ["customerName", "customerPhone", "shippingAddress", "items"]
            }
          }
        }
      ];

      // Call OpenAI with tools
      console.log('🤖 Calling OpenAI with', openaiMessages.length, 'messages');
      let completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        tools: tools,
        tool_choice: "auto",
        max_tokens: 500,
        temperature: 0.8,
      });

      console.log('✅ OpenAI responded:', {
        hasContent: !!completion.choices[0].message.content,
        hasFunctionCall: !!completion.choices[0].message.tool_calls,
        functionName: completion.choices[0].message.tool_calls?.[0]?.function?.name
      });

      let assistantMessage = completion.choices[0].message.content?.trim() || "";
      let orderConfirmationCode: string | null = null;

      // Check if the agent wants to call a function
      if (completion.choices[0].message.tool_calls && completion.choices[0].message.tool_calls.length > 0) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        
        if (toolCall.type === "function" && toolCall.function.name === "transfer_to_human") {
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            // Mark conversation as needing human attention
            await storage.updateConversation(conversationId, {
              needsHumanAttention: true,
              transferReason: functionArgs.reason,
            });
            
            // Save transfer message
            const transferMessage = `Entendo sua situação. Estou transferindo você para um de nossos atendentes que poderá ajudá-lo melhor. Por favor, aguarde um momento.`;
            
            await storage.createMessage({
              conversationId,
              role: 'assistant',
              content: transferMessage,
              metadata: {
                systemMessage: true,
                transferToHuman: true,
                reason: functionArgs.reason,
                summary: functionArgs.summary
              },
            });
            
            return res.json({
              role: 'assistant',
              content: transferMessage,
              metadata: { transferToHuman: true }
            });
          } catch (error) {
            console.error('Error transferring to human:', error);
            assistantMessage = "Vou transferir você para um atendente. Por favor, aguarde.";
          }
        } else if (toolCall.type === "function" && toolCall.function.name === "add_to_cart") {
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
            console.log('🛒 add_to_cart called with args:', JSON.stringify(functionArgs));
            console.log('📦 Available products:', activeProducts.map(p => ({ id: p.id, name: p.name })));
            
            // Build cart items with real product data
            const cartItems = [];
            for (const item of functionArgs.items) {
              // Try to find by ID first, then by name (case insensitive)
              const product = activeProducts.find(p => 
                p.id === item.productId || 
                p.name.toLowerCase() === item.productId.toLowerCase()
              );
              console.log('🔍 Looking for product:', item.productId, 'Found:', product?.name || 'NOT FOUND');
              if (product) {
                cartItems.push({
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  quantity: item.quantity,
                  imageUrl: product.imageUrls?.[0] || undefined
                });
              }
            }
            
            console.log('✅ Cart items built:', cartItems.length, 'items');
            
            if (cartItems.length > 0) {
              // Send function result back to the model
              const functionResultMessages = [
                ...openaiMessages,
                completion.choices[0].message,
                {
                  role: "tool" as const,
                  tool_call_id: toolCall.id,
                  content: JSON.stringify({
                    success: true,
                    itemsAdded: cartItems.length,
                    cart: cartItems,
                    message: `${cartItems.length} produto(s) adicionado(s) ao carrinho`
                  })
                }
              ];
              
              // Get final response from the model (allow it to continue calling functions)
              const secondCompletion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: functionResultMessages,
                tools: tools,
                tool_choice: "auto",
                max_tokens: 500,
                temperature: 0.8,
              });
              
              assistantMessage = secondCompletion.choices[0].message.content || 
                `Adicionei ${cartItems.length} produto(s) ao seu carrinho!`;
              
              // Save the assistant's response with cart metadata
              const savedMessage = await storage.createMessage({
                conversationId,
                role: 'assistant',
                content: assistantMessage,
                metadata: {
                  cartItems: cartItems,
                  functionCalled: 'add_to_cart'
                },
              });
              
              return res.json(savedMessage);
            }
          } catch (error) {
            console.error('Error adding to cart via function call:', error);
            assistantMessage = "Desculpe, não consegui adicionar ao carrinho. Por favor, tente novamente.";
          }
        } else if (toolCall.type === "function" && toolCall.function.name === "get_address_by_cep") {
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
            const cep = functionArgs.cep.replace(/\D/g, ''); // Remove non-digits
            
            // Validate CEP format (must be 8 digits)
            if (cep.length !== 8 || !/^\d{8}$/.test(cep)) {
              const functionResult = {
                success: false,
                error: "CEP inválido. O CEP deve conter exatamente 8 dígitos."
              };
              
              const functionResultMessages = [
                ...openaiMessages,
                completion.choices[0].message,
                {
                  role: "tool" as const,
                  tool_call_id: toolCall.id,
                  content: JSON.stringify(functionResult)
                }
              ];
              
              const secondCompletion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: functionResultMessages,
                max_tokens: 500,
                temperature: 0.8,
              });
              
              assistantMessage = secondCompletion.choices[0].message.content || 
                "CEP inválido. Por favor, informe um CEP válido com 8 dígitos.";
              
              const savedMessage = await storage.createMessage({
                conversationId,
                role: 'assistant',
                content: assistantMessage,
                metadata: { functionCalled: 'get_address_by_cep', cepData: functionResult },
              });
              
              return res.json(savedMessage);
            }
            
            console.log('Fetching address for CEP:', cep);
            
            let functionResult;
            try {
              // Call ViaCEP API with timeout
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
              
              const viacepResponse = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
                signal: controller.signal
              });
              clearTimeout(timeoutId);
              
              if (!viacepResponse.ok) {
                throw new Error(`ViaCEP returned status ${viacepResponse.status}`);
              }
              
              const viacepData = await viacepResponse.json();
              
              if (viacepData.erro) {
                // CEP not found
                functionResult = {
                  success: false,
                  error: "CEP não encontrado. Verifique se o CEP está correto."
                };
              } else {
                // CEP found successfully
                functionResult = {
                  success: true,
                  address: {
                    cep: viacepData.cep,
                    street: viacepData.logradouro,
                    complement: viacepData.complemento,
                    neighborhood: viacepData.bairro,
                    city: viacepData.localidade,
                    state: viacepData.uf
                  }
                };
              }
            } catch (fetchError: any) {
              console.error('ViaCEP API error:', fetchError);
              // Network error, timeout, or API unavailable
              functionResult = {
                success: false,
                error: "Não foi possível buscar o CEP no momento. Por favor, informe o endereço completo manualmente."
              };
            }
            
            console.log('ViaCEP result:', functionResult);
            
            // Send function result back to the model
            const functionResultMessages = [
              ...openaiMessages,
              completion.choices[0].message,
              {
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify(functionResult)
              }
            ];
            
            // Get final response from the model (allow it to call more functions like create_order)
            const secondCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: functionResultMessages,
              tools: tools,
              tool_choice: "auto",
              max_tokens: 500,
              temperature: 0.8,
            });
            
            // Check if the second completion called another function (like create_order)
            const secondMessage = secondCompletion.choices[0].message;
            if (secondMessage.tool_calls && secondMessage.tool_calls.length > 0) {
              const nextToolCall = secondMessage.tool_calls[0];
              console.log('🔄 Second completion called another function:', nextToolCall.function.name);
              
              // If it's create_order, process it now
              if (nextToolCall.function.name === 'create_order') {
                try {
                  const functionArgs = JSON.parse(nextToolCall.function.arguments);
                  
                  // SECURITY: Recalculate total from actual product catalog
                  let total = 0;
                  const validatedItems = [];
                  for (const item of functionArgs.items) {
                    const product = activeProducts.find(p => 
                      p.id === item.productId || 
                      p.name.toLowerCase() === item.productId.toLowerCase()
                    );
                    if (product) {
                      const itemTotal = product.price * item.quantity;
                      total += itemTotal;
                      validatedItems.push({
                        productId: product.id,
                        name: product.name,
                        price: product.price,
                        quantity: item.quantity
                      });
                    }
                  }
                  
                  functionArgs.items = validatedItems;
                  
                  // Create the order
                  const orderData = {
                    companyId,
                    conversationId,
                    customerName: functionArgs.customerName,
                    customerPhone: functionArgs.customerPhone,
                    customerEmail: functionArgs.customerEmail || null,
                    shippingAddress: functionArgs.shippingAddress,
                    paymentMethod: functionArgs.paymentMethod || 'pix',
                    items: functionArgs.items,
                    total,
                    status: 'pending' as const,
                  };
                  
                  const order = await storage.createOrder(orderData);
                  orderConfirmationCode = order.confirmationCode || null;
                  
                  // Save/update customer with omnichannel deduplication
                  try {
                    const currentConversation = await storage.getConversation(conversationId);
                    const channel = currentConversation?.channel || 'chatweb';
                    
                    const customer = await storage.findOrCreateCustomer(companyId, {
                      name: functionArgs.customerName,
                      phone: functionArgs.customerPhone,
                      email: functionArgs.customerEmail || null,
                      cpf: functionArgs.cpf || null,
                      cnpj: functionArgs.cnpj || null,
                      customerType: functionArgs.customerType || 'individual',
                      companyName: functionArgs.companyName || null,
                      tradeName: functionArgs.tradeName || null,
                      stateRegistration: functionArgs.stateRegistration || null,
                      shippingAddress: functionArgs.shippingAddress,
                      channel: channel,
                    });
                    
                    await storage.updateCustomerStats(customer.id, total);
                    await storage.updateConversation(conversationId, {
                      customerId: customer.id,
                      customerName: functionArgs.customerName,
                      customerPhone: functionArgs.customerPhone,
                    });
                    
                    console.log(`✅ Customer identified/created: ${customer.name} (${customer.id}) via ${channel}`);
                  } catch (customerError) {
                    console.error('Error saving/updating customer:', customerError);
                  }
                  
                  assistantMessage = `Pedido confirmado! Total: R$ ${(total / 100).toFixed(2)}, Código: ${orderConfirmationCode}. Agradecemos pela sua compra!`;
                  
                  const savedMessage = await storage.createMessage({
                    conversationId,
                    role: 'assistant',
                    content: assistantMessage,
                    metadata: {
                      orderId: order.id,
                      confirmationCode: orderConfirmationCode,
                      functionCalled: 'create_order'
                    },
                  });
                  
                  return res.json(savedMessage);
                } catch (error) {
                  console.error('Error creating order after CEP lookup:', error);
                  assistantMessage = "Desculpe, não consegui finalizar o pedido. Por favor, tente novamente.";
                }
              }
            }
            
            assistantMessage = secondCompletion.choices[0].message.content || 
              (functionResult.success && functionResult.address
                ? `Encontrei o endereço: ${functionResult.address.street}, ${functionResult.address.neighborhood}, ${functionResult.address.city}-${functionResult.address.state}`
                : "Não consegui encontrar esse CEP. Por favor, verifique se está correto.");
            
            // Save the assistant's response
            const savedMessage = await storage.createMessage({
              conversationId,
              role: 'assistant',
              content: assistantMessage,
              metadata: {
                functionCalled: 'get_address_by_cep',
                cepData: functionResult
              },
            });
            
            return res.json(savedMessage);
          } catch (error) {
            console.error('Error fetching CEP:', error);
            assistantMessage = "Desculpe, não consegui buscar o endereço. Por favor, tente novamente ou informe o endereço completo manualmente.";
          }
        } else if (toolCall.type === "function" && toolCall.function.name === "create_order") {
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            // SECURITY: Recalculate total from actual product catalog (don't trust AI-provided prices)
            let total = 0;
            const validatedItems = [];
            for (const item of functionArgs.items) {
              // Try to find by ID first, then by name (case insensitive)
              const product = activeProducts.find(p => 
                p.id === item.productId || 
                p.name.toLowerCase() === item.productId.toLowerCase()
              );
              if (product) {
                // Use real product price from catalog, not AI-provided price
                const itemTotal = product.price * item.quantity;
                total += itemTotal;
                validatedItems.push({
                  productId: product.id,
                  name: product.name,
                  price: product.price, // Real price from catalog
                  quantity: item.quantity
                });
              }
            }
            
            // Use validated items with real prices
            functionArgs.items = validatedItems;
            
            // Create the order with defaults
            const orderData = {
              companyId,
              conversationId,
              customerName: functionArgs.customerName,
              customerPhone: functionArgs.customerPhone,
              customerEmail: functionArgs.customerEmail || null,
              shippingAddress: functionArgs.shippingAddress,
              paymentMethod: functionArgs.paymentMethod || 'pix', // Default to PIX
              items: functionArgs.items,
              total,
              status: 'pending' as const,
            };
            
            const order = await storage.createOrder(orderData);
            orderConfirmationCode = order.confirmationCode || null;
            
            // Save/update customer in the system with omnichannel deduplication
            try {
              // Get conversation to determine channel
              const currentConversation = await storage.getConversation(conversationId);
              const channel = currentConversation?.channel || 'chatweb';
              
              // Find or create customer (automatically deduplicates across phone, email, CPF, CNPJ)
              const customer = await storage.findOrCreateCustomer(companyId, {
                name: functionArgs.customerName,
                phone: functionArgs.customerPhone,
                email: functionArgs.customerEmail || null,
                cpf: functionArgs.cpf || null,
                cnpj: functionArgs.cnpj || null,
                customerType: functionArgs.customerType || 'individual',
                companyName: functionArgs.companyName || null,
                tradeName: functionArgs.tradeName || null,
                stateRegistration: functionArgs.stateRegistration || null,
                shippingAddress: functionArgs.shippingAddress,
                channel: channel, // Track which channel this interaction came from
              });
              
              // Update customer stats
              await storage.updateCustomerStats(customer.id, total);
              
              // Link conversation to identified customer
              await storage.updateConversation(conversationId, {
                customerId: customer.id,
                customerName: functionArgs.customerName,
                customerPhone: functionArgs.customerPhone,
              });
              
              console.log(`✅ Customer identified/created: ${customer.name} (${customer.id}) via ${channel}`);
            } catch (customerError) {
              console.error('Error saving/updating customer:', customerError);
              // Don't fail the order if customer save fails
            }
            
            // Log order creation
            await storage.createApiLog({
              companyId,
              type: 'order_created',
              endpoint: '/api/chatweb/:companyId/conversations/:conversationId/messages',
              method: 'POST',
              requestData: orderData,
              responseData: order,
              metadata: {
                confirmationCode: order.confirmationCode,
                total: order.total,
                customerName: order.customerName,
                viaFunctionCalling: true,
              },
            });
            
            // Send function result back to the model
            const totalFormatted = (order.total / 100).toFixed(2);
            const functionResultMessages = [
              ...openaiMessages,
              completion.choices[0].message,
              {
                role: "tool" as const,
                tool_call_id: toolCall.id,
                content: JSON.stringify({
                  success: true,
                  confirmationCode: order.confirmationCode,
                  orderId: order.id,
                  total: order.total,
                  totalFormatted: `R$ ${totalFormatted}`,
                  message: `Pedido criado com sucesso! Total: R$ ${totalFormatted}, Código: ${order.confirmationCode}`
                })
              }
            ];
            
            // Get final response from the model
            const secondCompletion = await openai.chat.completions.create({
              model: "gpt-4o-mini",
              messages: functionResultMessages,
              max_tokens: 500,
              temperature: 0.8,
            });
            
            assistantMessage = secondCompletion.choices[0].message.content || 
              `Pedido confirmado! Valor total: R$ ${totalFormatted}. Seu código de confirmação é: ${order.confirmationCode}`;
            
          } catch (error) {
            console.error('Error creating order via function call:', error);
            assistantMessage = "Desculpe, ocorreu um erro ao processar seu pedido. Por favor, tente novamente.";
          }
        }
      }

      if (!assistantMessage || assistantMessage.length === 0) {
        // If the model didn't return a message, generate a context-aware fallback
        assistantMessage = conversationHistory.length === 0 
          ? "Olá! Como posso ajudar você hoje?" 
          : "Desculpe, pode reformular? Não entendi bem.";
        console.log('⚠️ Using fallback message:', assistantMessage);
      }

      console.log('💬 Final assistant message:', assistantMessage.substring(0, 100));

      // Log OpenAI prompt for admin monitoring
      await storage.createApiLog({
        companyId,
        type: 'openai_prompt',
        endpoint: '/v1/chat/completions',
        method: 'POST',
        requestData: {
          model: "gpt-3.5-turbo",
          messages: openaiMessages,
          max_tokens: 500,
          temperature: 0.8,
        },
        responseData: {
          message: assistantMessage,
          model: completion.model,
          usage: completion.usage,
        },
        metadata: {
          conversationId,
          userMessage: content.substring(0, 100), // First 100 chars for context
        },
      });

      // Save the main assistant message first (text response)
      const savedMessage = await storage.createMessage({
        conversationId,
        role: 'assistant',
        content: assistantMessage,
        metadata: orderConfirmationCode ? { confirmationCode: orderConfirmationCode } : null,
      });

      // Detect products mentioned in the response using [Product Name] format
      const productRegex = /\[([^\]]+)\]/g;
      const matches = Array.from(assistantMessage.matchAll(productRegex));
      const mentionedProductNames = matches.map(m => m[1].trim());
      
      // For each mentioned product, send a SEPARATE message with image and info
      // This creates one message bubble per product
      const productMessages = [];
      for (const productName of mentionedProductNames) {
        const product = activeProducts.find(p => 
          p.name.toLowerCase() === productName.toLowerCase()
        );
        
        if (product && product.imageUrls && product.imageUrls.length > 0) {
          // Create product info message with image
          const productInfo = `${product.name}\nR$ ${(product.price / 100).toFixed(2)}${product.description ? `\n${product.description}` : ''}`;
          
          const productMessage = await storage.createMessage({
            conversationId,
            role: 'assistant',
            content: productInfo,
            metadata: {
              productImage: product.imageUrls[0], // First image only
              productId: product.id,
              productName: product.name,
              productPrice: product.price,
            },
          });
          
          productMessages.push(productMessage);
        }
      }

      // Return the main message AND product messages so frontend can display them
      res.json({
        message: savedMessage,
        productMessages: productMessages
      });
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
      
      // Log order creation for admin monitoring
      await storage.createApiLog({
        companyId,
        type: 'order_created',
        endpoint: '/api/chatweb/:companyId/orders',
        method: 'POST',
        requestData: data,
        responseData: order,
        metadata: {
          confirmationCode: order.confirmationCode,
          total: order.total,
          customerName: order.customerName,
        },
      });
      
      // Return order with confirmation code
      res.json({ 
        ...order, 
        message: `Pedido confirmado! Código de confirmação: ${order.confirmationCode}` 
      });
    } catch (error) {
      console.error('Error creating order:', error);
      res.status(400).json({ error: "Erro ao criar pedido" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
