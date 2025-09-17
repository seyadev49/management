import React from 'react';
import { Wifi, WifiOff, Server, AlertTriangle, RefreshCw } from 'lucide-react';

interface NetworkErrorDisplayProps {
  error: {
    isNetworkError: boolean;
    isServerError: boolean;
    message: string;
    code?: string;
  };
  onRetry?: () => void;
  className?: string;
}

const NetworkErrorDisplay: React.FC<NetworkErrorDisplayProps> = ({
  error,
  onRetry,
  className = ''
}) => {
  const getErrorIcon = () => {
    if (error.code === 'NETWORK_OFFLINE') {
      return <WifiOff className="h-8 w-8 text-red-500" />;
    } else if (error.isNetworkError) {
      return <Wifi className="h-8 w-8 text-orange-500" />;
    } else if (error.isServerError) {
      return <Server className="h-8 w-8 text-red-500" />;
    } else {
      return <AlertTriangle className="h-8 w-8 text-yellow-500" />;
    }
  };

  const getErrorColor = () => {
    if (error.code === 'NETWORK_OFFLINE' || error.isServerError) {
      return 'border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20';
    } else if (error.isNetworkError) {
      return 'border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-900/20';
    } else {
      return 'border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20';
    }
  };

  const getErrorTitle = () => {
    if (error.code === 'NETWORK_OFFLINE') {
      return 'No Internet Connection';
    } else if (error.isNetworkError) {
      return 'Connection Issue';
    } else if (error.isServerError) {
      return 'Server Error';
    } else {
      return 'Error';
    }
  };

  const getErrorDescription = () => {
    if (error.code === 'NETWORK_OFFLINE') {
      return 'Please check your internet connection and try again.';
    } else if (error.isNetworkError) {
      return 'This appears to be a connectivity issue on your end. Please check your internet connection.';
    } else if (error.isServerError) {
      return 'This is a server-side issue. Our team has been notified and is working to resolve it.';
    } else {
      return 'Please review your input and try again.';
    }
  };

  return (
    <div className={`border rounded-lg p-6 ${getErrorColor()} ${className}`}>
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          {getErrorIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            {getErrorTitle()}
          </h3>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            {error.message}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
            {getErrorDescription()}
          </p>
          
          {/* Network-specific troubleshooting tips */}
          {error.isNetworkError && (
            <div className="bg-white dark:bg-gray-800 rounded-md p-3 mb-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                Troubleshooting Tips:
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• Check your WiFi or mobile data connection</li>
                <li>• Try refreshing the page</li>
                <li>• Move closer to your WiFi router if using WiFi</li>
                <li>• Contact your internet service provider if the issue persists</li>
              </ul>
            </div>
          )}

          {/* Server error information */}
          {error.isServerError && (
            <div className="bg-white dark:bg-gray-800 rounded-md p-3 mb-4">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                What's happening:
              </h4>
              <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <li>• This is not an issue with your connection</li>
                <li>• Our servers are experiencing difficulties</li>
                <li>• Our technical team has been automatically notified</li>
                <li>• Please try again in a few minutes</li>
              </ul>
            </div>
          )}

          {onRetry && (
            <button
              onClick={onRetry}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NetworkErrorDisplay;