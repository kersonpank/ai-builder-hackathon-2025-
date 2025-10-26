# Omni.AI - Multi-Tenant AI Customer Service Platform

## Overview

Omni.AI is a B2B SaaS platform offering AI-powered customer service agents for businesses. It enables companies to deploy intelligent chatbots for product inquiries, order processing, and post-sales support through a conversational interface. The platform features a multi-tenant architecture with distinct admin and company user portals.

**Key Capabilities:**
- Multi-tenant SaaS for managing multiple companies.
- Customizable AI conversational agents.
- Product catalog management and recommendations.
- Order processing and tracking.
- Public-facing chat widget.
- Admin and company dashboards.
- E-commerce catalog with shopping cart functionality.
- Bulk product import with AI-powered data extraction.
- Advanced agent configuration for personality and behavior.

## Recent Changes

**October 26, 2025 - Structured Conversation Flow Design**
- Implemented comprehensive conversation design with 10 clearly defined stages preventing agent repetition issues
- Stage 1: Initial Greeting (only first message) → Stage 2: Needs Discovery → Stage 3: Product Presentation → Stage 4: Decision & Cart → Stage 5: Order Review → Stage 6: Customer Type → Stage 7: Customer Data → Stage 8: Delivery Address → Stage 9: Payment → Stage 10: Confirmation
- Added explicit context-awareness rules: agent must check conversation history before responding
- Critical rule: "NEVER repeat greeting if there are previous messages" to prevent reset behavior
- Flexible stage progression: agent can skip stages if customer provides information proactively
- Clear stage identification logic based on conversation context and history
- Natural conversation flow while maintaining structured sales funnel progression
- Improved customer experience with consistent, contextual responses throughout purchase journey

**October 26, 2025 - Automatic Address Lookup via CEP**
- Integrated ViaCEP API for automatic Brazilian address lookup by postal code (CEP)
- AI agent can now automatically fetch addresses during checkout: asks for CEP → calls API → confirms data → requests number/complement
- Robust error handling: 8-digit CEP validation, 5-second timeout, structured failure responses
- Graceful fallback: agent requests manual address input when CEP lookup fails (invalid CEP, API unavailable, network error)
- Enhanced agent prompt with success/failure examples and clear fallback strategy
- All error paths return structured { success: false, error } preventing conversation flow interruption
- ViaCEP integration requires no authentication and is free for high-volume usage

**October 26, 2025 - Conversation Intelligence & Specialist Agent Routing**
- Implemented real-time conversation analysis using OpenAI with JSON mode for reliability
- Each message triggers AI analysis detecting: intent (browsing/purchase_intent/support/complaint/technical), sentiment (-100 to +100), and complexity (0-100)
- Analysis results stored in conversations table: currentIntent, sentimentScore, complexityScore, activeAgentType, analysisUpdatedAt
- Created 4 specialist agent profiles with distinct prompts: Seller (conversion-focused), Consultant (educational), Support (problem-solving), Technical (complex questions)
- Automatic agent routing: AI selects appropriate specialist based on conversation context
- Specialist prompts inject into system message, adapting agent behavior dynamically
- Built analytics endpoint (/api/conversations/analytics) providing aggregated insights: sentiment distribution, intent breakdown, complexity metrics, agent usage
- Created Analytics dashboard page with visualizations: sentiment bars, complexity distribution, intent counts, agent type distribution
- System provides context-aware warnings in prompts (e.g., "customer frustrated" when sentiment < -40)
- Added Analytics menu item to sidebar with BarChart3 icon

**October 26, 2025 - Critical Multi-Tenancy Email Fix**
- **BREAKING CHANGE:** User emails are now globally unique across all companies (previously allowed duplicate emails across different companies)
- Added UNIQUE constraint on users.email column to prevent cross-tenant login issues
- Login flow now correctly identifies users by email and automatically loads their associated company
- This prevents users from logging into wrong companies when the same email existed in multiple tenants

**October 26, 2025 - Human Takeover & Customer Identification**
- Implemented human takeover system allowing operators to assume control of AI conversations
- Added conversation modes (ai/human/hybrid) with takenOverBy and takenOverAt tracking
- Created conversations-monitor page for operators to view active conversations in real-time
- Operators can click "Assumir Conversa" to take over and respond directly to customers
- Backend skips OpenAI calls when conversation.mode !== 'ai'
- Added customerId field to conversations table to link chats to identified customers
- When agent creates order, conversation is automatically linked to customer record
- Conversations now display actual customer names instead of "Cliente Anônimo"
- Customer data persisted even for non-purchasing users to build conversation history
- Operator messages display with distinct avatar (headphones icon) and background color

**October 26, 2025 - Omnichannel Customer Identity & B2B Support**
- Implemented omnichannel customer identification system using phone, email, CPF, and CNPJ
- Added phone normalization utility handling Brazilian formats (carrier codes, international prefixes)
- Created CPF/CNPJ validation utility with check-digit algorithms
- Enhanced customer schema with B2B fields: customerType, companyName, tradeName, stateRegistration
- Added channel tracking: firstSeenChannel, channels array for cross-platform customer recognition
- Updated AI agent to collect CPF (individuals) or CNPJ + company details (businesses)
- Implemented customer deduplication via findCustomerByIdentifiers across all identifiers
- Updated customers page UI to display B2C/B2B indicators and formatted documents
- Phone numbers normalized to prevent duplicates across input formats

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:** React 18, TypeScript, Vite, Wouter (routing), TanStack Query (server state).

**UI Component System:** shadcn/ui (built on Radix UI), Tailwind CSS (styling), Material Design 3 principles, custom fonts (Inter, Manrope, JetBrains Mono). Responsive design with mobile-first breakpoints.

**State Management:** React Query for server state, React Hook Form with Zod for form validation, local storage for authentication tokens.

**Key Design Decisions:** Component-driven architecture, path aliases, progressive disclosure for complex interfaces, responsive layouts using Tailwind grid.

### Backend Architecture

**Runtime & Framework:** Node.js, Express.js, TypeScript with ESM, esbuild for bundling.

**Authentication & Authorization:** JWT-based (HTTP-only cookies), bcrypt for password hashing, Role-Based Access Control (Admin, Company users), middleware for route protection.

**API Architecture:** RESTful API, Zod schemas for validation, shared schemas between client/server, separation of concerns.

**Data Storage Strategy:** Drizzle ORM (type-safe), schema-first approach, storage abstraction layer, Drizzle Kit for migrations.

**Key Design Decisions:** Monorepo structure, fail-fast for environment variables, request logging, separate admin/user authentication.

### Database Schema

**Multi-Tenancy Model:** `Companies` table as primary tenant identifier, all tenant-specific data includes `companyId` foreign key with cascade delete.

**Core Entities:**
- **Admin Users:** Global access.
- **Companies:** Tenant entities with status, logo URL, and `cpfCnpj` field (accommodates both CPF and CNPJ).
- **Users:** Company-specific with roles. **IMPORTANT:** Email is globally unique across all companies to prevent cross-tenant authentication issues.
- **Customers:** Omnichannel customer records with unique identification via `phone` (normalized), `email`, `cpf`, or `cnpj`. Fields include: `customerType` (individual/business), `companyName`, `tradeName`, `stateRegistration`, `firstSeenChannel`, and `channels` array for cross-platform tracking.
- **Agents:** AI agent configurations (tone, instructions, personality presets, context documents).
- **Products:** Company catalogs with pricing, metadata, array of up to 3 image URLs, and `status` (draft/published).
- **Orders:** Customer orders with status and `confirmationCode`.
- **Conversations:** Chat sessions with conversation intelligence fields: `currentIntent`, `sentimentScore`, `complexityScore`, `activeAgentType`, `analysisUpdatedAt` for real-time analysis and specialist routing.
- **Messages:** Individual chat messages with role and metadata (e.g., product images, attached images).
- **Channels:** Communication channel configurations.

**Database Technology:** PostgreSQL via Neon serverless driver, WebSocket support, connection pooling.

**Data Integrity:** Foreign key constraints, UUID primary keys, timestamp tracking, unique constraints.

## External Dependencies

**AI Services:**
- OpenAI API (GPT models) for conversational AI, natural language understanding, response generation, product description generation, AI-powered data extraction for bulk imports, and real-time conversation intelligence analysis (intent detection, sentiment analysis, complexity scoring).
- OpenAI JSON mode (response_format: json_object) ensures reliable structured responses for conversation analysis.
- OpenAI Whisper API for voice transcription.

**Database:**
- Neon PostgreSQL serverless database.
- Drizzle ORM for database interactions.

**Authentication:**
- jsonwebtoken for JWT.
- bcryptjs for password hashing.

**Media Processing:**
- Sharp library for server-side image resizing and optimization.
- Multer for multipart/form-data file uploads.
- Google Cloud Storage for object storage.

**UI Dependencies:**
- Radix UI component primitives.
- Tailwind CSS.
- class-variance-authority.
- date-fns.
- Lucide React for icons.

**Key Integration Points:**
- Environment variables: `SESSION_SECRET`, `DATABASE_URL`, `OPENAI_API_KEY`.