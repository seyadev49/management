import React from 'react';
import { X, Phone, MapPin, Calendar, DollarSign, FileText, AlertTriangle } from 'lucide-react';
import { Tenant } from '../types';

interface TenantDetailsModalProps {
  show: boolean;
  activeTab: 'active' | 'terminated';
  tenant: Tenant | null;
  onClose: () => void;
  onEdit: (tenant: Tenant) => void;
  onTerminate: (tenant: Tenant) => void;
 onRenew: (tenant: Tenant) => void;
 onViewHistory: (tenant: Tenant) => void;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  show,
  activeTab,
  tenant,
  onClose,
  onEdit,
  onTerminate,
 onRenew,
 onViewHistory,
}) => {
  if (!show || !tenant) return null;
 
 // Parse termination details if available
 let terminationDetails = null;
 if (tenant.termination_notes) {
   try {
     terminationDetails = typeof tenant.termination_notes === 'string' 
       ? JSON.parse(tenant.termination_notes) 
       : tenant.termination_notes;
   } catch (error) {
     console.error('Error parsing termination details:', error);
   }
 }
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full max-h-screen overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-16 w-16">
                <div className="h-16 w-16 rounded-full bg-blue-500 flex items-center justify-center">
                  <span className="text-xl font-medium text-white">
                    {tenant.full_name?.charAt(0)}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  {tenant.full_name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  ID: {tenant.tenant_id} • {tenant.sex}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
          <div className="space-y-6">
            {/* Contact Information */}
            <div>
              <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Contact Information</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <Phone className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900 dark:text-gray-100">{tenant.phone}</span>
                </div>
                <div className="flex items-center">
                  <MapPin className="h-5 w-5 text-gray-400 mr-3" />
                  <span className="text-gray-900 dark:text-gray-100">
                    {tenant.city}, {tenant.subcity}
                  </span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600 dark:text-gray-400">Address: </span>
                  <span className="text-gray-900 dark:text-gray-100">
                    Woreda {tenant.woreda}, House {tenant.house_no}
                  </span>
                </div>
                {tenant.organization && (
                  <div className="col-span-2">
                    <span className="text-gray-600 dark:text-gray-400">Organization: </span>
                    <span className="text-gray-900 dark:text-gray-100">{tenant.organization}</span>
                  </div>
                )}
              </div>
            </div>
            {/* Agent Information */}
            {tenant.has_agent && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Agent Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Name: </span>
                    <span className="text-gray-900 dark:text-gray-100">{tenant.agent_full_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Sex: </span>
                    <span className="text-gray-900 dark:text-gray-100">{tenant.agent_sex}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Phone: </span>
                    <span className="text-gray-900 dark:text-gray-100">{tenant.agent_phone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">City: </span>
                    <span className="text-gray-900 dark:text-gray-100">{tenant.agent_city}</span>
                  </div>
                  {tenant.authentication_no && (
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Authentication No: </span>
                      <span className="text-gray-900 dark:text-gray-100">{tenant.authentication_no}</span>
                    </div>
                  )}
                  {tenant.authentication_date && (
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Authentication Date: </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {new Date(tenant.authentication_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
            {/* Property Information */}
            {tenant.property_name && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Property Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Property: </span>
                    <span className="text-gray-900 dark:text-gray-100">{tenant.property_name}</span>
                  </div>
                  {tenant.unit_number && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Unit: </span>
                      <span className="text-gray-900 dark:text-gray-100">{tenant.unit_number}</span>
                    </div>
                  )}
                  {tenant.monthly_rent && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Monthly Rent: </span>
                      <span className="text-gray-900 dark:text-gray-100">${tenant.monthly_rent}</span>
                    </div>
                  )}
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Status: </span>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      tenant.contract_status === 'active'
                        ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100'
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {tenant.contract_status || 'No active contract'}
                    </span>
                  </div>
                  {tenant.contract_start_date && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Contract Start: </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {new Date(tenant.contract_start_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {tenant.contract_end_date && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Contract End: </span>
                      <span className="text-gray-900 dark:text-gray-100">
                        {new Date(tenant.contract_end_date).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                 {/* Payment Due Information */}
                 {activeTab === 'active' && tenant.contract_status === 'active' && (
                   <div className="col-span-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                     <div className="grid grid-cols-2 gap-4">
                       {tenant.days_until_expiry !== null && (
                         <div className={`flex items-center text-sm ${
                           tenant.days_until_expiry! <= 30
                             ? 'text-red-600 dark:text-red-400'
                             : tenant.days_until_expiry! <= 60
                             ? 'text-yellow-600 dark:text-yellow-400'
                             : 'text-green-600 dark:text-green-400'
                         }`}>
                           <Calendar className="h-4 w-4 mr-2" />
                           <div>
                             <div className="font-medium">Contract Expires</div>
                             <div>{tenant.days_until_expiry} days left</div>
                           </div>
                         </div>
                       )}
                       {tenant.days_until_next_payment !== null && (
                         <div className={`flex items-center text-sm ${
                           tenant.days_until_next_payment! <= 0
                             ? 'text-red-600 dark:text-red-400'
                             : tenant.days_until_next_payment! <= 7
                             ? 'text-yellow-600 dark:text-yellow-400'
                             : 'text-green-600 dark:text-green-400'
                         }`}>
                           <DollarSign className="h-4 w-4 mr-2" />
                           <div>
                             <div className="font-medium">Next Payment</div>
                             <div>{tenant.days_until_next_payment! <= 0 ? 'Overdue' : `${tenant.days_until_next_payment} days`}</div>
                           </div>
                         </div>
                       )}
                     </div>
                   </div>
                 )}
                </div>
              </div>
            )}
            {/* Termination Information */}
            {activeTab === 'terminated' && tenant.termination_date && (
              <div>
                <h4 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-3">Termination Information</h4>
               <div className="space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Termination Date: </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {new Date(tenant.termination_date).toLocaleDateString()}
                    </span>
                  </div>
                 {(tenant.termination_reason || terminationDetails?.reason) && (
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">Reason: </span>
                      <span className="text-gray-900 dark:text-gray-100">
                       {(tenant.termination_reason || terminationDetails?.reason)?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                  )}
                 </div>
                 
                 {/* Enhanced Termination Details */}
                 {terminationDetails && (
                   <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
                     <h5 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                       <FileText className="h-4 w-4 mr-2" />
                       Termination Details
                     </h5>
                     
                     {terminationDetails.deposit_action && (
                       <div className="mb-3">
                         <span className="text-gray-600 dark:text-gray-400">Security Deposit Action: </span>
                         <span className="text-gray-900 dark:text-gray-100 capitalize">
                           {terminationDetails.deposit_action.replace('_', ' ')}
                         </span>
                         {terminationDetails.deposit_returned > 0 && (
                           <span className="ml-2 text-green-600 dark:text-green-400">
                             (${terminationDetails.deposit_returned} returned)
                           </span>
                         )}
                       </div>
                     )}
                     
                     {terminationDetails.deductions && terminationDetails.deductions.length > 0 && (
                       <div className="mb-3">
                         <span className="text-gray-600 dark:text-gray-400 block mb-2">Deductions:</span>
                         <div className="space-y-1">
                           {terminationDetails.deductions.map((deduction: any, index: number) => (
                             <div key={index} className="flex justify-between items-center text-sm bg-red-50 dark:bg-red-900/20 p-2 rounded">
                               <span className="text-gray-900 dark:text-gray-100">{deduction.description}</span>
                               <span className="text-red-600 dark:text-red-400 font-medium">${deduction.amount}</span>
                             </div>
                           ))}
                         </div>
                       </div>
                     )}
                     
                     {terminationDetails.notes && (
                       <div>
                         <span className="text-gray-600 dark:text-gray-400">Additional Notes: </span>
                         <span className="text-gray-900 dark:text-gray-100">{terminationDetails.notes}</span>
                       </div>
                     )}
                   </div>
                 )}
                 
                 {/* Fallback for old termination notes */}
                 {!terminationDetails && tenant.termination_notes && (
                    <div className="col-span-2">
                      <span className="text-gray-600 dark:text-gray-400">Notes: </span>
                      <span className="text-gray-900 dark:text-gray-100">{tenant.termination_notes}</span>
                    </div>
                 )}
              </div>
            )}
          </div>
        </div>
        <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
          {activeTab === 'active' && tenant.contract_status === 'active' && (
            <div className="flex space-x-3">
             <button
               onClick={() => {
                 onClose();
                 onViewHistory(tenant);
               }}
               className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
             >
               View History
             </button>
              <button
                onClick={() => {
                  onClose();
                  onEdit(tenant);
                }}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Edit Tenant
              </button>
             <button
               onClick={() => {
                 onClose();
                 onRenew(tenant);
               }}
               className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm"
             >
               Renew Contract
             </button>
              <button
                onClick={() => {
                  onClose();
                  onTerminate(tenant);
                }}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-orange-600 text-base font-medium text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Terminate
              </button>
            </div>
          )}
         {activeTab === 'terminated' && (
           <button
             onClick={() => {
               onClose();
               onViewHistory(tenant);
             }}
             className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500 sm:ml-3 sm:w-auto sm:text-sm"
           >
             View Contract History
           </button>
         )}
          <button
            onClick={onClose}
            className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-800 text-base font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};