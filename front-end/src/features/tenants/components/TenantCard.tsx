// Fixed TenantCard component
import React from 'react';
import { Phone, MapPin, Calendar, DollarSign } from 'lucide-react';
import { Tenant } from '../types';

interface TenantCardProps {
  tenant: Tenant;
  activeTab: 'active' | 'terminated';
  openTenantModal: (tenant: Tenant) => void;
  handleEdit: (tenant: Tenant) => void;
  handleTerminate: (tenant: Tenant) => void;
  handleRenew: (tenant: Tenant) => void;
  handleDelete: (id: number) => void;
  handleViewHistory: (tenant: Tenant) => void;
}

export const TenantCard: React.FC<TenantCardProps> = ({
  tenant,
  activeTab,
  openTenantModal,
  handleEdit,
  handleTerminate,
  handleRenew,
  handleDelete,
  handleViewHistory,
}) => {
  // Only show Renew button if contract is active AND within 60 days of expiry
  const shouldShowRenewButton = 
    activeTab === 'active' && 
    tenant.contract_status === 'active' && 
    tenant.days_until_expiry !== null && 
    tenant.days_until_expiry <= 60;

  // Ensure we don't show termination info in active tab
  const isTerminated = tenant.termination_date || tenant.status === 'terminated';
  
  return (
    <div
      key={tenant.id}
      className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => openTenantModal(tenant)}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center">
          <div className="flex-shrink-0 h-12 w-12">
            <div className="h-12 w-12 rounded-full bg-blue-500 flex items-center justify-center">
              <span className="text-lg font-medium text-white">
                {tenant.full_name?.charAt(0)}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
              {tenant.full_name}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              ID: {tenant.tenant_id} • {tenant.sex}
            </p>
          </div>
        </div>
        {activeTab === 'active' && tenant.contract_status === 'active' && (
          <div className="flex space-x-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleEdit(tenant);
              }}
              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 text-sm"
            >
              Edit
            </button>
            {shouldShowRenewButton && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRenew(tenant);
                }}
                className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 text-sm"
              >
                Renew
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                handleTerminate(tenant);
              }}
              className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 text-sm"
            >
              Terminate
            </button>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <Phone className="h-4 w-4 mr-2" />
          {tenant.phone}
        </div>
        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400">
          <MapPin className="h-4 w-4 mr-2" />
          {tenant.city}, {tenant.subcity}
        </div>
        {tenant.property_name && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Property:</span> {tenant.property_name}
            {tenant.unit_number && ` - Unit ${tenant.unit_number}`}
          </div>
        )}
        {tenant.contract_status === 'active' && tenant.monthly_rent && (
          <div className="text-sm text-gray-600 dark:text-gray-400">
            <span className="font-medium">Rent:</span> ${tenant.monthly_rent}/month
          </div>
        )}
        {/* Only show termination info if we're actually in the terminated tab */}
        {activeTab === 'terminated' && isTerminated && tenant.termination_date && (
          <div className="text-sm text-red-600 dark:text-red-400">
            <span className="font-medium">Terminated:</span> {new Date(tenant.termination_date).toLocaleDateString()}
          </div>
        )}
      </div>
      {activeTab === 'active' && tenant.contract_status === 'active' && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          {tenant.days_until_expiry !== null && (
            <div className={`flex items-center text-xs ${
              tenant.days_until_expiry <= 30
                ? 'text-red-600 dark:text-red-400'
                : tenant.days_until_expiry <= 60
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              <Calendar className="h-3 w-3 mr-1" />
              <span>Contract: {tenant.days_until_expiry}d</span>
            </div>
          )}
          {tenant.days_until_next_payment !== null && (
            <div className={`flex items-center text-xs ${
              tenant.days_until_next_payment <= 0
                ? 'text-red-600 dark:text-red-400'
                : tenant.days_until_next_payment <= 7
                ? 'text-yellow-600 dark:text-yellow-400'
                : 'text-green-600 dark:text-green-400'
            }`}>
              <DollarSign className="h-3 w-3 mr-1" />
              <span>
                Payment: {tenant.days_until_next_payment <= 0 ? 'Overdue' : `${tenant.days_until_next_payment}d`}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};