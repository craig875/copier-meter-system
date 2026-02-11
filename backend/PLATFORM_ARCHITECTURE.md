# Internal Operations Platform - Architecture

## Overview

This is a **unified platform** designed to manage multiple internal business processes. It's built as a modular system where each business function is a separate module that can be added, enabled, or disabled independently.

## Current Modules

1. **Meter Readings** - Capture and manage copier meter readings
2. **Fibre Orders** - Track and manage customer fibre orders

## Architecture Principles

### 1. Modular Design
- Each module is self-contained with its own:
  - Database models (in `prisma/schema.prisma`)
  - Repositories (`src/repositories/`)
  - Services (`src/services/`)
  - Controllers (`src/controllers/`)
  - Routes (`src/routes/`)
  - Validation schemas (`src/schemas/`)

### 2. Shared Infrastructure
- **Authentication** - Single sign-on for all modules
- **User Management** - Centralized user system
- **Dashboard** - Unified landing page
- **Error Handling** - Consistent error responses
- **Database** - Single PostgreSQL database (with separate tables per module)

### 3. Module Registry
Modules are registered in `src/config/modules.js`. This makes it easy to:
- Add new modules
- Control access permissions
- Enable/disable modules
- Group modules by category

## Adding a New Module

### Step 1: Define Module in Registry
Add to `src/config/modules.js`:
```javascript
{
  id: 'new-module',
  name: 'New Module',
  description: 'Description of what this module does',
  route: '/new-module',
  icon: '🔧',
  enabled: true,
  permissions: 'all', // or 'admin', 'user', or custom function
  apiRoutes: ['/api/new-module'],
  category: 'Operations',
}
```

### Step 2: Create Database Models
Add models to `prisma/schema.prisma`:
```prisma
model NewModuleEntity {
  id        String   @id @default(uuid())
  // ... your fields
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  @@map("new_module_entities")
}
```

### Step 3: Create Repository
Create `src/repositories/new-module.repository.js`:
```javascript
import { BaseRepository } from './base.repository.js';

export class NewModuleRepository extends BaseRepository {
  constructor(prisma) {
    super('newModuleEntity', prisma);
  }
  // Add custom methods
}
```

### Step 4: Create Service
Create `src/services/new-module.service.js`:
```javascript
import { repositories } from '../repositories/index.js';

export class NewModuleService {
  constructor(repos = repositories) {
    this.repo = repos.newModule;
  }
  // Add business logic
}
```

### Step 5: Create Controller
Create `src/controllers/new-module.controller.js`:
```javascript
import { services } from '../services/index.js';
import { asyncHandler } from '../middleware/errorHandler.js';

export class NewModuleController {
  constructor(service = services.newModule) {
    this.service = service;
  }
  // Add HTTP handlers
}
```

### Step 6: Create Routes
Create `src/routes/new-module.routes.js`:
```javascript
import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
// Import controllers and schemas

const router = Router();
router.use(authenticate);
// Define routes
export default router;
```

### Step 7: Create Validation Schema
Create `src/schemas/new-module.schema.js`:
```javascript
import { z } from 'zod';

export const createSchema = z.object({
  // Define validation rules
});
```

### Step 8: Register in Index Files
- Add repository to `src/repositories/index.js`
- Add service to `src/services/index.js`
- Add route to `src/routes/index.js`

### Step 9: Run Migration
```bash
npm run db:push
# or
npm run db:migrate
```

## Module Structure Example

```
src/
├── repositories/
│   ├── new-module.repository.js    # Data access
├── services/
│   ├── new-module.service.js       # Business logic
├── controllers/
│   ├── new-module.controller.js    # HTTP handlers
├── routes/
│   ├── new-module.routes.js        # API routes
└── schemas/
    └── new-module.schema.js        # Validation
```

## Best Practices

1. **Separation of Concerns**
   - Each module should be independent
   - Don't create dependencies between modules
   - Use shared utilities for common functionality

2. **Naming Conventions**
   - Module IDs: kebab-case (`new-module`)
   - Files: kebab-case (`new-module.service.js`)
   - Classes: PascalCase (`NewModuleService`)
   - Database tables: snake_case (`new_module_entities`)

3. **Permissions**
   - Use `'all'` for modules accessible to everyone
   - Use `'admin'` for admin-only modules
   - Use `'user'` for regular user modules
   - Use custom functions for complex permission logic

4. **Database**
   - Keep module tables separate
   - Use clear naming (prefix with module name if needed)
   - Add indexes for performance

5. **API Routes**
   - Use consistent prefixes: `/api/{module-name}`
   - Follow RESTful conventions
   - Document endpoints

## Future Enhancements

- Module-level permissions (per-user, per-role)
- Module configuration system
- Module dependencies
- Module versioning
- Module marketplace/plugins

## Benefits of This Architecture

1. **Scalability** - Easy to add new modules without affecting existing ones
2. **Maintainability** - Clear separation makes code easier to understand
3. **Flexibility** - Modules can be enabled/disabled independently
4. **Reusability** - Shared infrastructure reduces duplication
5. **Testability** - Each module can be tested independently
