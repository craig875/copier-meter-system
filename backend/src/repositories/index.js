import prisma from '../config/database.js';
import { ReadingRepository } from './reading.repository.js';
import { MachineRepository } from './machine.repository.js';
import { UserRepository } from './user.repository.js';
import { SubmissionRepository } from './submission.repository.js';
import { ModelPartRepository } from './modelPart.repository.js';
import { PartReplacementRepository } from './partReplacement.repository.js';
import { CustomerRepository } from './customer.repository.js';

/**
 * Repository Factory - Centralized repository creation
 * Dependency Injection pattern for repositories
 */
export const repositories = {
  reading: new ReadingRepository(prisma),
  machine: new MachineRepository(prisma),
  user: new UserRepository(prisma),
  submission: new SubmissionRepository(prisma),
  modelPart: new ModelPartRepository(prisma),
  partReplacement: new PartReplacementRepository(prisma),
  customer: new CustomerRepository(prisma),
};

export {
  ReadingRepository,
  MachineRepository,
  UserRepository,
  SubmissionRepository,
  ModelPartRepository,
  PartReplacementRepository,
  CustomerRepository,
};
