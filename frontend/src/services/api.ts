import axios, { AxiosInstance, AxiosResponse } from 'axios';
import type {
  ApiResponse,
  ServerTask,
  Dashboard,
  Health,
  Workspace,
  CreateTaskRequest,
  CreateRemoteTaskRequest,
  CreateTaskResponse,
  CleanupRequest,
  CleanupResponse
} from '../types';

class ApiService {
  private client: AxiosInstance;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly CACHE_DURATION = 2000; // 2 seconds cache for GET requests

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_URL || '',
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000, // 30 second timeout
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        const message = error.response?.data?.error || error.message || 'An error occurred';
        return Promise.reject(new Error(message));
      }
    );

    // Add request interceptor for caching
    this.client.interceptors.request.use((config) => {
      // Only cache GET requests
      if (config.method?.toLowerCase() === 'get') {
        const cacheKey = `${config.url || ''}${JSON.stringify(config.params || {})}`;
        const cached = this.cache.get(cacheKey);

        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
          // Return cached data as adapter config
          config.adapter = () => Promise.resolve({
            data: { success: true, data: cached.data, timestamp: new Date().toISOString() },
            status: 200,
            statusText: 'OK',
            headers: {},
            config,
          });
        }
      }

      return config;
    });

    // Add response interceptor for storing cache
    this.client.interceptors.response.use(
      (response) => {
        if (response.config.method?.toLowerCase() === 'get' && response.data?.success) {
          const cacheKey = `${response.config.url || ''}${JSON.stringify(response.config.params || {})}`;
          this.cache.set(cacheKey, {
            data: response.data.data,
            timestamp: Date.now()
          });
        }
        return response;
      }
    );
  }

  private async request<T>(config: any): Promise<T> {
    const response: AxiosResponse<ApiResponse<T>> = await this.client.request(config);

    if (!response.data.success) {
      throw new Error(response.data.error || 'API request failed');
    }

    return response.data.data as T;
  }

  // Health endpoints
  async getHealth(): Promise<Health> {
    return this.request<Health>({ method: 'GET', url: '/health' });
  }

  // Dashboard endpoints
  async getDashboard(): Promise<Dashboard> {
    return this.request<Dashboard>({ method: 'GET', url: '/api/dashboard' });
  }

  // Task management endpoints
  async startTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    return this.request<CreateTaskResponse>({
      method: 'POST',
      url: '/api/tasks/start',
      data: request
    });
  }

  async startRemoteTask(request: CreateRemoteTaskRequest): Promise<CreateTaskResponse> {
    return this.request<CreateTaskResponse>({
      method: 'POST',
      url: '/api/tasks/start-remote',
      data: request
    });
  }

  async getTask(taskId: string): Promise<ServerTask> {
    return this.request<ServerTask>({
      method: 'GET',
      url: `/api/tasks/${taskId}`
    });
  }

  async getAllTasks(): Promise<{ tasks: ServerTask[]; count: number }> {
    return this.request<{ tasks: ServerTask[]; count: number }>({
      method: 'GET',
      url: '/api/tasks'
    });
  }

  // Analyzer endpoints
  async startAnalyzer(directory?: string): Promise<{ taskId: string; status: string }> {
    return this.request<{ taskId: string; status: string }>({
      method: 'POST',
      url: '/api/analyzer/start',
      data: directory ? { directory } : {}
    });
  }

  async getAnalyzerStatus() {
    return this.request({
      method: 'GET',
      url: '/api/analyzer/status'
    });
  }

  async getAnalyzerReport() {
    return this.request({
      method: 'GET',
      url: '/api/analyzer/report'
    });
  }

  async stopAnalyzer() {
    return this.request({
      method: 'POST',
      url: '/api/analyzer/stop'
    });
  }

  // Task solver endpoints
  async startTaskSolver(taskId: string, tasks: any[]): Promise<{ taskId: string; status: string }> {
    return this.request<{ taskId: string; status: string }>({
      method: 'POST',
      url: '/api/task-solver/start',
      data: { taskId, tasks }
    });
  }

  async getTaskSolverProgress() {
    return this.request({
      method: 'GET',
      url: '/api/task-solver/progress'
    });
  }

  async getTaskSolverStatus() {
    return this.request({
      method: 'GET',
      url: '/api/task-solver/status'
    });
  }

  async getTaskSolverReport() {
    return this.request({
      method: 'GET',
      url: '/api/task-solver/report'
    });
  }

  async stopTaskSolver() {
    return this.request({
      method: 'POST',
      url: '/api/task-solver/stop'
    });
  }

  // Workspace endpoints
  async getWorkspace(): Promise<Workspace> {
    return this.request<Workspace>({
      method: 'GET',
      url: '/api/workspace'
    });
  }

  async cleanupWorkspace(request: CleanupRequest = {}): Promise<CleanupResponse> {
    return this.request<CleanupResponse>({
      method: 'POST',
      url: '/api/workspace/cleanup',
      data: request
    });
  }

  // Emergency stop endpoints
  async emergencyStop(): Promise<{ stoppedComponents: string[]; message: string }> {
    return this.request<{ stoppedComponents: string[]; message: string }>({
      method: 'POST',
      url: '/api/emergency-stop'
    });
  }

  async emergencyStopTask(taskId: string): Promise<{ taskId: string; status: string }> {
    return this.request<{ taskId: string; status: string }>({
      method: 'POST',
      url: `/api/emergency-stop/task-solver/${taskId}`
    });
  }
}

export const apiService = new ApiService();
export default apiService;