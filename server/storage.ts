import { db } from './db';
import { 
  adminUsers, companies, users, agents, products, orders, conversations, messages, channels,
  type InsertAdminUser, type AdminUser,
  type InsertCompany, type Company,
  type InsertUser, type User,
  type InsertAgent, type Agent,
  type InsertProduct, type Product,
  type InsertOrder, type Order,
  type InsertConversation, type Conversation,
  type InsertMessage, type Message,
  type InsertChannel, type Channel,
} from '@shared/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export interface IStorage {
  // Admin Users
  getAdminUserByEmail(email: string): Promise<AdminUser | undefined>;
  createAdminUser(data: InsertAdminUser): Promise<AdminUser>;
  
  // Companies
  getAllCompanies(): Promise<Company[]>;
  getCompany(id: string): Promise<Company | undefined>;
  getCompanyByCpfCnpj(cpfCnpj: string): Promise<Company | undefined>;
  createCompany(data: InsertCompany): Promise<Company>;
  updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined>;
  updateCompanyLogo(id: string, logoUrl: string): Promise<Company | undefined>;
  deleteCompany(id: string): Promise<void>;
  
  // Users
  getUserByEmail(email: string, companyId: string): Promise<User | undefined>;
  getUserByEmailOnly(email: string): Promise<User | undefined>;
  getUsersByCompany(companyId: string): Promise<User[]>;
  createUser(data: InsertUser): Promise<User>;
  
  // Agents
  getAgentByCompany(companyId: string): Promise<Agent | undefined>;
  createAgent(data: InsertAgent): Promise<Agent>;
  updateAgent(companyId: string, data: Partial<InsertAgent>): Promise<Agent | undefined>;
  
  // Products
  getProductsByCompany(companyId: string): Promise<Product[]>;
  getProductsByCompanyAndStatus(companyId: string, status: string): Promise<Product[]>;
  getProduct(id: string, companyId: string): Promise<Product | undefined>;
  createProduct(data: InsertProduct): Promise<Product>;
  updateProduct(id: string, companyId: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string, companyId: string): Promise<void>;
  createProductsBulk(data: InsertProduct[]): Promise<Product[]>;
  updateProductStatus(id: string, companyId: string, status: string): Promise<Product | undefined>;
  
  // Orders
  getOrdersByCompany(companyId: string): Promise<Order[]>;
  getOrder(id: string, companyId: string): Promise<Order | undefined>;
  createOrder(data: InsertOrder): Promise<Order>;
  updateOrderStatus(id: string, companyId: string, status: string): Promise<Order | undefined>;
  
  // Conversations
  getConversationsByCompany(companyId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(data: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation | undefined>;
  
  // Messages
  getMessagesByConversation(conversationId: string): Promise<Message[]>;
  createMessage(data: InsertMessage): Promise<Message>;
  
  // Channels
  getChannelByCompany(companyId: string): Promise<Channel | undefined>;
  createChannel(data: InsertChannel): Promise<Channel>;
  updateChannel(companyId: string, data: Partial<InsertChannel>): Promise<Channel | undefined>;
  
  // Analytics (for dashboard)
  getCompanyStats(companyId: string): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    activeConversations: number;
  }>;
}

export class DbStorage implements IStorage {
  // Admin Users
  async getAdminUserByEmail(email: string): Promise<AdminUser | undefined> {
    const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email));
    return result[0];
  }

  async createAdminUser(data: InsertAdminUser): Promise<AdminUser> {
    const result = await db.insert(adminUsers).values(data).returning();
    return result[0];
  }

  // Companies
  async getAllCompanies(): Promise<Company[]> {
    return db.select().from(companies).orderBy(desc(companies.createdAt));
  }

  async getCompany(id: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.id, id));
    return result[0];
  }

  async getCompanyByCpfCnpj(cpfCnpj: string): Promise<Company | undefined> {
    const result = await db.select().from(companies).where(eq(companies.cpfCnpj, cpfCnpj));
    return result[0];
  }

  async createCompany(data: InsertCompany): Promise<Company> {
    const result = await db.insert(companies).values(data).returning();
    return result[0];
  }

  async updateCompany(id: string, data: Partial<InsertCompany>): Promise<Company | undefined> {
    const result = await db.update(companies).set(data).where(eq(companies.id, id)).returning();
    return result[0];
  }

  async updateCompanyLogo(id: string, logoUrl: string): Promise<Company | undefined> {
    const result = await db.update(companies).set({ logoUrl }).where(eq(companies.id, id)).returning();
    return result[0];
  }

  async deleteCompany(id: string): Promise<void> {
    await db.delete(companies).where(eq(companies.id, id));
  }

  // Users
  async getUserByEmail(email: string, companyId: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(
      and(eq(users.email, email), eq(users.companyId, companyId))
    );
    return result[0];
  }

  async getUserByEmailOnly(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async getUsersByCompany(companyId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.companyId, companyId));
  }

  async createUser(data: InsertUser): Promise<User> {
    const result = await db.insert(users).values(data).returning();
    return result[0];
  }

  // Agents
  async getAgentByCompany(companyId: string): Promise<Agent | undefined> {
    const result = await db.select().from(agents).where(eq(agents.companyId, companyId));
    return result[0];
  }

  async createAgent(data: InsertAgent): Promise<Agent> {
    const result = await db.insert(agents).values(data).returning();
    return result[0];
  }

  async updateAgent(companyId: string, data: Partial<InsertAgent>): Promise<Agent | undefined> {
    const result = await db.update(agents).set({ 
      ...data, 
      updatedAt: new Date() 
    }).where(eq(agents.companyId, companyId)).returning();
    return result[0];
  }

  // Products
  async getProductsByCompany(companyId: string): Promise<Product[]> {
    return db.select().from(products).where(eq(products.companyId, companyId)).orderBy(desc(products.createdAt));
  }

  async getProductsByCompanyAndStatus(companyId: string, status: string): Promise<Product[]> {
    return db.select().from(products).where(
      and(eq(products.companyId, companyId), eq(products.status, status))
    ).orderBy(desc(products.createdAt));
  }

  async getProduct(id: string, companyId: string): Promise<Product | undefined> {
    const result = await db.select().from(products).where(
      and(eq(products.id, id), eq(products.companyId, companyId))
    );
    return result[0];
  }

  async createProduct(data: InsertProduct): Promise<Product> {
    const result = await db.insert(products).values(data).returning();
    return result[0];
  }

  async updateProduct(id: string, companyId: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const result = await db.update(products).set({ 
      ...data, 
      updatedAt: new Date() 
    }).where(
      and(eq(products.id, id), eq(products.companyId, companyId))
    ).returning();
    return result[0];
  }

  async deleteProduct(id: string, companyId: string): Promise<void> {
    await db.delete(products).where(
      and(eq(products.id, id), eq(products.companyId, companyId))
    );
  }

  async createProductsBulk(data: InsertProduct[]): Promise<Product[]> {
    if (data.length === 0) return [];
    return db.insert(products).values(data).returning();
  }

  async updateProductStatus(id: string, companyId: string, status: string): Promise<Product | undefined> {
    const result = await db.update(products).set({ 
      status, 
      updatedAt: new Date() 
    }).where(
      and(eq(products.id, id), eq(products.companyId, companyId))
    ).returning();
    return result[0];
  }

  // Orders
  async getOrdersByCompany(companyId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.companyId, companyId)).orderBy(desc(orders.createdAt));
  }

  async getOrder(id: string, companyId: string): Promise<Order | undefined> {
    const result = await db.select().from(orders).where(
      and(eq(orders.id, id), eq(orders.companyId, companyId))
    );
    return result[0];
  }

  async createOrder(data: InsertOrder): Promise<Order> {
    const result = await db.insert(orders).values(data).returning();
    return result[0];
  }

  async updateOrderStatus(id: string, companyId: string, status: string): Promise<Order | undefined> {
    const result = await db.update(orders).set({ 
      status, 
      updatedAt: new Date() 
    }).where(
      and(eq(orders.id, id), eq(orders.companyId, companyId))
    ).returning();
    return result[0];
  }

  // Conversations
  async getConversationsByCompany(companyId: string): Promise<Conversation[]> {
    return db.select().from(conversations).where(eq(conversations.companyId, companyId)).orderBy(desc(conversations.updatedAt));
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    const result = await db.select().from(conversations).where(eq(conversations.id, id));
    return result[0];
  }

  async createConversation(data: InsertConversation): Promise<Conversation> {
    const result = await db.insert(conversations).values(data).returning();
    return result[0];
  }

  async updateConversation(id: string, data: Partial<InsertConversation>): Promise<Conversation | undefined> {
    const result = await db.update(conversations).set({ 
      ...data, 
      updatedAt: new Date() 
    }).where(eq(conversations.id, id)).returning();
    return result[0];
  }

  // Messages
  async getMessagesByConversation(conversationId: string): Promise<Message[]> {
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }

  async createMessage(data: InsertMessage): Promise<Message> {
    const result = await db.insert(messages).values(data).returning();
    return result[0];
  }

  // Channels
  async getChannelByCompany(companyId: string): Promise<Channel | undefined> {
    const result = await db.select().from(channels).where(eq(channels.companyId, companyId));
    return result[0];
  }

  async createChannel(data: InsertChannel): Promise<Channel> {
    const result = await db.insert(channels).values(data).returning();
    return result[0];
  }

  async updateChannel(companyId: string, data: Partial<InsertChannel>): Promise<Channel | undefined> {
    const result = await db.update(channels).set({ 
      ...data, 
      updatedAt: new Date() 
    }).where(eq(channels.companyId, companyId)).returning();
    return result[0];
  }

  // Analytics
  async getCompanyStats(companyId: string): Promise<{
    totalProducts: number;
    totalOrders: number;
    totalRevenue: number;
    activeConversations: number;
  }> {
    const [productCount] = await db.select({ count: sql<number>`count(*)::int` }).from(products).where(eq(products.companyId, companyId));
    const [orderCount] = await db.select({ count: sql<number>`count(*)::int` }).from(orders).where(eq(orders.companyId, companyId));
    const [revenue] = await db.select({ sum: sql<number>`coalesce(sum(${orders.total}), 0)::int` }).from(orders).where(eq(orders.companyId, companyId));
    const [convCount] = await db.select({ count: sql<number>`count(*)::int` }).from(conversations).where(
      and(eq(conversations.companyId, companyId), eq(conversations.status, 'active'))
    );

    return {
      totalProducts: productCount?.count || 0,
      totalOrders: orderCount?.count || 0,
      totalRevenue: revenue?.sum || 0,
      activeConversations: convCount?.count || 0,
    };
  }
}

export const storage = new DbStorage();
