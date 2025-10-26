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
- **Users:** Company-specific with roles.
- **Customers:** Omnichannel customer records with unique identification via `phone` (normalized), `email`, `cpf`, or `cnpj`. Fields include: `customerType` (individual/business), `companyName`, `tradeName`, `stateRegistration`, `firstSeenChannel`, and `channels` array for cross-platform tracking.
- **Agents:** AI agent configurations (tone, instructions, personality presets, context documents).
- **Products:** Company catalogs with pricing, metadata, array of up to 3 image URLs, and `status` (draft/published).
- **Orders:** Customer orders with status and `confirmationCode`.
- **Conversations:** Chat sessions.
- **Messages:** Individual chat messages with role and metadata (e.g., product images, attached images).
- **Channels:** Communication channel configurations.

**Database Technology:** PostgreSQL via Neon serverless driver, WebSocket support, connection pooling.

**Data Integrity:** Foreign key constraints, UUID primary keys, timestamp tracking, unique constraints.

## External Dependencies

**AI Services:**
- OpenAI API (GPT models) for conversational AI, natural language understanding, response generation, product description generation, and AI-powered data extraction for bulk imports.
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