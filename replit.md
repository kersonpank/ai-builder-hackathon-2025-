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

## Recent Changes

**October 25, 2025 - Multiple Product Images Feature**
- **Multiple product images**: Products now support up to 3 images instead of single image
  - Database: Updated products.imageUrls to text[] array field
  - Backend: New `/api/products/:id/images` endpoint for multi-image upload
  - Image processing: Automatic resize to 800x800px using Sharp library
  - Storage: Images saved to object storage public directory
  - Frontend: Updated product form with multi-image upload UI and previews
  - Display: Grid preview of selected/uploaded images with file count validation
- **AI agent enhanced with product images**:
  - Prompt updated to use short, humanized text (2-3 sentences max)
  - Products mentioned using bracket syntax [Product Name] for reliable parsing
  - AI responses automatically include product images in message metadata
  - Detection logic extracts product names and attaches first image + hasMore flag
- **ChatWeb image display**:
  - Messages now show product images above assistant text
  - Images displayed in square aspect ratio with border
  - "Mais imagens disponíveis" indicator when product has 2-3 images
  - Message metadata structure: `{ productImages: [{name, imageUrl, hasMore}] }`

**October 25, 2025 - Login Simplification and Logo Upload**
- **Login simplified**: Removed CPF/CNPJ requirement from login page, now uses only email/password
  - Backend: Added `getUserByEmailOnly` method for global email authentication
  - Frontend: Updated login.tsx to remove CPF/CNPJ field
  - Improved UX: Users no longer need to remember their registration document
- **Logo upload implemented**: Added company logo upload to onboarding Step 1
  - Automatic image resizing to 200x200px using Sharp library
  - Storage: Logos saved to object storage public directory
  - Database persistence: Logo URL stored in companies.logoUrl field via updateCompanyLogo method
  - Frontend: Preview shown during upload, logo displayed in ChatWeb header
  - Fallback: Company name initial shown when no logo is uploaded
- **Bug fixes**: Fixed apiRequest calls in onboarding.tsx and login.tsx
- **Admin credentials**: Admin password updated to 123456789 (admin@omni.ai)

**Previous Session - CPF/CNPJ Support**
- Added support for both CPF and CNPJ in company registration
- Database: Renamed `cnpj` column to `cpfCnpj` in companies table
- Validation: Minimum length changed from 14 to 11 characters to accommodate CPF
- Testing: E2E test passed - registration flow confirmed working

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
2. **Companies** - Tenant entities with status management (active/suspended/trial), logo URL
3. **Users** - Company-specific users with role-based permissions
4. **Agents** - AI agent configurations per company (tone, instructions, status)
5. **Products** - Company product catalogs with pricing, metadata, and image URLs array (max 3)
6. **Orders** - Customer orders with status tracking
7. **Conversations** - Chat sessions with channel attribution
8. **Messages** - Individual chat messages with role tracking (user/assistant) and metadata for product images
9. **Channels** - Communication channel configurations

**Database Technology:**
- PostgreSQL via Neon serverless driver
- WebSocket support for real-time connections
- Connection pooling for performance

**Data Integrity:**
- Foreign key constraints with cascade deletes
- UUID primary keys for distributed systems
- Timestamp tracking for audit trails
- Unique constraints on business identifiers (CPF/CNPJ, email within company)
- Companies table uses cpfCnpj field accepting both CPF (11+ chars) and CNPJ (14+ chars)

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

**Media Processing:**
- Sharp library for server-side image resizing and optimization
- Multer for handling multipart/form-data file uploads
- Object storage integration for persistent image storage

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