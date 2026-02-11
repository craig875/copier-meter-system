# Copier Meter Reading Capture System

A web-based system for capturing monthly copier meter readings, used for contract billing purposes.

## Features

- **Monthly Meter Reading Capture**: Enter readings for mono, colour, and scan meters
- **Validation**: Prevents meter rollback (current reading < previous)
- **Over-Volume Alerts**: Flags machines exceeding monthly volume limits
- **Role-Based Access**: Admin and user roles with appropriate permissions
- **Excel Export**: Export monthly readings to spreadsheet format
- **Machine Configuration**: Admin interface to configure machines and enabled meters

## Tech Stack

- **Frontend**: React 18, Vite, TailwindCSS, React Query
- **Backend**: Node.js, Express, Prisma ORM
- **Database**: PostgreSQL
- **Authentication**: JWT with bcrypt password hashing

## Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm or yarn

## Getting Started

### 1. Clone and Install Dependencies

```bash
cd copier-meter-system

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Database Setup

Create a PostgreSQL database:

```sql
CREATE DATABASE copier_meter_db;
```

Update the `.env` file in the backend folder with your database credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/copier_meter_db?schema=public"
JWT_SECRET="your-secure-secret-key"
```

### 3. Run Database Migrations

```bash
cd backend
npx prisma migrate dev --name init
```

### 4. Seed Sample Data

```bash
npm run db:seed
```

This creates:
- Admin user: `admin@example.com` / `admin123`
- Regular user: `user@example.com` / `user123`
- 10 sample copier machines with various configurations
- Last month's readings for testing

### 5. Start the Application

In two separate terminals:

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Usage

### For Users

1. Log in with your credentials
2. Navigate to **Monthly Capture** to enter meter readings
3. Only applicable meter types are shown per machine
4. Save readings - validation prevents lower values than previous month
5. View history and export to Excel from the **History** page

### For Administrators

Additional features available:
- **Machines**: Add, edit, configure machines and their enabled meters
- **Users**: Manage system users and roles

## API Endpoints

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/auth/login` | POST | No | User login |
| `/api/auth/me` | GET | Yes | Get current user |
| `/api/machines` | GET | Yes | List machines |
| `/api/machines` | POST | Admin | Create machine |
| `/api/machines/:id` | PUT | Admin | Update machine |
| `/api/readings` | GET | Yes | Get readings by month |
| `/api/readings` | POST | Yes | Submit readings |
| `/api/readings/export` | GET | Yes | Export to Excel |
| `/api/users` | GET | Admin | List users |
| `/api/users` | POST | Admin | Create user |

## Project Structure

```
copier-meter-system/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma    # Database schema
│   │   └── seed.js          # Sample data
│   └── src/
│       ├── config/          # Configuration
│       ├── controllers/     # Route handlers
│       ├── middleware/      # Auth, validation
│       ├── routes/          # API routes
│       ├── schemas/         # Zod validation
│       ├── services/        # Business logic
│       └── app.js           # Express app
├── frontend/
│   └── src/
│       ├── components/      # Reusable components
│       ├── context/         # React context
│       ├── pages/           # Page components
│       ├── services/        # API client
│       └── App.jsx          # Main app
└── README.md
```

## Validation Rules

1. **Meter Rollback Prevention**: Current reading must be >= previous month's reading
2. **Meter Type Enforcement**: Only enabled meter types accept input per machine
3. **Over-Volume Detection**: Flags when monthly usage exceeds configured maximum

## License

MIT
