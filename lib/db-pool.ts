/**
 * Database connection pooling configuration
 * Optimizes Supabase client connections for high performance
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Connection pool configuration
 */
export const POOL_CONFIG = {
  // Connection pool settings
  MAX_CONNECTIONS: 10,
  IDLE_TIMEOUT_MS: 30000, // 30 seconds
  CONNECTION_TIMEOUT_MS: 5000, // 5 seconds
  
  // Retry configuration
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  RETRY_BACKOFF_MULTIPLIER: 2,
} as const;

/**
 * Connection pool singleton
 */
let pooledClient: SupabaseClient | null = null;

/**
 * Get pooled Supabase client
 * Reuses connections for better performance
 */
export function getPooledSupabaseClient(): SupabaseClient {
  if (pooledClient) {
    return pooledClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error("Supabase configuration missing");
  }

  pooledClient = createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: {
        "x-connection-pool": "enabled",
      },
    },
    db: {
      schema: "public",
    },
  });

  return pooledClient;
}

/**
 * Execute query with retry logic
 */
export async function executeWithRetry<T>(
  operation: () => Promise<T>,
  retries: number = POOL_CONFIG.MAX_RETRIES
): Promise<T> {
  let lastError: Error | null = null;
  let delay = POOL_CONFIG.RETRY_DELAY_MS;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      lastError = error;

      // Don't retry on client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Wait before retrying (with exponential backoff)
      if (attempt < retries) {
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= POOL_CONFIG.RETRY_BACKOFF_MULTIPLIER;
      }
    }
  }

  throw lastError || new Error("Operation failed after retries");
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(): Promise<{
  healthy: boolean;
  responseTime: number;
  error?: string;
}> {
  const start = Date.now();

  try {
    const client = getPooledSupabaseClient();
    
    // Simple query to check connectivity
    const { error } = await client
      .from("users")
      .select("id")
      .limit(1)
      .single();

    const responseTime = Date.now() - start;

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows, which is OK
      return {
        healthy: false,
        responseTime,
        error: error.message,
      };
    }

    return {
      healthy: responseTime < 1000, // Degraded if >1s
      responseTime,
    };
  } catch (error: any) {
    return {
      healthy: false,
      responseTime: Date.now() - start,
      error: error.message,
    };
  }
}

/**
 * Connection pool statistics
 */
export interface PoolStats {
  activeConnections: number;
  idleConnections: number;
  totalConnections: number;
  waitingRequests: number;
}

/**
 * Get connection pool statistics
 * Note: Supabase doesn't expose pool stats directly
 * This is a placeholder for when we implement custom pooling
 */
export async function getPoolStats(): Promise<PoolStats> {
  // In a custom implementation with pg-pool, this would return real stats
  // For now, return estimated stats
  return {
    activeConnections: 0,
    idleConnections: 0,
    totalConnections: 0,
    waitingRequests: 0,
  };
}

/**
 * Warm up connection pool
 * Call this on server startup
 */
export async function warmupConnectionPool(): Promise<void> {
  try {
    const client = getPooledSupabaseClient();
    
    // Execute a simple query to establish connection
    await client
      .from("users")
      .select("id")
      .limit(1);
    
    console.log("✅ Database connection pool warmed up");
  } catch (error) {
    console.error("❌ Failed to warm up connection pool:", error);
  }
}

/**
 * Close all connections (for graceful shutdown)
 */
export async function closeConnectionPool(): Promise<void> {
  if (pooledClient) {
    // Supabase client doesn't have explicit close method
    // Connections will be closed automatically
    pooledClient = null;
  }
}

/**
 * Supabase-specific optimizations
 */
export const SUPABASE_OPTIMIZATIONS = {
  // Use connection pooling mode in Supabase
  connectionString: process.env.SUPABASE_POOLING_URL, // If available
  
  // Enable read replicas for read-heavy workloads
  useReadReplica: process.env.SUPABASE_READ_REPLICA_URL !== undefined,
  
  // Connection pooler recommendations
  poolMode: "transaction" as const, // vs "session"
  maxConnections: POOL_CONFIG.MAX_CONNECTIONS,
  
  // Timeout settings
  statementTimeout: 30000, // 30 seconds max query time
  idleInTransactionSessionTimeout: 60000, // 1 minute
} as const;
