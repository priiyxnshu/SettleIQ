export interface HealthStatus {
  status: string;
  service: string;
  version: string;
  environment: string;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

export async function checkBackendHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE}/health`, {
    headers: {
      'Accept': 'application/json'
    }
  });
  
  if (!response.ok) {
    throw new Error(`Health check failed with HTTP ${response.status}`);
  }
  
  return response.json();
}
