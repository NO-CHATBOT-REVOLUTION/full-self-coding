import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { apiService } from '../services/api';

interface ServerStatus {
  isOnline: boolean;
  serverInfo?: any;
  error?: string;
}

export function ServerStatus() {
  const [status, setStatus] = useState<ServerStatus>({
    isOnline: false,
  });
  const [isChecking, setIsChecking] = useState(true);

  const checkServerStatus = async () => {
    try {
      setIsChecking(true);
      const serverInfo = await apiService.healthCheck();
      setStatus({
        isOnline: true,
        serverInfo,
      });
    } catch (error) {
      setStatus({
        isOnline: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    checkServerStatus();

    // Check server status every 30 seconds
    const interval = setInterval(checkServerStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  if (isChecking && !status.isOnline && !status.error) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Checking server status...
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (status.isOnline && status.serverInfo) {
    return (
      <Card className="mb-6 border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
              <div>
                <span className="text-sm font-medium text-green-800 dark:text-green-200">
                  Server Online
                </span>
                <p className="text-xs text-green-600 dark:text-green-400">
                  {status.serverInfo.name} v{status.serverInfo.version}
                </p>
              </div>
            </div>
            <button
              onClick={checkServerStatus}
              className="text-xs text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
            >
              Refresh
            </button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Alert className="mb-6" variant="destructive">
      <XCircle className="h-4 w-4" />
      <AlertDescription>
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">Server Offline</span>
            <p className="text-sm mt-1">
              {status.error || 'Cannot connect to the server. Please make sure the server is running on http://localhost:3002'}
            </p>
          </div>
          <button
            onClick={checkServerStatus}
            className="text-sm underline hover:no-underline"
            disabled={isChecking}
          >
            {isChecking ? 'Checking...' : 'Retry'}
          </button>
        </div>
      </AlertDescription>
    </Alert>
  );
}