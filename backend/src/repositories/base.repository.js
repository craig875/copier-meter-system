/**
 * Base Repository - Abstract base class for all repositories
 * Follows Repository Pattern for data access abstraction
 */
export class BaseRepository {
  constructor(model, prisma) {
    this.model = model;
    this.prisma = prisma;
  }

  async findById(id) {
    return this.prisma[this.model].findUnique({ where: { id } });
  }

  async findMany(where = {}, options = {}) {
    return this.prisma[this.model].findMany({
      where,
      ...options,
    });
  }

  async findOne(where) {
    return this.prisma[this.model].findFirst({ where });
  }

  async create(data) {
    return this.prisma[this.model].create({ data });
  }

  async update(id, data) {
    return this.prisma[this.model].update({
      where: { id },
      data,
    });
  }

  async delete(id) {
    return this.prisma[this.model].delete({ where: { id } });
  }

  async count(where = {}) {
    return this.prisma[this.model].count({ where });
  }

  async upsert(where, create, update) {
    return this.prisma[this.model].upsert({
      where,
      create,
      update,
    });
  }
}
