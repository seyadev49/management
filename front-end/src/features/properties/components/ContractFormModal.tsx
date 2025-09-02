// =======================================================================
// 📂 src/features/properties/components/ContractFormModal.tsx
// Modal component for creating a new lease contract.
// =======================================================================
import React from 'react';
import { Unit, Tenant } from '../types';

interface ContractFormData {
    propertyId: string;
    unitId: string;
    tenantId: string;
    leaseDuration: number;
    paymentTerm: number;
    contractStartDate: string;
    contractEndDate: string;
    monthlyRent: string;
    deposit: string;
    eeuPayment: number;
    waterPayment: number;
    generatorPayment: number;
    rentStartDate: string;
    rentEndDate: string;
}

interface ContractFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (e: React.FormEvent) => void;
    formData: ContractFormData;
    onInputChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    propertyName: string;
    availableUnits: Unit[];
    tenants: Tenant[];
    error?: string; // Add error prop
}

export const ContractFormModal: React.FC<ContractFormModalProps> = ({
    isOpen, onClose, onSubmit, formData, onInputChange, propertyName, availableUnits, tenants, error
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen">
                <div className="fixed inset-0 bg-gray-500 opacity-75 dark:bg-gray-900"></div>
                <div className="inline-block bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:max-w-2xl sm:w-full max-h-[90vh] overflow-y-auto">
                    <form onSubmit={onSubmit}>
                        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 max-h-[80vh] overflow-y-auto">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create Contract - {propertyName}</h3>
                            
                            {/* Display error message */}
                            {error && (
                                <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                                    {error}
                                </div>
                            )}
                            
                            <div className="space-y-6">
                                {/* Contract Details */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Contract Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Unit *
                                            </label>
                                            <select 
                                                name="unitId" 
                                                required 
                                                value={formData.unitId} 
                                                onChange={onInputChange} 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" 
                                                aria-label="Unit"
                                            >
                                                <option value="">Select a unit</option>
                                                {availableUnits.map(u => (
                                                    <option key={u.id} value={u.id}>
                                                        Unit {u.unit_number} - ${u.monthly_rent}/month
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Tenant *
                                            </label>
                                            <select 
                                                name="tenantId" 
                                                required 
                                                value={formData.tenantId} 
                                                onChange={onInputChange} 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" 
                                                aria-label="Tenant"
                                            >
                                                <option value="">Select a tenant</option>
                                                {tenants.map(t => (
                                                    <option key={t.id} value={t.id}>{t.full_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Lease Duration (months) *
                                            </label>
                                            <input 
                                                type="number" 
                                                name="leaseDuration" 
                                                required 
                                                min="1" 
                                                value={formData.leaseDuration} 
                                                onChange={onInputChange} 
                                                placeholder="Lease Duration (months)" 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Payment Term (months) *
                                            </label>
                                            <select 
                                                name="paymentTerm" 
                                                required 
                                                value={formData.paymentTerm} 
                                                onChange={onInputChange} 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white" 
                                                aria-label="Payment Term"
                                            >
                                                <option value={1}>Monthly</option>
                                                <option value={3}>Quarterly</option>
                                                <option value={6}>Semi-Annual</option>
                                                <option value={12}>Annual</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Contract Start Date *
                                            </label>
                                            <input 
                                                type="date" 
                                                name="contractStartDate" 
                                                required 
                                                value={formData.contractStartDate} 
                                                onChange={onInputChange} 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Contract End Date *
                                            </label>
                                            <input 
                                                type="date" 
                                                name="contractEndDate" 
                                                required 
                                                value={formData.contractEndDate} 
                                                onChange={onInputChange} 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Financial Details */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Financial Details</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Monthly Rent *
                                            </label>
                                            <input 
                                                type="number" 
                                                name="monthlyRent" 
                                                required 
                                                value={formData.monthlyRent} 
                                                onChange={onInputChange} 
                                                placeholder="Monthly Rent" 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Security Deposit *
                                            </label>
                                            <input 
                                                type="number" 
                                                name="deposit" 
                                                required 
                                                value={formData.deposit} 
                                                onChange={onInputChange} 
                                                placeholder="Security Deposit" 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                EEU Payment
                                            </label>
                                            <input 
                                                type="number" 
                                                name="eeuPayment" 
                                                value={formData.eeuPayment} 
                                                onChange={onInputChange} 
                                                placeholder="EEU Payment" 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Water Payment
                                            </label>
                                            <input 
                                                type="number" 
                                                name="waterPayment" 
                                                value={formData.waterPayment} 
                                                onChange={onInputChange} 
                                                placeholder="Water Payment" 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Generator Payment
                                            </label>
                                            <input 
                                                type="number" 
                                                name="generatorPayment" 
                                                value={formData.generatorPayment} 
                                                onChange={onInputChange} 
                                                placeholder="Generator Payment" 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                                {/* Rent Period */}
                                <div>
                                    <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-3">Rent Period</h4>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Rent Start Date *
                                            </label>
                                            <input 
                                                type="date" 
                                                name="rentStartDate" 
                                                required 
                                                value={formData.rentStartDate} 
                                                onChange={onInputChange} 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                                Rent End Date *
                                            </label>
                                            <input 
                                                type="date" 
                                                name="rentEndDate" 
                                                required 
                                                value={formData.rentEndDate} 
                                                onChange={onInputChange} 
                                                className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                            <button 
                                type="submit" 
                                className="w-full inline-flex justify-center rounded-lg border shadow-sm px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 sm:ml-3 sm:w-auto"
                            >
                                Create Contract
                            </button>
                            <button 
                                type="button" 
                                onClick={onClose} 
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