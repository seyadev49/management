import React, { useEffect, useState } from 'react';

interface Deduction {
  id: number | string;
  description: string;
  amount: number;
}

interface TerminationFormData {
  terminationDate: string;
  terminationReason: string;
  securityDepositAction: string;
  partialReturnAmount: string;
  deductions: Deduction[];
  notes: string;
}

interface TerminateTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  formData: TerminationFormData;
  onFormChange: (data: Partial<TerminationFormData>) => void;
 onAddDeduction: () => void;
 onRemoveDeduction: (index: number) => void;
 onUpdateDeduction: (index: number, field: 'description' | 'amount', value: string | number) => void;
  tenantName: string;
  tenantId?: string | number;
  token?: string;
 isLoading: boolean;
}

export const TerminateTenantModal: React.FC<TerminateTenantModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  formData,
  onFormChange,
 onAddDeduction,
 onRemoveDeduction,
 onUpdateDeduction,
  tenantName,
  tenantId,
  token,
 isLoading,
}) => {
  const [securityDeposit, setSecurityDeposit] = useState<number | null>(null);
  const [depositLoading, setDepositLoading] = useState(false);
  const [depositError, setDepositError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!isOpen || !tenantId || !token) return;

    let isCancelled = false;
    setDepositLoading(true);
    setDepositError(null);
    setSecurityDeposit(null);

    const fetchDeposit = async () => {
      try {
        const res = await fetch(
          `http://localhost:5000/api/tenants/${tenantId}/security-deposit`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Server error ${res.status}: ${errText}`);
        }

        const data = await res.json();

        if (!isCancelled) {
          if (data && (typeof data.securityDeposit === 'number' || 
               (typeof data.securityDeposit === 'string' && !isNaN(parseFloat(data.securityDeposit))))) {
            setSecurityDeposit(parseFloat(data.securityDeposit));
          } else {
            setSecurityDeposit(null);
          }
        }
      } catch (error: any) {
        console.error('[DepositEffect] Error fetching deposit:', error);
        if (!isCancelled) setDepositError('Could not retrieve security deposit.');
      } finally {
        if (!isCancelled) setDepositLoading(false);
      }
    };

    const timeout = setTimeout(() => {
      if (!isCancelled && depositLoading) {
        setDepositLoading(false);
        setDepositError('Request timed out.');
      }
    }, 7000);

    fetchDeposit();

    return () => {
      isCancelled = true;
      clearTimeout(timeout);
    };
  }, [isOpen, tenantId, token]);

  if (!isOpen) return null;




  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen">
        <div className="fixed inset-0 bg-gray-500 opacity-75 dark:bg-gray-900"></div>
        <div className="inline-block bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-lg sm:w-full">
          <form onSubmit={onSubmit}>
            <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Terminate Tenant: {tenantName}
              </h3>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Security Deposit:
                </label>
                {depositLoading ? (
                  <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                    Loading deposit information...
                  </div>
                ) : depositError ? (
                  <div className="text-red-600 dark:text-red-400 text-sm">{depositError}</div>
                ) : securityDeposit !== null ? (
                  <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-3">
                    <div className="text-green-700 dark:text-green-400 font-semibold text-lg">
                      ${securityDeposit}
                    </div>
                    <div className="text-green-600 dark:text-green-500 text-sm">Current security deposit on file</div>
                  </div>
                ) : (
                  <div className="bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                    <div className="text-yellow-700 dark:text-yellow-400 text-sm">No security deposit information found.</div>
                    <div className="text-yellow-600 dark:text-yellow-500 text-xs">This tenant may not have an active contract.</div>
                  </div>
                )}
              </div>
              
              <div className="space-y-4">
                <input
                  type="date"
                  name="terminationDate"
                  required
                  value={formData.terminationDate}
                  onChange={(e) => onFormChange({ terminationDate: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                 disabled={isLoading}
                />
                <select
                  name="terminationReason"
                  required
                  value={formData.terminationReason}
                  onChange={(e) => onFormChange({ terminationReason: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                 disabled={isLoading}
                >
                  <option value="" className="text-gray-900 dark:text-white">Select reason</option>
                  <option value="lease_expired" className="text-gray-900 dark:text-white">Lease Expired</option>
                  <option value="tenant_request" className="text-gray-900 dark:text-white">Tenant Request</option>
                  <option value="non_payment" className="text-gray-900 dark:text-white">Non-Payment</option>
                  <option value="lease_violation" className="text-gray-900 dark:text-white">Lease Violation</option>
                  <option value="property_sale" className="text-gray-900 dark:text-white">Property Sale</option>
                  <option value="other" className="text-gray-900 dark:text-white">Other</option>
                </select>
                <select
                  name="securityDepositAction"
                  required
                  value={formData.securityDepositAction}
                  onChange={(e) => onFormChange({ securityDepositAction: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                 disabled={isLoading}
                >
                  <option value="" className="text-gray-900 dark:text-white">Select action</option>
                  <option value="return_full" className="text-gray-900 dark:text-white">Return Full Deposit</option>
                  <option value="return_partial" className="text-gray-900 dark:text-white">Return Partial Deposit</option>
                  <option value="keep_full" className="text-gray-900 dark:text-white">Keep Full Deposit</option>
                </select>
                {formData.securityDepositAction === 'return_partial' && (
                  <input
                    type="number"
                    value={formData.partialReturnAmount}
                    min="0"
                    step="0.01"
                    onChange={(e) =>
                      onFormChange({ partialReturnAmount: e.target.value })
                    }
                    placeholder="Partial Return Amount"
                    className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                   disabled={isLoading}
                  />
                )}
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300">Deductions</label>
                 {formData.deductions.map((d, index) => (
                   <div key={index} className="flex space-x-2 mb-2">
                      <input
                        type="text"
                        placeholder="Description"
                        value={d.description}
                        onChange={(e) =>
                         onUpdateDeduction(index, 'description', e.target.value)
                        }
                        className="flex-1 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                       disabled={isLoading}
                      />
                      <input
                        type="number"
                        placeholder="Amount"
                        min="0"
                        step="0.01"
                        value={d.amount}
                        onChange={(e) =>
                         onUpdateDeduction(index, 'amount', parseFloat(e.target.value) || 0)
                        }
                        className="w-24 px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                       disabled={isLoading}
                      />
                      <button
                        type="button"
                       onClick={() => onRemoveDeduction(index)}
                        className="text-red-600 dark:text-red-400 hover:text-red-800 dark:hover:text-red-300"
                       disabled={isLoading}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                   onClick={onAddDeduction}
                    className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                   disabled={isLoading}
                  >
                    + Add Deduction
                  </button>
                </div>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={(e) =>
                    onFormChange({ notes: e.target.value })
                  }
                  rows={3}
                  placeholder="Additional Notes"
                  className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                 disabled={isLoading}
                />
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
               disabled={isLoading}
               className={`w-full inline-flex justify-center rounded-lg border shadow-sm px-4 py-2 text-white sm:ml-3 sm:w-auto ${
                 isLoading ? 'bg-red-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'
               }`}
              >
               {isLoading ? (
                 <>
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                   Terminating...
                 </>
               ) : (
                 'Terminate Tenant'
               )}
              </button>
              <button
                type="button"
                onClick={onClose}
               disabled={isLoading}
                className="mt-3 w-full inline-flex justify-center rounded-lg border shadow-sm px-4 py-2 bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-500 sm:mt-0 sm:ml-3 sm:w-auto"
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