import prisma from '../config/database.js';
import { ReadingRepository } from './reading.repository.js';
import { MachineRepository } from './machine.repository.js';
import { UserRepository } from './user.repository.js';
import { SubmissionRepository } from './submission.repository.js';

/**
 * Repository Factory - Centralized repository creation
 * Dependency Injection pattern for repositories
 */
export const repositories = {
  reading: new ReadingRepository(prisma),
  machine: new MachineRepository(prisma),
  user: new UserRepository(prisma),
  submission: new SubmissionRepository(prisma),
};

export {
  ReadingRepository,
  MachineRepository,
  UserRepository,
  SubmissionRepository,
};
