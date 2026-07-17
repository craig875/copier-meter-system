import { ReadingService } from './reading.service.js';
import { MachineService } from './machine.service.js';
import { AuthService, UserService } from './auth.service.js';
import { ImportService } from './import.service.js';
import { AuditService } from './audit.service.js';
import { ConsumableService } from './consumable.service.js';
import { CustomerService } from './customer.service.js';
import { NotificationService } from './notification.service.js';

import { FibreProductService } from './fibre-product.service.js';
import { FibreOrderService } from './fibre-order.service.js';
import { InstallService } from './install.service.js';
import { InstallTaskService } from './install-task.service.js';

/**
 * Service Factory - Centralized service creation
 * Dependency Injection pattern for services
 */
const notificationService = new NotificationService();

export const services = {
  reading: new ReadingService(),
  machine: new MachineService(),
  auth: new AuthService(),
  user: new UserService(),
  import: new ImportService(),
  audit: new AuditService(),
  consumable: new ConsumableService(),
  customer: new CustomerService(),
  notification: notificationService,
  fibreProduct: new FibreProductService(),
  fibreOrder: new FibreOrderService(),
  install: new InstallService(),
  installTask: new InstallTaskService(),
};

export {
  ReadingService,
  MachineService,
  AuthService,
  UserService,
  ImportService,
};
