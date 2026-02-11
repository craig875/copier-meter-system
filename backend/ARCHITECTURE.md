# Application Architecture

This document describes the modular architecture of the Systems backend, following SOLID principles and best practices.

## Architecture Overview

The application follows a **layered architecture** with clear separation of concerns:

```
┌─────────────────────────────────────┐
│         Controllers Layer            │  HTTP Request/Response handling
│  (Thin - delegates to services)     │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│          Services Layer               │  Business Logic
│  (Core application logic)            │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│        Repositories Layer             │  Data Access
│  (Database operations)               │
└──────────────┬───────────────────────┘
               │
┌──────────────▼───────────────────────┐
│         Database (Prisma)            │
└──────────────────────────────────────┘
```

## Directory Structure

```
src/
├── config/           # Configuration files
├── controllers/      # HTTP request/response handlers (thin layer)
├── middleware/       # Express middleware (auth, validation, error handling)
├── repositories/     # Data access layer (Repository Pattern)
├── routes/          # Route definitions
├── schemas/         # Validation schemas (Zod)
├── services/        # Business logic layer
├── utils/           # Utility functions and error classes
└── app.js           # Application entry point
```

## Layer Responsibilities

### 1. Controllers Layer (`src/controllers/`)
**Responsibility**: Handle HTTP requests and responses only

- Extract data from requests
- Call appropriate service methods
- Format and send responses
- Use `asyncHandler` wrapper for error handling
- **No business logic** - delegates to services

**Example**:
```javascript
export class ReadingController {
  getReadings = asyncHandler(async (req, res) => {
    const result = await this.readingService.getReadings(...);
    res.json(result);
  });
}
```

### 2. Services Layer (`src/services/`)
**Responsibility**: Business logic and orchestration

- Contains all business rules and logic
- Coordinates between repositories
- Validates business constraints
- Throws custom errors for error handling
- **No direct database access** - uses repositories

**Key Services**:
- `ReadingService` - Meter reading operations
- `MachineService` - Machine management
- `AuthService` - Authentication
- `UserService` - User management
- `ImportService` - Data import operations
- `ValidationService` - Reading validation rules

### 3. Repositories Layer (`src/repositories/`)
**Responsibility**: Data access abstraction

- Encapsulates all database operations
- Provides clean interface for data access
- Extends `BaseRepository` for common operations
- **No business logic** - pure data access

**Key Repositories**:
- `ReadingRepository` - Reading data access
- `MachineRepository` - Machine data access
- `UserRepository` - User data access
- `SubmissionRepository` - Submission data access

### 4. Utilities (`src/utils/`)
**Responsibility**: Reusable utilities and error classes

- `errors.js` - Custom error classes (AppError, ValidationError, etc.)
- `date.utils.js` - Date calculation utilities
- `reading.utils.js` - Reading calculation utilities

## SOLID Principles Applied

### Single Responsibility Principle (SRP)
- Each class has one reason to change
- Controllers handle HTTP, Services handle business logic, Repositories handle data access

### Open/Closed Principle (OCP)
- Easy to extend with new validation rules
- Base repository can be extended for new entities
- Error classes are extensible

### Liskov Substitution Principle (LSP)
- All repositories extend BaseRepository and can be substituted
- Services can be swapped with different implementations

### Interface Segregation Principle (ISP)
- Repositories provide specific methods for each entity
- Services expose only necessary methods

### Dependency Inversion Principle (DIP)
- High-level modules (services) depend on abstractions (repositories)
- Dependency injection used throughout
- Services and repositories are injected, not hard-coded

## Design Patterns Used

### 1. Repository Pattern
- Abstracts data access layer
- Makes it easy to swap data sources
- Centralizes database queries

### 2. Service Layer Pattern
- Separates business logic from controllers
- Makes business logic reusable
- Easier to test

### 3. Dependency Injection
- Services and repositories are injected
- Makes code testable and maintainable
- Centralized in `index.js` files

### 4. Error Handling Pattern
- Custom error classes
- Centralized error handler middleware
- Consistent error responses

### 5. Async Handler Pattern
- Wraps async functions to catch errors
- Eliminates try-catch boilerplate
- Automatically passes errors to error handler

## Error Handling

### Custom Error Classes
- `AppError` - Base error class
- `ValidationError` - Validation failures (400)
- `NotFoundError` - Resource not found (404)
- `ConflictError` - Resource conflicts (409)
- `UnauthorizedError` - Authentication failures (401)
- `ForbiddenError` - Authorization failures (403)

### Error Flow
1. Service throws custom error
2. Async handler catches it
3. Error handler middleware formats response
4. Consistent error format sent to client

## Benefits of This Architecture

1. **Maintainability**: Clear separation makes code easy to understand and modify
2. **Testability**: Each layer can be tested independently
3. **Scalability**: Easy to add new features without affecting existing code
4. **Reusability**: Business logic can be reused across different controllers
5. **Flexibility**: Easy to swap implementations (e.g., different database)
6. **Consistency**: Standardized patterns throughout the application

## Adding New Features

### To add a new entity:

1. **Create Repository** (`src/repositories/`)
   - Extend `BaseRepository`
   - Add entity-specific methods

2. **Create Service** (`src/services/`)
   - Implement business logic
   - Use repositories for data access
   - Throw appropriate errors

3. **Create Controller** (`src/controllers/`)
   - Handle HTTP requests/responses
   - Delegate to service
   - Use `asyncHandler` wrapper

4. **Create Routes** (`src/routes/`)
   - Define endpoints
   - Apply middleware (auth, validation)
   - Connect to controller methods

5. **Add Validation Schema** (`src/schemas/`)
   - Define Zod schema for validation

## Best Practices

1. **Controllers are thin** - Only HTTP handling
2. **Services contain business logic** - No HTTP concerns
3. **Repositories handle data access** - No business logic
4. **Use dependency injection** - Don't hard-code dependencies
5. **Throw custom errors** - Use appropriate error classes
6. **Use async handler** - Don't write try-catch in every controller
7. **Keep functions small** - Single responsibility
8. **Document complex logic** - Add comments where needed
