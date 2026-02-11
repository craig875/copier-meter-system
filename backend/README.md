# Internal Operations Platform - Backend

A unified platform for managing multiple internal business processes. Currently includes:
- **Meter Readings** - Capture and manage copier meter readings
- **Fibre Orders** - Track and manage customer fibre orders

The platform is designed to be modular, making it easy to add new business process modules in the future.

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- PostgreSQL database
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env` file in the root directory with:
```
DATABASE_URL="postgresql://user:password@localhost:5432/copier_meter_db"
PORT=3001
JWT_SECRET="your-secret-key"
NODE_ENV=development
FRONTEND_URL="http://localhost:5173"
```

3. Set up the database:
```bash
# Run migrations
npm run db:migrate

# (Optional) Seed the database
npm run db:seed
```

### Running the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3001` (or the port specified in your `.env` file).

### Available Scripts

- `npm run dev` - Start development server with nodemon (auto-reload)
- `npm start` - Start production server
- `npm run db:migrate` - Run database migrations
- `npm run db:push` - Push schema changes to database
- `npm run db:seed` - Seed the database with sample data
- `npm run db:studio` - Open Prisma Studio (database GUI)

### API Endpoints

**Platform:**
- `GET /` - API information
- `GET /api/health` - Health check
- `GET /api/dashboard` - Main dashboard (after login)

**Authentication:**
- `POST /api/auth/login` - User login

**Meter Readings Module:**
- `GET /api/machines` - Get all machines
- `POST /api/machines` - Create machine (admin only)
- `GET /api/readings` - Get meter readings
- `POST /api/readings` - Submit meter readings

**Fibre Orders Module:**
- `GET /api/fibre-products` - Get fibre products
- `POST /api/fibre-products` - Create product (admin only)
- `GET /api/fibre-orders` - Get fibre orders
- `POST /api/fibre-orders` - Create order (admin only)

### Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.
