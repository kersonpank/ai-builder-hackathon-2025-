# Omni.AI - Multi-Tenant AI Customer Service Platform

## Overview

Omni.AI is a B2B SaaS platform that provides AI-powered customer service agents for businesses. The platform enables companies to create intelligent chatbots that handle product inquiries, process orders, and provide post-sales support through a conversational interface. It features a multi-tenant architecture with separate admin and company user portals.

**Key Features:**
- Multi-tenant SaaS platform for managing multiple companies
- AI-powered conversational agents with customizable personalities
- Product catalog management and recommendations
- Order processing and tracking
- Public-facing chat widget for end customers
- Admin dashboard for platform operators
- Company dashboard for business owners

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System:**
- React 18 with TypeScript for type safety
- Vite as the build tool and development server
- Wouter for lightweight client-side routing
- TanStack Query (React Query) for server state management and caching

**UI Component System:**
- shadcn/ui components built on Radix UI primitives
- Tailwind CSS for styling with custom design tokens
- Material Design 3 principles optimized for B2B data-dense interfaces
- Custom fonts: Inter (UI), Manrope (headings), JetBrains Mono (code)
- Responsive design with mobile-first breakpoints

**State Management:**
- React Query for server state (API responses, caching, mutations)
- React Hook Form with Zod for form validation
- Local storage for authentication tokens

**Key Design Decisions:**
- Component-driven architecture with reusable UI primitives
- Path aliases (@/, @shared/) for clean imports
- Progressive disclosure pattern for complex interfaces
- Responsive layouts using Tailwind grid system

### Backend Architecture

**Runtime & Framework:**
- Node.js with Express.js for the API server
- TypeScript with ESM modules for type safety and modern syntax
- esbuild for production bundling

**Authentication & Authorization:**
- JWT-based authentication stored in HTTP-only cookies
- bcrypt for password hashing
- Role-based access control with two user types:
  - Admin users (platform operators)
  - Company users (business owners/members)
- Middleware functions for route protection (requireAuth, requireAdminAuth, optionalAuth)

**API Architecture:**
- RESTful API design with resource-based endpoints
- Zod schemas for request/response validation
- Shared schema definitions between client and server
- Separation of concerns: routes, storage layer, authentication

**Data Storage Strategy:**
- Drizzle ORM for type-safe database operations
- Schema-first approach with TypeScript types generated from database schema
- Storage abstraction layer (storage.ts) separating business logic from database queries
- Database migrations managed through Drizzle Kit

**Key Design Decisions:**
- Monorepo structure with shared types between client/server
- Fail-fast approach for missing environment variables
- Request logging middleware for API debugging
- Separation of admin and user authentication flows

### Database Schema

**Multi-Tenancy Model:**
- Companies table as the primary tenant identifier
- All tenant-specific data includes companyId foreign key
- Cascade delete ensures data integrity when companies are removed

**Core Entities:**

1. **Admin Users** - Platform operators with global access
2. **Companies** - Tenant entities with status management (active/suspended/trial)
3. **Users** - Company-specific users with role-based permissions
4. **Agents** - AI agent configurations per company (tone, instructions, status)
5. **Products** - Company product catalogs with pricing and metadata
6. **Orders** - Customer orders with status tracking
7. **Conversations** - Chat sessions with channel attribution
8. **Messages** - Individual chat messages with role tracking (user/assistant)
9. **Channels** - Communication channel configurations

**Database Technology:**
- PostgreSQL via Neon serverless driver
- WebSocket support for real-time connections
- Connection pooling for performance

**Data Integrity:**
- Foreign key constraints with cascade deletes
- UUID primary keys for distributed systems
- Timestamp tracking for audit trails
- Unique constraints on business identifiers (CNPJ, email within company)

### External Dependencies

**AI Services:**
- OpenAI API for conversational AI capabilities
- GPT models for natural language understanding and response generation
- Product description generation feature

**Database:**
- Neon PostgreSQL serverless database
- WebSocket support for connection handling
- Drizzle ORM for database interactions

**Authentication:**
- jsonwebtoken for JWT token generation/verification
- bcryptjs for password hashing
- 7-day token expiration policy

**Development Tools:**
- Replit-specific plugins:
  - Runtime error overlay
  - Cartographer for code mapping
  - Dev banner for development mode
- TypeScript for static type checking
- tsx for TypeScript execution in development

**UI Dependencies:**
- Radix UI component primitives (30+ components)
- Tailwind CSS with PostCSS for styling
- class-variance-authority for component variants
- date-fns with Portuguese locale for date formatting
- Lucide React for icon library

**Key Integration Points:**
- SESSION_SECRET environment variable required for JWT operations
- DATABASE_URL required for database connectivity
- OPENAI_API_KEY for AI functionality
- All critical variables validated at startup with fail-fast error handling

**Deployment Considerations:**
- Vite handles frontend bundling to dist/public
- esbuild bundles backend to dist/index.js
- Separate development and production build processes
- Environment-specific configurations for Replit integration