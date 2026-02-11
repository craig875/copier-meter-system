# Use Node.js LTS - Debian base has OpenSSL required by Prisma (Alpine causes "schema engine" errors)
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install all dependencies (needed for Prisma CLI)
RUN npm ci

# Copy Prisma schema
COPY prisma ./prisma

# Generate Prisma Client
RUN npx prisma generate

# Copy application code
COPY . .

# Expose port
EXPOSE 3001

# Start the application
CMD ["npm", "start"]
