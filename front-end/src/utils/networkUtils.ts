// Network utility functions for error detection and handling

export interface NetworkError {
  isNetworkError: boolean;
  isServerError: boolean;
  message: string;
  code?: string;
  originalError?: any;
}

// Check if the user is online
export const isOnline = (): boolean => {
  return navigator.onLine;
};

// Check network connection quality
export const checkNetworkQuality = async (): Promise<'good' | 'poor' | 'offline'> => {
  if (!navigator.onLine) {
    return 'offline';
  }

  try {
    const start = Date.now();
    const response = await fetch('/api/health-check', {
      method: 'HEAD',
      cache: 'no-cache'
    });
    const duration = Date.now() - start;

    if (response.ok && duration < 1000) {
      return 'good';
    } else {
      return 'poor';
    }
  } catch (error) {
    return 'poor';
  }
};

// Analyze error to determine if it's network-related or server-related
export const analyzeError = async (error: any): Promise<NetworkError> => {
  // Check if user is offline
  if (!navigator.onLine) {
    return {
      isNetworkError: true,
      isServerError: false,
      message: 'You appear to be offline. Please check your internet connection and try again.',
      code: 'NETWORK_OFFLINE'
    };
  }

  // Check for common network error patterns
  const networkErrorPatterns = [
    'NetworkError',
    'Failed to fetch',
    'ERR_NETWORK',
    'ERR_INTERNET_DISCONNECTED',
    'ERR_CONNECTION_REFUSED',
    'ERR_CONNECTION_RESET',
    'ERR_CONNECTION_TIMED_OUT',
    'ENOTFOUND',
    'ECONNREFUSED',
    'ETIMEDOUT'
  ];

  const errorMessage = error?.message || error?.toString() || '';
  const isNetworkError = networkErrorPatterns.some(pattern => 
    errorMessage.includes(pattern)
  );

  if (isNetworkError) {
    return {
      isNetworkError: true,
      isServerError: false,
      message: 'Connection problem detected. Please check your internet connection and try again.',
      code: 'NETWORK_CONNECTION_ERROR',
      originalError: error
    };
  }

  // Check for timeout errors
  if (error?.name === 'AbortError' || errorMessage.includes('timeout')) {
    return {
      isNetworkError: true,
      isServerError: false,
      message: 'Request timed out. This might be due to a slow internet connection. Please try again.',
      code: 'NETWORK_TIMEOUT',
      originalError: error
    };
  }

  // Check for HTTP status codes that indicate network issues
  const status = error?.response?.status || error?.status;
  if (status === 0 || status === 408 || status === 502 || status === 503 || status === 504) {
    return {
      isNetworkError: true,
      isServerError: false,
      message: 'Network connectivity issue detected. Please check your internet connection.',
      code: 'NETWORK_HTTP_ERROR',
      originalError: error
    };
  }

  // Check for server errors (5xx)
  if (status >= 500 && status < 600) {
    return {
      isNetworkError: false,
      isServerError: true,
      message: 'Server error occurred. Our team has been notified and is working to resolve this issue.',
      code: 'SERVER_ERROR',
      originalError: error
    };
  }

  // Check for client errors (4xx) - these are usually user/application errors
  if (status >= 400 && status < 500) {
    const serverMessage = error?.response?.data?.message || error?.message;
    return {
      isNetworkError: false,
      isServerError: false,
      message: serverMessage || 'Request failed. Please check your input and try again.',
      code: error?.response?.data?.code || 'CLIENT_ERROR',
      originalError: error
    };
  }

  // Default case - treat as application error
  return {
    isNetworkError: false,
    isServerError: false,
    message: error?.message || 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
    originalError: error
  };
};

// Enhanced fetch wrapper with network error detection
export const fetchWithNetworkDetection = async (
  url: string, 
  options: RequestInit = {}
): Promise<Response> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    const networkError = await analyzeError(error);
    throw networkError;
  }
};

// Network status monitoring
export class NetworkMonitor {
  private listeners: Array<(isOnline: boolean) => void> = [];
  private isMonitoring = false;

  startMonitoring() {
    if (this.isMonitoring) return;

    this.isMonitoring = true;
    
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  stopMonitoring() {
    this.isMonitoring = false;
    
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this.notifyListeners(true);
  };

  private handleOffline = () => {
    this.notifyListeners(false);
  };

  private notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }

  addListener(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
  }

  removeListener(callback: (isOnline: boolean) => void) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }
}

export const networkMonitor = new NetworkMonitor();