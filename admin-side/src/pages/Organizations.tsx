import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Building, 
  Search,
  Users,
  Eye,
  MoreVertical,
  AlertCircle,
  UserX,
  UserCheck,
  Key,
  LogIn,
  X
} from 'lucide-react';

interface Organization {
  id: number;
  organization_name: string;
  email: string;
  phone: string;
  address: string;
  created_at: string;
  subscription_plan: string;
  subscription_status: string;
  trial_end_date?: string;
  total_users: number;
  total_properties: number;
  total_tenants: number;
  last_activity?: string;
}

interface OrganizationDetails {
  organization: Organization & {
    total_contracts: number;
    total_payments_received: number;
  };
  users: Array<{
    id: number;
    name: string;
    email: string;
    role: string;
    last_login?: string;
    created_at: string;
    is_active: boolean;
  }>;
  activityLogs: Array<{
    action: string;
    details: string;
    created_at: string;
    user_name: string;
  }>;
}

const Organizations: React.FC = () => {
  const { token } = useAuth();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [selectedOrg, setSelectedOrg] = useState<OrganizationDetails | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    fetchOrganizations();
  }, [token]);

  const fetchOrganizations = async () => {
  try {
    const response = await fetch('http://localhost:5000/api/admin/users/organizations', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.ok) {
      const data = await response.json();
      console.log('Full API response structure:', data);
      console.log('Type of data:', typeof data);
      console.log('Is array?', Array.isArray(data));
      
      // Debug different possible structures
      if (data.organizations && Array.isArray(data.organizations)) {
        console.log('Using data.organizations');
        setOrganizations(data.organizations);
      } else if (Array.isArray(data)) {
        console.log('Using raw data array');
        setOrganizations(data);
      } else {
        console.log('Unexpected data structure');
        setOrganizations([]);
      }
    } else {
      console.error('Failed to fetch organizations:', response.status, await response.text());
    }
  } catch (error) {
    console.error('Error fetching organizations:', error);
  } finally {
    setLoading(false);
  }
};

  const fetchOrganizationDetails = async (orgId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/organizations/${orgId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Organization details:', data); // Debug log
        setSelectedOrg(data.data || data);
        setShowDetailsModal(true);
      } else {
        console.error('Failed to fetch organization details:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error fetching organization details:', error);
    }
  };

  const toggleOrganizationStatus = async (orgId: number, action: 'suspend' | 'reactivate', reason?: string) => {
    setActionLoading(`${action}-${orgId}`);
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/organizations/${orgId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reason }),
      });

      if (response.ok) {
        await fetchOrganizations();
        if (selectedOrg && selectedOrg.organization.id === orgId) {
          await fetchOrganizationDetails(orgId);
        }
      } else {
        console.error('Failed to toggle organization status:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error toggling organization status:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const resetUserPassword = async (userId: number) => {
    const newPassword = prompt('Enter new password for user:');
    if (!newPassword) return;

    setActionLoading(`password-${userId}`);
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/users/${userId}/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ newPassword }),
      });

      if (response.ok) {
        alert('Password reset successfully');
      } else {
        console.error('Failed to reset password:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error resetting password:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const impersonateUser = async (userId: number) => {
    setActionLoading(`impersonate-${userId}`);
    try {
      const response = await fetch(`http://localhost:5000/api/admin/users/users/${userId}/impersonate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Open user dashboard in new tab with impersonation token
        const newWindow = window.open(`http://localhost:5173/dashboard?impersonate=${data.impersonationToken}`, '_blank');
        if (newWindow) {
          alert(`Impersonating ${data.userDetails.name} (${data.userDetails.email})`);
        }
      } else {
        console.error('Failed to impersonate user:', response.status, await response.text());
      }
    } catch (error) {
      console.error('Error impersonating user:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const filteredOrganizations = organizations.filter(org => {
  const matchesSearch = org.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                       org.email?.toLowerCase().includes(searchTerm.toLowerCase());
  const matchesStatus = filterStatus === '' || org.subscription_status === filterStatus;
  return matchesSearch && matchesStatus;
});

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'trial': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'suspended': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-yellow-100 text-yellow-800';
      case 'professional': return 'bg-purple-100 text-purple-800';
      case 'enterprise': return 'bg-indigo-100 text-indigo-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">Organizations</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage client organizations and their subscriptions</p>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <input
              type="text"
              placeholder="Search organizations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="trial">Trial</option>
              <option value="cancelled">Cancelled</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </div>

      {/* Organizations Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {filteredOrganizations.map((org) => (
          <div key={org.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 sm:p-6 hover:shadow-lg transition-shadow duration-200">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center">
                <Building className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="text-sm sm:text-lg font-semibold text-gray-900 dark:text-white truncate">{org.organization_name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">{org.email}</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(org.subscription_status)}`}>
                  {org.subscription_status}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Plan:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(org.subscription_plan)}`}>
                  {org.subscription_plan}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Users:</span>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{org.total_users}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Properties:</span>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{org.total_properties}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Tenants:</span>
                <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-white">{org.total_tenants}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2">
              <button
                onClick={() => fetchOrganizationDetails(org.id)}
                className="flex-1 flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                <Eye className="h-4 w-4 mr-1" />
                <span className="hidden sm:inline">View Details</span>
                <span className="sm:hidden">Details</span>
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredOrganizations.length === 0 && (
        <div className="text-center py-12">
          <Building className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No organizations found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm ? 'Try adjusting your search criteria.' : 'No organizations to display.'}
          </p>
        </div>
      )}

      {/* Organization Details Modal */}
      {showDetailsModal && selectedOrg && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Organization Details</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Organization Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedOrg.organization.organization_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                    <p className="text-sm text-gray-900 dark:text-white break-all">{selectedOrg.organization.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedOrg.organization.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                    <p className="text-sm text-gray-900 dark:text-white">{selectedOrg.organization.address}</p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {selectedOrg.organization.subscription_status === 'active' ? (
                    <button
                      onClick={() => toggleOrganizationStatus(selectedOrg.organization.id, 'suspend', 'Admin suspended')}
                      disabled={actionLoading === `suspend-${selectedOrg.organization.id}`}
                      className="flex items-center justify-center px-3 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 disabled:opacity-50"
                    >
                      <UserX className="h-4 w-4 mr-1" />
                      Suspend
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleOrganizationStatus(selectedOrg.organization.id, 'reactivate')}
                      disabled={actionLoading === `reactivate-${selectedOrg.organization.id}`}
                      className="flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 disabled:opacity-50"
                    >
                      <UserCheck className="h-4 w-4 mr-1" />
                      Reactivate
                    </button>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-blue-600">{selectedOrg.organization.total_users}</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Users</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-green-600">{selectedOrg.organization.total_properties}</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Properties</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-purple-600">{selectedOrg.organization.total_tenants}</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Tenants</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-yellow-600">{selectedOrg.organization.total_contracts}</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Contracts</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xl sm:text-2xl font-bold text-red-600">${selectedOrg.organization.total_payments_received}</div>
                    <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Revenue</div>
                  </div>
                </div>

                {/* Users */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Users</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            User
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Role
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Last Login
                          </th>
                          <th className="px-4 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {selectedOrg.users.map((user) => (
                          <tr key={user.id}>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <div>
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                                <div className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 truncate">{user.email}</div>
                              </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full">
                                {user.role}
                              </span>
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                              {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                            </td>
                            <td className="px-4 sm:px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <div className="flex justify-end space-x-2">
                                <button
                                  onClick={() => resetUserPassword(user.id)}
                                  disabled={actionLoading === `password-${user.id}`}
                                  className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 disabled:opacity-50"
                                  title="Reset Password"
                                >
                                  <Key className="h-4 w-4" />
                                </button>
                                <button
                                  onClick={() => impersonateUser(user.id)}
                                  disabled={actionLoading === `impersonate-${user.id}`}
                                  className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 disabled:opacity-50"
                                  title="Impersonate User"
                                >
                                  <LogIn className="h-4 w-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Recent Activity */}
                {/* Recent Activity - Enhanced Version */}
<div>
  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
  <div className="space-y-3 max-h-96 overflow-y-auto">
    {selectedOrg.activityLogs && selectedOrg.activityLogs.length > 0 ? (
      selectedOrg.activityLogs.map((log, index) => {
        // Parse the details JSON
        let details = {};
        try {
          details = typeof log.details === 'string' ? JSON.parse(log.details) : log.details;
        } catch (e) {
          details = {};
        }

        // Get action color based on method
        const getActionColor = (action: string) => {
          if (action.startsWith('POST')) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
          if (action.startsWith('PUT') || action.startsWith('PATCH')) return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
          if (action.startsWith('DELETE')) return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
          if (action.startsWith('GET')) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
          return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
        };

        // Get HTTP method icon
        const getMethodIcon = (action: string) => {
          if (action.startsWith('POST')) return '➕';
          if (action.startsWith('PUT') || action.startsWith('PATCH')) return '✏️';
          if (action.startsWith('DELETE')) return '🗑️';
          if (action.startsWith('GET')) return '👁️';
          return '⚡';
        };

        // Format action text
        const formatAction = (action: string) => {
          return action
            .replace(/_/g, ' ')
            .replace(/\b\w/g, l => l.toUpperCase())
            .replace('Api', 'API');
        };

        // Get status color
        const getStatusColor = (statusCode: number) => {
          if (statusCode >= 200 && statusCode < 300) return 'text-green-600 dark:text-green-400';
          if (statusCode >= 300 && statusCode < 400) return 'text-yellow-600 dark:text-yellow-400';
          if (statusCode >= 400) return 'text-red-600 dark:text-red-400';
          return 'text-gray-600 dark:text-gray-400';
        };

        return (
          <div 
            key={index} 
            className="border border-gray-200 dark:border-gray-600 rounded-lg hover:shadow-md transition-shadow duration-200"
          >
            <div className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{getMethodIcon(log.action)}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getActionColor(log.action)}`}>
                    {formatAction(log.action)}
                  </span>
                  {details.statusCode && (
                    <span className={`text-xs font-mono ${getStatusColor(details.statusCode)}`}>
                      {details.statusCode}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                  {new Date(log.created_at).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                  <br />
                  {new Date(log.created_at).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>

              {/* User Info */}
              <div className="flex items-center mb-3">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-2">
                  <span className="text-xs text-white font-medium">
                    {log.user_name?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300">
                  by <span className="font-medium">{log.user_name}</span>
                </span>
              </div>

              {/* Details */}
              <div className="text-xs bg-gray-50 dark:bg-gray-700/30 rounded p-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-2">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">URL:</span>
                    <span className="ml-1 font-mono text-gray-900 dark:text-gray-200 break-all">
                      {details.url || 'N/A'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Method:</span>
                    <span className="ml-1 font-medium">{details.method || 'N/A'}</span>
                  </div>
                </div>

                {/* Params and Query */}
                {(Object.keys(details.params || {}).length > 0 || Object.keys(details.query || {}).length > 0) && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    {Object.keys(details.params || {}).length > 0 && (
                      <div className="mb-1">
                        <span className="text-gray-500 dark:text-gray-400">Params:</span>
                        <span className="ml-1 text-gray-700 dark:text-gray-300">
                          {Object.entries(details.params || {}).map(([key, value]) => 
                            `${key}=${value}`
                          ).join(', ')}
                        </span>
                      </div>
                    )}
                    {Object.keys(details.query || {}).length > 0 && (
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Query:</span>
                        <span className="ml-1 text-gray-700 dark:text-gray-300">
                          {Object.entries(details.query || {}).map(([key, value]) => 
                            `${key}=${value}`
                          ).join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Body (for POST/PUT requests) */}
                {details.body && Object.keys(details.body).length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <span className="text-gray-500 dark:text-gray-400">Body:</span>
                    <div className="mt-1 text-gray-700 dark:text-gray-300">
                      {Object.entries(details.body).map(([key, value]) => (
                        <div key={key} className="text-xs">
                          <span className="font-medium">{key}:</span> {String(value)}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })
    ) : (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
        <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-400" />
        </div>
        <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-1">No Activity Yet</h4>
        <p className="text-gray-600 dark:text-gray-400">User activity will appear here when they interact with the system</p>
      </div>
    )}
  </div>
</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Organizations;