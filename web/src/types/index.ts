export interface MemoryItem {
  id: string;
  resource_id: string | null;
  memory_type: string;
  summary: string;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
  happened_at: string | null;
  extra: Record<string, unknown>;
  score?: number;
}

export interface MemoryCategory {
  id: string;
  name: string;
  description: string;
  summary: string | null;
  embedding: number[] | null;
  created_at: string;
  updated_at: string;
  score?: number;
}

export interface RetrieveResult {
  needs_retrieval: boolean;
  original_query: string;
  rewritten_query: string;
  next_step_query: string | null;
  categories: MemoryCategory[];
  items: MemoryItem[];
  resources: unknown[];
}

export interface MemorizeResult {
  status: string;
  items_created: number;
  categories: number;
  result: Record<string, unknown>;
}

export interface ServerConfig {
  version: string;
  llm_profiles: string[];
  storage: {
    metadata_store: string | null;
    vector_index: string | null;
  };
  memory_types: string[];
  default_categories: { name: string; description: string }[];
}

export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  memory_service_initialized: boolean;
}
