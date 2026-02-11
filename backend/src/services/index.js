import { ReadingService } from './reading.service.js';
import { MachineService } from './machine.service.js';
import { AuthService, UserService } from './auth.service.js';
import { ImportService } from './import.service.js';

/**
 * Service Factory - Centralized service creation
 * Dependency Injection pattern for services
 */
export const services = {
  reading: new ReadingService(),
  machine: new MachineService(),
  auth: new AuthService(),
  user: new UserService(),
  import: new ImportService(),
};

export {
  ReadingService,
  MachineService,
  AuthService,
  UserService,
  ImportService,
};
