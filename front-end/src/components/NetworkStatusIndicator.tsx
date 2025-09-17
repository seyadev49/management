import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { networkMonitor, checkNetworkQuality } from '../utils/networkUtils';

const NetworkStatusIndicator: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor' | 'offline'>('good');
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    // Start monitoring network status
    networkMonitor.startMonitoring();
    
    const handleNetworkChange = (online: boolean) => {
      setIsOnline(online);
      if (online) {
        checkNetworkQuality().then(setNetworkQuality);
      } else {
        setNetworkQuality('offline');
      }
    };

    networkMonitor.addListener(handleNetworkChange);

    // Initial network quality check
    if (isOnline) {
      checkNetworkQuality().then(setNetworkQuality);
    }

    return () => {
      networkMonitor.removeListener(handleNetworkChange);
      networkMonitor.stopMonitoring();
    };
  }, []);

  const getStatusIcon = () => {
    if (!isOnline || networkQuality === 'offline') {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    } else if (networkQuality === 'poor') {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    } else {
      return <Wifi className="h-4 w-4 text-green-500" />;
    }
  };

  const getStatusText = () => {
    if (!isOnline || networkQuality === 'offline') {
      return 'Offline';
    } else if (networkQuality === 'poor') {
      return 'Poor Connection';
    } else {
      return 'Connected';
    }
  };

  const getStatusColor = () => {
    if (!isOnline || networkQuality === 'offline') {
      return 'text-red-600 dark:text-red-400';
    } else if (networkQuality === 'poor') {
      return 'text-yellow-600 dark:text-yellow-400';
    } else {
      return 'text-green-600 dark:text-green-400';
    }
  };

  // Only show indicator if there are connection issues
  if (isOnline && networkQuality === 'good') {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-40">
      <div
        className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 cursor-pointer hover:shadow-xl transition-shadow"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className="flex items-center space-x-2">
          {getStatusIcon()}
          <span className={`text-sm font-medium ${getStatusColor()}`}>
            {getStatusText()}
          </span>
        </div>

        {showDetails && (
          <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
              {!isOnline ? (
                <>
                  <p>• You are currently offline</p>
                  <p>• Check your internet connection</p>
                  <p>• Some features may not work</p>
                </>
              ) : networkQuality === 'poor' ? (
                <>
                  <p>• Slow connection detected</p>
                  <p>• Operations may take longer</p>
                  <p>• Consider checking your connection</p>
                </>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NetworkStatusIndicator;