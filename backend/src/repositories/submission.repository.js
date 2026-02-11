import { BaseRepository } from './base.repository.js';
import prisma from '../config/database.js';
import { Branch as BranchEnum } from '@prisma/client';

/**
 * Submission Repository - Handles all data access operations for submissions
 * Single Responsibility: Data access for Submission entities
 */
export class SubmissionRepository extends BaseRepository {
  constructor(prismaClient) {
    super('submission', prismaClient);
  }

  static toBranch(val) {
    const s = String(val).toUpperCase();
    if (s === 'JHB') return BranchEnum.JHB;
    if (s === 'CT') return BranchEnum.CT;
    throw new Error(`Invalid branch: ${val}`);
  }

  async findByYearMonth(year, month, branch) {
    const where = {
      year: parseInt(year),
      month: parseInt(month),
    };
    // Only filter by branch if it's provided (null means show all, but submissions require branch)
    if (branch) {
      where.branch = branch;
    }
    return this.findOne(where);
  }

  async createOrUpdate(year, month, branch, submittedBy) {
    return this.upsert(
      {
        year_month_branch: {
          year: parseInt(year),
          month: parseInt(month),
          branch,
        },
      },
      {
        year: parseInt(year),
        month: parseInt(month),
        branch,
        submittedBy,
      },
      {
        submittedBy,
        submittedAt: new Date(),
      }
    );
  }

  async deleteByYearMonth(year, month, branch) {
    const branchEnum = this.constructor.toBranch(branch);
    const result = await prisma.submission.deleteMany({
      where: {
        year,
        month,
        branch: branchEnum,
      },
    });
    return result.count;
  }
}
