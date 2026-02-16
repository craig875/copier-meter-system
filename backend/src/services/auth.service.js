import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { config } from '../config/index.js';
import { repositories } from '../repositories/index.js';
import { UnauthorizedError, ConflictError, NotFoundError } from '../utils/errors.js';
import prisma from '../config/database.js';

/**
 * Auth Service - Business logic for authentication
 * Single Responsibility: Authentication and authorization logic
 */
export class AuthService {
  constructor(repos = repositories) {
    this.userRepo = repos.user;
  }

  /**
   * Authenticate user and generate token
   * @param {string} email
   * @param {string} password
   * @returns {Promise<Object>}
   */
  async login(email, password) {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign(
        { userId: user.id, purpose: '2fa' },
        config.jwtSecret,
        { expiresIn: '5m' }
      );
      return {
        requires2FA: true,
        tempToken,
      };
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branch: user.branch,
        twoFactorEnabled: !!user.twoFactorEnabled,
      },
    };
  }

  async verify2FA(tempToken, code) {
    let payload;
    try {
      payload = jwt.verify(tempToken, config.jwtSecret);
    } catch {
      throw new UnauthorizedError('Invalid or expired verification. Please log in again.');
    }
    if (payload.purpose !== '2fa') {
      throw new UnauthorizedError('Invalid token');
    }

    const user = await this.userRepo.findById(payload.userId);
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      throw new UnauthorizedError('2FA not enabled for this account');
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code');
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branch: user.branch,
        twoFactorEnabled: !!user.twoFactorEnabled,
      },
    };
  }

  async get2FAStatus(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return { enabled: !!user.twoFactorEnabled };
  }

  async setup2FA(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    if (user.twoFactorEnabled) {
      throw new ConflictError('2FA is already enabled');
    }

    const secret = speakeasy.generateSecret({
      name: `Internal Ops (${user.email})`,
      length: 32,
    });

    const qrCode = await QRCode.toDataURL(secret.otpauth_url);
    return {
      secret: secret.base32,
      qrCode,
    };
  }

  async verify2FASetup(userId, code, secret) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    if (user.twoFactorEnabled) {
      throw new ConflictError('2FA is already enabled');
    }

    const isValid = speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
    if (!isValid) {
      throw new UnauthorizedError('Invalid verification code');
    }

    await this.userRepo.update(userId, {
      twoFactorSecret: secret,
      twoFactorEnabled: true,
    });

    return { message: '2FA enabled successfully' };
  }

  async disable2FA(userId, password) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    if (!user.twoFactorEnabled) {
      throw new ConflictError('2FA is not enabled');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    await this.userRepo.update(userId, {
      twoFactorSecret: null,
      twoFactorEnabled: false,
    });

    return { message: '2FA disabled successfully' };
  }

  /**
   * Get current user
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getCurrentUser(userId) {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundError('User');
    }
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branch: user.branch,
        twoFactorEnabled: !!user.twoFactorEnabled,
      },
    };
  }
}

/**
 * User Service - Business logic for user management
 * Single Responsibility: User management operations
 */
export class UserService {
  constructor(repos = repositories) {
    this.userRepo = repos.user;
  }

  /**
   * Get all users
   * @returns {Promise<Object>}
   */
  async getUsers() {
    const users = await this.userRepo.findAll();
    return { users };
  }

  /**
   * Create a new user
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async createUser(data) {
    const { email, password, name, role, branch } = data;

    // Check for duplicate email
    const existing = await this.userRepo.findByEmail(email);
    if (existing) {
      throw new ConflictError('Email already in use');
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await this.userRepo.create({
      email,
      passwordHash,
      name,
      role: role || 'user',
      branch: branch === '' ? null : (branch || null),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branch: user.branch,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Update a user
   * @param {string} id
   * @param {Object} data
   * @returns {Promise<Object>}
   */
  async updateUser(id, data) {
    const existing = await this.userRepo.findById(id);
    if (!existing) {
      throw new NotFoundError('User');
    }

    const updateData = {};
    if (data.email) updateData.email = data.email;
    if (data.name) updateData.name = data.name;
    if (data.role) updateData.role = data.role;
    if (data.password) {
      updateData.passwordHash = await bcrypt.hash(data.password, 12);
    }
    if (data.branch !== undefined) {
      updateData.branch = data.branch === '' ? null : data.branch;
    }

    const user = await this.userRepo.update(id, updateData);
    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        branch: user.branch,
        createdAt: user.createdAt,
      },
    };
  }

  /**
   * Delete a user
   * @param {string} id
   * @param {string} currentUserId - ID of user performing the action
   * @returns {Promise<Object>}
   */
  async deleteUser(id, currentUserId) {
    if (id === currentUserId) {
      throw new ConflictError('Cannot delete your own account');
    }

    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundError('User');
    }

    // Delete any legacy tables that reference this user (tables removed from Prisma schema but may still exist in DB)
    try {
      // Check if fibre_orders table exists first
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'fibre_orders'
        ) as exists
      `;
      
      if (tableExists && tableExists[0]?.exists) {
        // Drop the foreign key constraint - try known name first, then find it dynamically
        try {
          // Try the standard constraint name first
          await prisma.$executeRawUnsafe(`
            ALTER TABLE fibre_orders 
            DROP CONSTRAINT IF EXISTS fibre_orders_sales_agent_id_fkey
          `);
        } catch (constraintError) {
          // If that fails, try to find the actual constraint name
          try {
            const constraintInfo = await prisma.$queryRaw`
              SELECT conname 
              FROM pg_constraint 
              WHERE conrelid = 'fibre_orders'::regclass 
              AND confrelid = 'users'::regclass
              AND contype = 'f'
              LIMIT 1
            `;
            
            if (constraintInfo && constraintInfo.length > 0) {
              const constraintName = constraintInfo[0].conname;
              
              // Drop the foreign key constraint using the actual name
              await prisma.$executeRawUnsafe(`
                ALTER TABLE fibre_orders 
                DROP CONSTRAINT IF EXISTS "${constraintName}"
              `);
            }
          } catch (findError) {
            console.warn('Could not find or drop constraint:', findError.message);
          }
        }

        // Delete order_updates first (they reference fibre_orders)
        try {
          await prisma.$executeRaw`
            DELETE FROM order_updates WHERE order_id IN (
              SELECT id FROM fibre_orders WHERE sales_agent_id = ${id}
            )
          `;
        } catch (error) {
          // Table might not exist, ignore error
          if (!error.message?.includes('does not exist') && !error.message?.includes('relation')) {
            console.warn('Could not delete order_updates:', error.message);
          }
        }

        // Delete fibre_orders that reference this user
        try {
          await prisma.$executeRaw`
            DELETE FROM fibre_orders WHERE sales_agent_id = ${id}
          `;
        } catch (error) {
          // Table might not exist, ignore error
          if (!error.message?.includes('does not exist') && !error.message?.includes('relation')) {
            console.warn('Could not delete fibre_orders:', error.message);
          }
        }
      }
    } catch (error) {
      // If table doesn't exist or constraint doesn't exist, that's fine
      if (!error.message?.includes('does not exist') && !error.message?.includes('relation') && !error.message?.includes('constraint')) {
        console.warn('Error cleaning up legacy tables:', error.message);
        // Don't throw - try to continue with user deletion anyway
      }
    }

    // Now delete the user (constraints and related records are gone)
    await this.userRepo.delete(id);
    return { message: 'User deleted successfully' };
  }
}
