import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean, jsonb, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Admin users table (platform operators)
export const adminUsers = pgTable("admin_users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertAdminUserSchema = createInsertSchema(adminUsers).omit({ id: true, createdAt: true });
export type InsertAdminUser = z.infer<typeof insertAdminUserSchema>;
export type AdminUser = typeof adminUsers.$inferSelect;

// Companies table (multi-tenant)
export const companies = pgTable("companies", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  segment: text("segment").notNull(), // e.g., "E-commerce", "Serviços", "Alimentação"
  cpfCnpj: text("cpf_cnpj").notNull().unique(), // Can be CPF or CNPJ
  logoUrl: text("logo_url"),
  status: text("status").notNull().default("active"), // active, suspended, trial
  webhookAuthEnabled: boolean("webhook_auth_enabled").notNull().default(false),
  webhookToken: text("webhook_token"), // Bearer token for webhook security
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertCompanySchema = createInsertSchema(companies).omit({ id: true, createdAt: true });
export type InsertCompany = z.infer<typeof insertCompanySchema>;
export type Company = typeof companies.$inferSelect;

// Company users table (each company's users)
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  email: text("email").notNull().unique(), // Email must be globally unique
  password: text("password").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("owner"), // owner, admin, member
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// AI Agent configuration per company
export const agents = pgTable("agents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }).unique(),
  name: text("name").notNull(),
  toneOfVoice: text("tone_of_voice").notNull(), // "Empático", "Divertido", "Profissional"
  sellerPersonality: text("seller_personality").notNull().default("balanced"), // "passive", "balanced", "proactive"
  customInstructions: text("custom_instructions"),
  contextDocuments: text("context_documents").array(), // URLs of uploaded context documents
  salesGoals: text("sales_goals"), // e.g., "Aumentar ticket médio", "Foco em upsell"
  productFocusStrategy: text("product_focus_strategy"), // e.g., "Promover produtos em promoção", "Destacar lançamentos"
  responseStyle: text("response_style"), // e.g., "Respostas curtas e diretas", "Detalhadas e educativas"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Agent = typeof agents.$inferSelect;

// Products table (catalog)
export const products = pgTable("products", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(), // stored in cents
  category: text("category"),
  imageUrls: text("image_urls").array(), // array of image URLs (max 3)
  stock: integer("stock").notNull().default(0),
  status: text("status").notNull().default("published"), // "draft" or "published"
  source: text("source").notNull().default("manual"), // "manual" or "bulk_import"
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertProductSchema = createInsertSchema(products).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof products.$inferSelect;

// Orders table
export const orders = pgTable("orders", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  conversationId: varchar("conversation_id").references(() => conversations.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email"),
  customerPhone: text("customer_phone"),
  status: text("status").notNull().default("pending"), // pending, confirmed, preparing, shipped, delivered, cancelled
  total: integer("total").notNull(), // in cents
  paymentMethod: text("payment_method"), // pix, card, boleto (mock)
  items: jsonb("items").notNull(), // array of {productId, name, price, quantity}
  shippingAddress: jsonb("shipping_address"), // {street, city, state, zip}
  confirmationCode: varchar("confirmation_code", { length: 4 }), // 4-digit alphanumeric order confirmation code
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Custom schema for AI-created orders with minimal required fields
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true }).extend({
  customerPhone: z.string().min(1, "Telefone é obrigatório"),
  shippingAddress: z.object({
    street: z.string().optional(),
    complement: z.string().optional(),
    neighborhood: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zip: z.string().optional(),
  }).optional(),
  paymentMethod: z.enum(["pix", "card", "boleto", "cash"]).default("pix"),
});
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof orders.$inferSelect;

// Customers table (clientes)
export const customers = pgTable("customers", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: text("name").notNull(),
  
  // Contact information
  phone: text("phone").notNull(), // Normalized phone (only numbers)
  phoneRaw: text("phone_raw"), // Original phone as provided
  email: text("email"),
  
  // Identification documents
  customerType: text("customer_type").notNull().default("individual"), // 'individual' or 'business'
  cpf: text("cpf"), // CPF for individuals (normalized, only numbers)
  cnpj: text("cnpj"), // CNPJ for businesses (normalized, only numbers)
  
  // Business customer fields (B2B)
  companyName: text("company_name"), // Razão social
  tradeName: text("trade_name"), // Nome fantasia
  stateRegistration: text("state_registration"), // Inscrição estadual
  
  // Address and stats
  shippingAddress: jsonb("shipping_address"), // last known address: {street, complement, neighborhood, city, state, zip}
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpent: integer("total_spent").notNull().default(0), // in cents
  
  // Omnichannel tracking
  firstSeenChannel: text("first_seen_channel"), // 'chatweb', 'whatsapp', 'instagram'
  channels: text("channels").array().default(sql`ARRAY[]::text[]`), // All channels used
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  // Unique constraints per company to prevent duplicate customers
  phoneIdx: uniqueIndex("customers_company_phone_idx").on(table.companyId, table.phone),
  emailIdx: uniqueIndex("customers_company_email_idx").on(table.companyId, table.email).where(sql`${table.email} IS NOT NULL`),
  cpfIdx: uniqueIndex("customers_company_cpf_idx").on(table.companyId, table.cpf).where(sql`${table.cpf} IS NOT NULL`),
  cnpjIdx: uniqueIndex("customers_company_cnpj_idx").on(table.companyId, table.cnpj).where(sql`${table.cnpj} IS NOT NULL`),
}));

export const insertCustomerSchema = createInsertSchema(customers).omit({ id: true, createdAt: true, updatedAt: true, totalOrders: true, totalSpent: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customers.$inferSelect;

// Conversations table (chat sessions)
export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  customerId: varchar("customer_id").references(() => customers.id, { onDelete: 'set null' }), // link to identified customer
  channel: text("channel").notNull(), // "chatweb", "whatsapp", "instagram"
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  status: text("status").notNull().default("active"), // active, closed
  mode: text("mode").notNull().default("ai"), // ai, human, hybrid
  takenOverBy: varchar("taken_over_by").references(() => users.id, { onDelete: 'set null' }), // user who took over
  takenOverAt: timestamp("taken_over_at"), // when takeover happened
  needsHumanAttention: boolean("needs_human_attention").notNull().default(false), // AI requested human help
  transferReason: text("transfer_reason"), // why AI transferred to human
  
  // Conversation Intelligence Fields
  currentIntent: text("current_intent"), // "browsing", "purchase_intent", "support", "complaint", etc.
  sentimentScore: integer("sentiment_score"), // -100 (very negative) to +100 (very positive)
  complexityScore: integer("complexity_score"), // 0-100, how difficult/confusing the conversation is
  activeAgentType: text("active_agent_type").default("seller"), // "seller", "consultant", "support", "technical"
  analysisUpdatedAt: timestamp("analysis_updated_at"), // when analysis was last run
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertConversationSchema = createInsertSchema(conversations).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Conversation = typeof conversations.$inferSelect;

// Messages table
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  role: text("role").notNull(), // "user", "assistant", "operator"
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // for product cards, buttons, etc.
  operatorId: varchar("operator_id").references(() => users.id, { onDelete: 'set null' }), // if role=operator, who sent it
  operatorName: text("operator_name"), // cached operator name for display
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMessageSchema = createInsertSchema(messages).omit({ id: true, createdAt: true });
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Message = typeof messages.$inferSelect;

// Channels configuration per company
export const channels = pgTable("channels", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").notNull().references(() => companies.id, { onDelete: 'cascade' }),
  chatweb: boolean("chatweb").notNull().default(true), // always enabled
  whatsapp: boolean("whatsapp").notNull().default(false), // mock
  instagram: boolean("instagram").notNull().default(false), // mock
  chatwebUrl: text("chatweb_url"), // generated URL
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertChannelSchema = createInsertSchema(channels).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Channel = typeof channels.$inferSelect;

// API Logs table (for admin monitoring)
export const apiLogs = pgTable("api_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  companyId: varchar("company_id").references(() => companies.id, { onDelete: 'cascade' }),
  type: text("type").notNull(), // "openai_prompt", "api_request", "order_created", etc.
  endpoint: text("endpoint"), // API endpoint called
  method: text("method"), // GET, POST, etc.
  requestData: jsonb("request_data"), // Request payload
  responseData: jsonb("response_data"), // Response data
  metadata: jsonb("metadata"), // Additional context (user agent, IP, etc.)
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertApiLogSchema = createInsertSchema(apiLogs).omit({ id: true, createdAt: true });
export type InsertApiLog = z.infer<typeof insertApiLogSchema>;
export type ApiLog = typeof apiLogs.$inferSelect;
