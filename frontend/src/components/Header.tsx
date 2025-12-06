import { Github, Code2, Zap } from 'lucide-react';
import { Card, CardContent } from './ui/card';

export function Header() {
  return (
    <Card className="mb-8 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950 border-blue-200 dark:border-blue-800">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Code2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Full Self Coding
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                AI-powered code analysis and task automation
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Powered by Claude
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}