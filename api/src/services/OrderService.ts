// Re-export from the modularized order/ directory.
// This shim preserves all existing import paths (e.g. '@/services/OrderService').
export { OrderService } from './order';
export type { IOrderService } from './order';
