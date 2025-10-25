import { db } from './db';
import { adminUsers, companies, users, agents, products, orders, conversations, messages, channels } from '@shared/schema';
import { hashPassword } from './auth';
import { sql } from 'drizzle-orm';

async function seed() {
  console.log('🌱 Seeding database...');

  try {
    // Create admin user
    console.log('Creating admin user...');
    const adminPassword = await hashPassword('123456789');
    await db.insert(adminUsers).values({
      email: 'admin@omni.ai',
      password: adminPassword,
      name: 'Administrador',
    }).onConflictDoNothing();

    // Create demo company 1
    console.log('Creating demo companies...');
    const [demoCompany1] = await db.insert(companies).values({
      name: 'Boutique Moda Bella',
      segment: 'Moda e Vestuário',
      cpfCnpj: '12.345.678/0001-90',
      status: 'active',
    }).returning().onConflictDoNothing();

    if (!demoCompany1) {
      console.log('Demo company already exists, skipping seed');
      return;
    }

    // Create user for company 1
    const userPassword = await hashPassword('demo123');
    const [demoUser1] = await db.insert(users).values({
      companyId: demoCompany1.id,
      email: 'maria@modabella.com',
      password: userPassword,
      name: 'Maria Silva',
      role: 'owner',
    }).returning();

    // Create agent for company 1
    await db.insert(agents).values({
      companyId: demoCompany1.id,
      name: 'Bella',
      toneOfVoice: 'Empático',
      customInstructions: 'Sempre mencionar que temos frete grátis acima de R$ 150. Destacar a qualidade premium dos produtos.',
      isActive: true,
    });

    // Create products for company 1
    console.log('Creating demo products...');
    const demoProducts = await db.insert(products).values([
      {
        companyId: demoCompany1.id,
        name: 'Vestido Longo Floral',
        description: 'Vestido longo elegante com estampa floral delicada. Tecido leve e confortável, perfeito para ocasiões especiais ou uso casual. Disponível em diversos tamanhos.',
        price: 18900, // R$ 189.00
        category: 'Vestidos',
        stock: 15,
        isActive: true,
      },
      {
        companyId: demoCompany1.id,
        name: 'Calça Jeans Premium',
        description: 'Calça jeans de corte moderno com acabamento premium. Tecido de alta qualidade que mantém a forma. Design atemporal que combina com qualquer estilo.',
        price: 22900, // R$ 229.00
        category: 'Calças',
        stock: 20,
        isActive: true,
      },
      {
        companyId: demoCompany1.id,
        name: 'Blusa de Seda Bordada',
        description: 'Blusa sofisticada em seda natural com delicados bordados à mão. Peça exclusiva que adiciona elegância a qualquer look. Cuidados especiais recomendados.',
        price: 15900, // R$ 159.00
        category: 'Blusas',
        stock: 8,
        isActive: true,
      },
      {
        companyId: demoCompany1.id,
        name: 'Saia Midi Plissada',
        description: 'Saia midi plissada versátil e elegante. Cintura alta e movimento fluido. Combina perfeitamente com blusas e sapatilhas para um visual refinado.',
        price: 12900, // R$ 129.00
        category: 'Saias',
        stock: 12,
        isActive: true,
      },
      {
        companyId: demoCompany1.id,
        name: 'Casaco de Lã Oversized',
        description: 'Casaco oversized em lã mista, perfeito para dias frios. Design moderno e confortável. Cores neutras que combinam com tudo.',
        price: 34900, // R$ 349.00
        category: 'Casacos',
        stock: 6,
        isActive: true,
      },
      {
        companyId: demoCompany1.id,
        name: 'Conjunto Linho Natural',
        description: 'Conjunto completo em linho 100% natural. Inclui calça e blusa coordenadas. Ideal para clima quente, respirável e sustentável.',
        price: 27900, // R$ 279.00
        category: 'Conjuntos',
        stock: 10,
        isActive: true,
      },
      {
        companyId: demoCompany1.id,
        name: 'Body Renda Luxo',
        description: 'Body em renda francesa de alta qualidade. Design sofisticado e sensual. Perfeito para ocasiões especiais ou para usar sob blazers.',
        price: 9900, // R$ 99.00
        category: 'Bodies',
        stock: 18,
        isActive: true,
      },
    ]).returning();

    // Create channel config
    await db.insert(channels).values({
      companyId: demoCompany1.id,
      chatweb: true,
      whatsapp: false,
      instagram: false,
      chatwebUrl: `http://localhost:5000/chat/${demoCompany1.id}`,
    });

    // Create demo conversation and messages
    console.log('Creating demo conversation...');
    const [demoConv] = await db.insert(conversations).values({
      companyId: demoCompany1.id,
      channel: 'chatweb',
      customerName: 'Ana Costa',
      customerPhone: '(11) 98765-4321',
      status: 'active',
    }).returning();

    await db.insert(messages).values([
      {
        conversationId: demoConv.id,
        role: 'user',
        content: 'Olá! Estou procurando um vestido para um casamento.',
        metadata: null,
      },
      {
        conversationId: demoConv.id,
        role: 'assistant',
        content: 'Olá Ana! Que maravilha! Temos opções lindas para casamento. O nosso Vestido Longo Floral é perfeito para ocasiões especiais - é elegante, confortável e está por R$ 189,00. Gostaria de saber mais sobre ele?',
        metadata: null,
      },
      {
        conversationId: demoConv.id,
        role: 'user',
        content: 'Parece interessante! Tem em que cores?',
        metadata: null,
      },
      {
        conversationId: demoConv.id,
        role: 'assistant',
        content: 'O vestido está disponível em tons de azul claro e rosa suave, ambos com estampas florais delicadas. E uma ótima notícia: acima de R$ 150 o frete é grátis! Quer que eu reserve um para você?',
        metadata: null,
      },
    ]);

    // Create demo orders
    console.log('Creating demo orders...');
    await db.insert(orders).values([
      {
        companyId: demoCompany1.id,
        conversationId: demoConv.id,
        customerName: 'Ana Costa',
        customerEmail: 'ana.costa@email.com',
        customerPhone: '(11) 98765-4321',
        status: 'delivered',
        total: 18900,
        paymentMethod: 'pix',
        items: [
          { productId: demoProducts[0].id, name: 'Vestido Longo Floral', price: 18900, quantity: 1 }
        ],
        shippingAddress: {
          street: 'Rua das Flores, 123',
          city: 'São Paulo',
          state: 'SP',
          zip: '01234-567',
        },
      },
      {
        companyId: demoCompany1.id,
        conversationId: null,
        customerName: 'Julia Santos',
        customerEmail: 'julia@email.com',
        customerPhone: '(11) 91234-5678',
        status: 'preparing',
        total: 38800,
        paymentMethod: 'card',
        items: [
          { productId: demoProducts[1].id, name: 'Calça Jeans Premium', price: 22900, quantity: 1 },
          { productId: demoProducts[2].id, name: 'Blusa de Seda Bordada', price: 15900, quantity: 1 }
        ],
        shippingAddress: {
          street: 'Av. Paulista, 1000',
          city: 'São Paulo',
          state: 'SP',
          zip: '01310-100',
        },
      },
      {
        companyId: demoCompany1.id,
        conversationId: null,
        customerName: 'Beatriz Lima',
        customerEmail: 'bia@email.com',
        customerPhone: '(21) 99876-5432',
        status: 'confirmed',
        total: 27900,
        paymentMethod: 'pix',
        items: [
          { productId: demoProducts[5].id, name: 'Conjunto Linho Natural', price: 27900, quantity: 1 }
        ],
        shippingAddress: {
          street: 'Rua Copacabana, 456',
          city: 'Rio de Janeiro',
          state: 'RJ',
          zip: '22070-001',
        },
      },
    ]);

    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Demo Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('👤 Admin Login:');
    console.log('   Email: admin@omni.ai');
    console.log('   Password: admin123');
    console.log('\n🏢 Demo Company Login:');
    console.log('   CPF/CNPJ: 12.345.678/0001-90');
    console.log('   Email: maria@modabella.com');
    console.log('   Password: demo123');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  }
}

seed().then(() => {
  console.log('Done!');
  process.exit(0);
}).catch((error) => {
  console.error(error);
  process.exit(1);
});
