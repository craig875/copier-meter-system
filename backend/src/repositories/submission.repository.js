import { BaseRepository } from './base.repository.js';

/**
 * Submission Repository - Handles all data access operations for submissions
 * Single Responsibility: Data access for Submission entities
 */
export class SubmissionRepository extends BaseRepository {
  constructor(prisma) {
    super('submission', prisma);
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
}
