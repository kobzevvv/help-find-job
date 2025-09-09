/**
 * Service Lifecycle Types
 */

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  message: string;
  details?: Record<string, unknown>;
}

export interface ServiceLifecycle {
  healthCheck?(): Promise<ServiceHealth>;
  shutdown?(): Promise<void>;
}
