import prisma from '../config/database.js';
import { ReadingRepository } from './reading.repository.js';
import { MachineRepository } from './machine.repository.js';
import { UserRepository } from './user.repository.js';
import { SubmissionRepository } from './submission.repository.js';
import { ModelPartRepository } from './modelPart.repository.js';
import { PartReplacementRepository } from './partReplacement.repository.js';
import { CustomerRepository } from './customer.repository.js';
import notificationRepository from './notification.repository.js';

import { FibreProductRepository } from './fibre-product.repository.js';
import { FibreOrderRepository } from './fibre-order.repository.js';
import { OrderUpdateRepository } from './order-update.repository.js';
import { FibreOrderUpdateRequestRepository } from './fibre-order-update-request.repository.js';
import { UnableToObtainOverrideRequestRepository } from './unable-to-obtain-override-request.repository.js';

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
  notification: notificationRepository,
  fibreProduct: new FibreProductRepository(prisma),
  fibreOrder: new FibreOrderRepository(prisma),
  orderUpdate: new OrderUpdateRepository(prisma),
  fibreOrderUpdateRequest: new FibreOrderUpdateRequestRepository(prisma),
  unableToObtainOverrideRequest: new UnableToObtainOverrideRequestRepository(prisma),
};

export {
  ReadingRepository,
  MachineRepository,
  UserRepository,
  SubmissionRepository,
  ModelPartRepository,
  PartReplacementRepository,
  CustomerRepository,
  FibreProductRepository,
  FibreOrderRepository,
  OrderUpdateRepository,
  FibreOrderUpdateRequestRepository,
  UnableToObtainOverrideRequestRepository,
};
