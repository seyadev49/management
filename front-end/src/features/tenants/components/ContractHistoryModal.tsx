import React, { useState, useEffect } from 'react';
import { X, Calendar, DollarSign, FileText, Clock,CheckCircle ,AlertTriangle } from 'lucide-react';
import { ContractHistory } from '../types';

interface ContractHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantId: number | null;
  tenantName: string;
  token: string;
}

export const ContractHistoryModal: React.FC<ContractHistoryModalProps> = ({
  isOpen,
  onClose,
  tenantId,
  tenantName,
  token,
}) => {
  const [contracts, setContracts] = useState<ContractHistory[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && tenantId) {
      fetchContractHistory();
    }
  }, [isOpen, tenantId]);

  const fetchContractHistory = async () => {
    if (!tenantId) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`http://localhost:5000/api/tenants/${tenantId}/contract-history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setContracts(data.contracts || []);
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to fetch contract history');
      }
    } catch (error) {
      console.error('Failed to fetch contract history:', error);
      setError('Failed to fetch contract history');
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'expired':
        return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
      case 'terminated':
        return <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      default:
        return <FileText className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
      case 'expired':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
      case 'terminated':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      default:
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
    }
  };

  const calculateDuration = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const months = Math.round(diffDays / 30);
    return months;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-gray-500 opacity-75 dark:bg-gray-900"></div>
        <div className="inline-block bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Contract History: {tenantName}
                </h3>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 dark:border-blue-400"></div>
                <span className="ml-2 text-gray-600 dark:text-gray-400">Loading contract history...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertTriangle className="h-12 w-12 text-red-400 dark:text-red-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Error Loading History</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
                <button
                  onClick={fetchContractHistory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  Try Again
                </button>
              </div>
            ) : contracts.length > 0 ? (
              <div className="space-y-4">
                {contracts.map((contract, index) => (
                  <div 
                    key={contract.id} 
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        {getStatusIcon(contract.status)}
                        <div className="ml-3">
                          <h4 className="text-lg font-medium text-gray-900 dark:text-white">
                            {contract.property_name} - Unit {contract.unit_number}
                          </h4>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(contract.status)}`}>
                            {contract.status_display}
                          </span>
                        </div>
                      </div>
                      <div className="text-right text-sm text-gray-500 dark:text-gray-400">
                        Contract #{contract.id}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Duration</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            {calculateDuration(contract.contract_start_date, contract.contract_end_date)} months
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm">
                        <DollarSign className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Monthly Rent</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            ${contract.monthly_rent.toLocaleString()}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center text-sm">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        <div>
                          <div className="text-gray-600 dark:text-gray-400">Security Deposit</div>
                          <div className="font-medium text-gray-900 dark:text-white">
                            ${contract.deposit.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Start Date: </span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(contract.contract_start_date).toLocaleDateString()}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">End Date: </span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(contract.contract_end_date).toLocaleDateString()}
                        </span>
                      </div>
                      {contract.actual_end_date && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Actual End: </span>
                          <span className="text-gray-900 dark:text-white">
                            {new Date(contract.actual_end_date).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {contract.termination_reason && (
                        <div>
                          <span className="text-gray-600 dark:text-gray-400">Termination Reason: </span>
                          <span className="text-gray-900 dark:text-white capitalize">
                            {contract.termination_reason.replace('_', ' ')}
                          </span>
                        </div>
                      )}
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">Created: </span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(contract.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    {index === 0 && contract.status.toLowerCase() === 'active' && (
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center text-sm text-blue-600 dark:text-blue-400">
                          <CheckCircle className="h-4 w-4 mr-1" />
                          <span className="font-medium">Current Active Contract</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Contract History</h3>
                <p className="text-gray-600 dark:text-gray-400">
                  No contracts found for this tenant.
                </p>
              </div>
            )}
          </div>

          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:w-auto sm:text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};