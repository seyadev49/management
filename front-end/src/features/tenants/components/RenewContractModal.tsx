import React, { useState } from 'react';
import { X, Calendar, DollarSign, FileText as AlertCircle } from 'lucide-react';

interface RenewContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: {
    newEndDate: string;
    monthlyRent: string;
    deposit: string;
    leaseDuration: string;
    notes: string;
  };
  onFormChange: (data: Partial<{
    newEndDate: string;
    monthlyRent: string;
    deposit: string;
    leaseDuration: string;
    notes: string;
  }>) => void;
  tenantName: string;
  currentContract?: {
    monthly_rent: number;
    deposit: number;
    contract_end_date: string;
    property_name: string;
    unit_number: string;
  };
  isLoading: boolean;
}

export const RenewContractModal: React.FC<RenewContractModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onFormChange,
  tenantName,
  currentContract,
  isLoading,
}) => {
  if (!isOpen) return null;

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    onFormChange({ [name]: value });

    // Auto-calculate end date when lease duration changes
    if (name === 'leaseDuration' && value) {
      const duration = parseInt(value);
      const startDate = new Date();
      const endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + duration);
      onFormChange({ 
        [name]: value,
        newEndDate: endDate.toISOString().split('T')[0]
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-gray-500 opacity-75 dark:bg-gray-900"></div>
        <div className="inline-block bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
          <form onSubmit={onSubmit}>
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Renew Contract: {tenantName}
                </h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  disabled={isLoading}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Current Contract Info */}
              {currentContract && (
                <div className="mb-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">Current Contract</h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-700 dark:text-blue-400">Property:</span>
                      <div className="font-medium text-blue-900 dark:text-blue-300">
                        {currentContract.property_name} - Unit {currentContract.unit_number}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-400">Current Rent:</span>
                      <div className="font-medium text-blue-900 dark:text-blue-300">
                        ${currentContract.monthly_rent}/month
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-400">Current Deposit:</span>
                      <div className="font-medium text-blue-900 dark:text-blue-300">
                        ${currentContract.deposit}
                      </div>
                    </div>
                    <div>
                      <span className="text-blue-700 dark:text-blue-400">Expires:</span>
                      <div className="font-medium text-blue-900 dark:text-blue-300">
                        {new Date(currentContract.contract_end_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Lease Duration (months) *
                  </label>
                  <select
                    name="leaseDuration"
                    required
                    value={formData.leaseDuration}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={isLoading}
                  >
                    <option value="">Select duration</option>
                    <option value="6">6 months</option>
                    <option value="12">12 months (1 year)</option>
                    <option value="18">18 months</option>
                    <option value="24">24 months (2 years)</option>
                    <option value="36">36 months (3 years)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    New Contract End Date *
                  </label>
                  <input
                    type="date"
                    name="newEndDate"
                    required
                    value={formData.newEndDate}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    disabled={isLoading}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Monthly Rent *
                    </label>
                    <input
                      type="number"
                      name="monthlyRent"
                      required
                      step="0.01"
                      min="0"
                      value={formData.monthlyRent}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="0.00"
                      disabled={isLoading}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Security Deposit
                    </label>
                    <input
                      type="number"
                      name="deposit"
                      step="0.01"
                      min="0"
                      value={formData.deposit}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Leave empty to keep current"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Renewal Notes
                  </label>
                  <textarea
                    name="notes"
                    value={formData.notes}
                    onChange={handleInputChange}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Any additional notes for the renewal..."
                    disabled={isLoading}
                  />
                </div>

                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-green-600 dark:text-green-400 mr-2 mt-0.5" />
                    <div className="text-sm text-green-800 dark:text-green-300">
                      <p className="font-medium mb-1">Contract Renewal Process:</p>
                      <ul className="space-y-1 text-xs">
                        <li>• Current contract will be marked as expired</li>
                        <li>• New contract will start immediately</li>
                        <li>• Unit will remain occupied by the same tenant</li>
                        <li>• Payment schedule will be updated automatically</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm ${
                  isLoading ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800'
                }`}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Renewing...
                  </>
                ) : (
                  'Renew Contract'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isLoading}
                className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};