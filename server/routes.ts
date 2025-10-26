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
  app.post("/api/agent/documents", requireAuth, upload.array('documents', 10), async (req: AuthRequest, res) => {
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

      // Verify conversation belongs to this company (security check)
      const conversation = await storage.getConversation(conversationId);
      if (!conversation || conversation.companyId !== companyId) {
        return res.status(403).json({ error: "Conversa não pertence a esta empresa" });
      }

      // Process image if uploaded
      let imageContext = '';
      if (imageFile) {
        const { ObjectStorageService } = await import('./objectStorage');
        const objectStorage = new ObjectStorageService();
        const imageUrl = await objectStorage.uploadToPublicStorage(
          imageFile.buffer, 
          `chatweb/images/${Date.now()}-${imageFile.originalname}`,
          imageFile.mimetype
        );
        imageContext = `\n\n[O cliente enviou uma imagem: ${imageUrl}]\nPor favor, analise a imagem e responda de acordo.`;
      }

      // Process audio if uploaded - transcribe with Whisper
      let audioTranscription = '';
      if (audioFile) {
        try {
          const fs = await import('fs');
          const path = await import('path');
          const tmpPath = path.join('/tmp', `audio-${Date.now()}.webm`);
          fs.writeFileSync(tmpPath, audioFile.buffer);
          
          const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(tmpPath),
            model: "whisper-1",
            language: "pt",
          });
          
          audioTranscription = transcription.text;
          fs.unlinkSync(tmpPath); // Clean up temp file
          
          if (audioTranscription) {
            content = (content ? content + ' ' : '') + audioTranscription;
          }
        } catch (error) {
          console.error('Audio transcription error:', error);
        }
      }

      // Combine all content
      const finalContent = content + imageContext;

      // Save user message
      await storage.createMessage({
        conversationId,
        role: 'user',
        content: finalContent,
        metadata: null,
      });

      // Get company context
      const company = await storage.getCompany(companyId);
      const agent = await storage.getAgentByCompany(companyId);
      const products = await storage.getProductsByCompany(companyId);
      // Only use published AND active products for AI context
      const activeProducts = products.filter(p => p.isActive && p.status === 'published');

      // Build system prompt
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

      const systemPrompt = `Você é ${agent?.name || 'um assistente virtual'} da ${company?.name}.

Tom de voz: ${toneInstructions[agent?.toneOfVoice as keyof typeof toneInstructions] || toneInstructions['Profissional']}

${personalityInstructions[agent?.sellerPersonality as keyof typeof personalityInstructions] || personalityInstructions['balanced']}

${agent?.customInstructions ? `Instruções adicionais: ${agent.customInstructions}` : ''}

IMPORTANTE - Estilo de comunicação:
- ${responseStyleInstruction}
- Seja natural e conversacional
- Quando recomendar produtos, mencione EXATAMENTE o nome do produto como aparece no catálogo
- Use emojis de forma moderada para dar personalidade

Você tem acesso ao catálogo de produtos da empresa. Quando mencionar um produto específico, diga algo como:
"Olha só esse [NOME DO PRODUTO]! 😍" ou "Te recomendo o [NOME DO PRODUTO]!"

Catálogo disponível (${activeProducts.length} produtos):
${activeProducts.slice(0, 20).map(p => `- [${p.name}]: R$ ${(p.price / 100).toFixed(2)}${p.description ? ` - ${p.description.substring(0, 100)}` : ''}`).join('\n')}

REGRA CRÍTICA: Quando mencionar um produto, use o nome EXATO entre colchetes [NOME DO PRODUTO] para que o sistema possa exibir a imagem automaticamente.

PROCESSAMENTO DE PEDIDOS - FUNÇÃO AUTOMÁTICA:
Você tem acesso à função 'create_order' que cria pedidos automaticamente no sistema.

Quando o cliente quiser fazer um pedido:
1. Colete as informações obrigatórias de forma natural na conversa:
   - Nome completo do cliente
   - Telefone para contato
   - Endereço completo (CEP, rua, número, complemento, bairro, cidade, estado)
   - Método de pagamento (PIX, cartão, boleto ou dinheiro)
   - Produtos e quantidades desejadas

2. Confirme TODAS as informações com o cliente antes de prosseguir

3. Use a função 'create_order' para criar o pedido automaticamente no sistema
   - A função vai gerar um código de confirmação único
   - O pedido será salvo no sistema
   
4. Após a função criar o pedido com sucesso, você receberá o código de confirmação
   - Informe o código ao cliente de forma amigável
   - Exemplo: "✅ Pedido confirmado! Seu código de confirmação é: XXXX"

IMPORTANTE: Não tente simular a criação de pedidos. Use sempre a função 'create_order' quando tiver todas as informações necessárias.

Seu objetivo é:
1. Atender o cliente de forma personalizada e natural
2. Recomendar produtos que atendam suas necessidades  
3. Ajudar a fechar vendas de forma consultiva
4. Fornecer informações sobre produtos, preços e disponibilidade
5. Criar pedidos de forma eficaz usando a função disponível`;

      // Get conversation history
      const messages = await storage.getMessagesByConversation(conversationId);
      const conversationHistory = messages.slice(-10).map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      // Prepare OpenAI messages
      const openaiMessages = [
        { role: "system" as const, content: systemPrompt },
        ...conversationHistory,
        { role: "user" as const, content },
      ];

      // Define tools (functions) that the agent can use
      const tools = [
        {
          type: "function" as const,
          function: {
            name: "create_order",
            description: "Cria um novo pedido após coletar todas as informações obrigatórias do cliente. Use esta função apenas quando tiver TODAS as informações necessárias.",
            parameters: {
              type: "object",
              properties: {
                customerName: {
                  type: "string",
                  description: "Nome completo do cliente"
                },
                customerPhone: {
                  type: "string",
                  description: "Telefone do cliente para contato"
                },
                customerEmail: {
                  type: "string",
                  description: "Email do cliente (opcional)"
                },
                shippingAddress: {
                  type: "object",
                  description: "Endereço completo de entrega",
                  properties: {
                    street: { type: "string", description: "Rua e número" },
                    complement: { type: "string", description: "Complemento (opcional)" },
                    neighborhood: { type: "string", description: "Bairro" },
                    city: { type: "string", description: "Cidade" },
                    state: { type: "string", description: "Estado (UF)" },
                    zip: { type: "string", description: "CEP" }
                  },
                  required: ["street", "neighborhood", "city", "state", "zip"]
                },
                paymentMethod: {
                  type: "string",
                  enum: ["pix", "card", "boleto", "cash"],
                  description: "Método de pagamento: pix, card (cartão), boleto ou cash (dinheiro)"
                },
                items: {
                  type: "array",
                  description: "Lista de produtos do pedido",
                  items: {
                    type: "object",
                    properties: {
                      productId: { type: "string", description: "ID do produto" },
                      name: { type: "string", description: "Nome do produto" },
                      price: { type: "number", description: "Preço unitário em centavos" },
                      quantity: { type: "number", description: "Quantidade" }
                    },
                    required: ["productId", "name", "price", "quantity"]
                  }
                }
              },
              required: ["customerName", "customerPhone", "shippingAddress", "paymentMethod", "items"]
            }
          }
        }
      ];

      // Call OpenAI with tools
      let completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: openaiMessages,
        tools: tools,
        tool_choice: "auto",
        max_tokens: 500,
        temperature: 0.8,
      });

      let assistantMessage = completion.choices[0].message.content || "";
      let orderConfirmationCode: string | null = null;

      // Check if the agent wants to call a function
      if (completion.choices[0].message.tool_calls && completion.choices[0].message.tool_calls.length > 0) {
        const toolCall = completion.choices[0].message.tool_calls[0];
        
        if (toolCall.type === "function" && toolCall.function.name === "create_order") {
          try {
            const functionArgs = JSON.parse(toolCall.function.arguments);
            
            // SECURITY: Recalculate total from actual product catalog (don't trust AI-provided prices)
            let total = 0;
            const validatedItems = [];
            for (const item of functionArgs.items) {
              const product = activeProducts.find(p => p.id === item.productId);
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
            
            // Create the order
            const orderData = {
              companyId,
              conversationId,
              customerName: functionArgs.customerName,
              customerPhone: functionArgs.customerPhone,
              customerEmail: functionArgs.customerEmail || null,
              shippingAddress: functionArgs.shippingAddress,
              paymentMethod: functionArgs.paymentMethod,
              items: functionArgs.items,
              total,
              status: 'pending' as const,
            };
            
            const order = await storage.createOrder(orderData);
            orderConfirmationCode = order.confirmationCode || null;
            
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
                  message: "Pedido criado com sucesso!"
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
              `✅ Pedido confirmado! Seu código de confirmação é: ${order.confirmationCode}`;
            
          } catch (error) {
            console.error('Error creating order via function call:', error);
            assistantMessage = "Desculpe, ocorreu um erro ao processar seu pedido. Por favor, tente novamente.";
          }
        }
      }

      if (!assistantMessage) {
        assistantMessage = "Desculpe, não consegui processar sua mensagem.";
      }

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

      // Detect products mentioned in the response using [Product Name] format
      const productRegex = /\[([^\]]+)\]/g;
      const matches = Array.from(assistantMessage.matchAll(productRegex));
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

      // Update conversation timestamp is automatic via database

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
