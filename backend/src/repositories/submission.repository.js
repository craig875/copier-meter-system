import { BaseRepository } from './base.repository.js';
import prisma from '../config/database.js';

/**
 * Submission Repository - Handles all data access operations for submissions
 * Single Responsibility: Data access for Submission entities
 */
export class SubmissionRepository extends BaseRepository {
  constructor(prismaClient) {
    super('submission', prismaClient);
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
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const b = String(branch).toUpperCase();
    if (!['JHB', 'CT'].includes(b)) {
      throw new Error(`Invalid branch: ${branch}`);
    }
    const result = await prisma.submission.deleteMany({
      where: {
        year: y,
        month: m,
        branch: b,
      },
    });
    return result.count;
  }
}
