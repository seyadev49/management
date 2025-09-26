import { useCallback } from 'react';
import { usePlanLimitContext } from '../contexts/PlanLimitContext';
import { usePlanLimits } from './usePlanLimits';
import { useNetworkError } from './useNetworkError';
import { analyzeError } from '../utils/networkUtils';
import toast from 'react-hot-toast';

//theres type error for errorData.message so solve it
// it sayes ErrorData is declared but the value is naver used solve it

export const useApiWithLimitCheck = () => {
  const { showPlanLimitModal } = usePlanLimitContext();
  const { handleApiError } = usePlanLimits();
  const { handleError: handleNetworkError } = useNetworkError();

  const apiCall = useCallback(async (
    apiFunction: () => Promise<any>,
    feature: string,
  ) => {
    try {
      const result = await apiFunction();
      
      // If result is a Response object (from fetch), check its status
      if (result && typeof result.json === 'function') {
        // Handle fetch response
        if (!result.ok) {
          // Parse error response
          let errorData = {};
          try {
            errorData = await result.json();
          } catch (e) {
            errorData = { status: result.status, message: result.statusText };
          }
          
          const error = {
            response: {
              status: result.status,
              data: errorData
            }
          };
          
          // Check for network errors first
          const networkError = await analyzeError(error);
          if (networkError.isNetworkError) {
            throw networkError;
          }
          
          const limitError = handleApiError(error, feature);
          if (limitError) {
            showPlanLimitModal({
              feature: limitError.feature,
              currentUsage: limitError.currentUsage,
              limit: limitError.limit,
              plan: limitError.plan
            });
            return null;
          }
          // for errorData?.message doesnt have any type solve it the error of message
          const errorDataTyped = errorData as { message?: string };
          // Handle permission errors
          if (result.status === 403) {
            const errorMessage = errorDataTyped?.message || "You don't have permission to perform this action";
            toast.error(errorMessage);
            throw new Error(`Permission denied: ${errorMessage}`);
          }
          
          throw new Error(`HTTP ${result.status}: ${result.statusText}`);
        }
        
        // Return parsed JSON for successful responses
        return await result.json();
      }
      
      // If it's already a resolved value (like from axios), return it directly
      return result;
      
    } catch (error: any) {
      // Handle network errors or other exceptions
      console.error('API call failed:', error);
      
      // Analyze and handle network errors
      const networkError = await handleNetworkError(error);
      if (networkError.isNetworkError) {
        throw networkError;
      }
      
      // Try to handle limit error from network errors
      const limitError = handleApiError(error, feature);
      if (limitError) {
        showPlanLimitModal({
          feature: limitError.feature,
          currentUsage: limitError.currentUsage,
          limit: limitError.limit,
          plan: limitError.plan
        });
        return null;
      }
      
      // Handle permission errors in the catch block
      if (error?.response?.status === 403) {
        const errorMessage = error?.response?.data?.message || 'You don\'t have permission to perform this action';
        toast.error(errorMessage);
        throw new Error(`Permission denied: ${errorMessage}`);
      }
      
      throw error;
    }
  }, [handleApiError, showPlanLimitModal]);

  return { apiCall };
};