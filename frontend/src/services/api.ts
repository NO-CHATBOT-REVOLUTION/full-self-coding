import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  CreateTaskRequest,
  CreateTaskResponse,
  TaskProgressResponse,
  TaskResultsResponse,
  TaskHistoryResponse,
  ErrorResponse,
  ServerInfo
} from '../types/api';

class ApiService {
  private client: AxiosInstance;

  constructor(baseUrl: string = 'http://localhost:3002') {
    this.client = axios.create({
      baseURL: baseUrl,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  // Health check
  async healthCheck(): Promise<ServerInfo> {
    try {
      const response = await this.client.get('/');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Create a new task
  async createTask(request: CreateTaskRequest): Promise<CreateTaskResponse> {
    try {
      const response = await this.client.post('/api/tasks', request);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get task progress
  async getTaskProgress(taskId: string): Promise<TaskProgressResponse> {
    try {
      const response = await this.client.get(`/api/tasks/${taskId}/progress`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get task results
  async getTaskResults(taskId: string): Promise<TaskResultsResponse> {
    try {
      const response = await this.client.get(`/api/tasks/${taskId}/results`);
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get task history
  async getTaskHistory(limit?: number, offset?: number): Promise<TaskHistoryResponse> {
    try {
      const params = new URLSearchParams();
      if (limit) params.append('limit', limit.toString());
      if (offset) params.append('offset', offset.toString());

      const response = await this.client.get(`/api/tasks?${params}`);
      return response.data;
    } catch (error) {
      // Handle "No such file or directory" error gracefully - return empty history
      if (error.response?.status === 500 && error.response?.data?.message?.includes('No such file or directory')) {
        return { tasks: [], totalCount: 0 };
      }
      throw this.handleError(error);
    }
  }

  // Delete a task
  async deleteTask(taskId: string): Promise<void> {
    try {
      await this.client.delete(`/api/tasks/${taskId}`);
    } catch (error) {
      throw this.handleError(error);
    }
  }

  // Get server info
  async getServerInfo(): Promise<any> {
    try {
      const response = await this.client.get('/api');
      return response.data;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  private handleError(error: any): Error {
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      const errorData: ErrorResponse = error.response.data;
      throw new Error(errorData.message || errorData.error || 'Server error occurred');
    } else if (error.request) {
      // The request was made but no response was received
      throw new Error('Network error: No response received from server');
    } else {
      // Something happened in setting up the request that triggered an Error
      throw new Error(`Request error: ${error.message}`);
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export the class for testing purposes
export { ApiService };