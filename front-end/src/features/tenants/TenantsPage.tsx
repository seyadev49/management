import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Plus } from 'lucide-react';
import { Tenant } from './types';
import { TenantCard } from './components/TenantCard';
import { TenantFormModal } from './components/TenantFormModal';
import { TerminateTenantModal } from './components/TerminateTenantModal';
import { TenantDetailsModal } from './components/TenantDetailsModal';
import { useApiWithLimitCheck } from '../../hooks/useApiWithLimitCheck';

const TenantsPage: React.FC = () => {
  const { token } = useAuth();
  const { apiCall } = useApiWithLimitCheck();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [terminatedTenants, setTerminatedTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false)
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [terminatingTenant, setTerminatingTenant] = useState<Tenant | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'terminated'>('active');
  const [formData, setFormData] = useState({
    tenantId: '',
    fullName: '',
    sex: 'Male',
    phone: '',
    city: '',
    subcity: '',
    woreda: '',
    houseNo: '',
    organization: '',
    hasAgent: false,
    agentFullName: '',
    agentSex: 'Male',
    agentPhone: '',
    agentCity: '',
    agentSubcity: '',
    agentWoreda: '',
    agentHouseNo: '',
    authenticationNo: '',
    authenticationDate: '',
  });
  const [terminationFormData, setTerminationFormData] = useState({
    terminationDate: new Date().toISOString().split('T')[0],
    terminationReason: '',
    securityDepositAction: 'return_full',
    partialReturnAmount: '',
    deductions: [] as Array<{ description: string; amount: number }>,
    notes: '',
  });

  useEffect(() => {
    fetchTenants();
    fetchTerminatedTenants();
  }, [token]);

  const fetchTenants = async () => {
    try {
      const response = await apiCall(
        () => fetch('http://localhost:5000/api/tenants', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        'tenants'
      );
      if (response && response.tenants) {
        setTenants(response.tenants);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTerminatedTenants = async () => {
    try {
      const response = await apiCall(
        () => fetch('http://localhost:5000/api/tenants/terminated', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        'tenants'
      );
      if (response && response.tenants) {
        setTerminatedTenants(response.tenants || []);
      }
    } catch (error) {
      console.error('Failed to fetch terminated tenants:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTenant 
        ? `http://localhost:5000/api/tenants/${editingTenant.id}`
        : 'http://localhost:5000/api/tenants';
      const method = editingTenant ? 'PUT' : 'POST';
      
      const response = await apiCall(
        () => fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(formData),
        }),
        'tenants'
      );
      
      if (response && response.tenant) {
        setShowAddModal(false);
        setEditingTenant(null);
        resetForm();
        fetchTenants();
      }
    } catch (error) {
      console.error('Failed to save tenant:', error);
      alert("Failed to save tenant")
    }
  };

  const resetForm = () => {
    setFormData({
      tenantId: '',
      fullName: '',
      sex: 'Male',
      phone: '',
      city: '',
      subcity: '',
      woreda: '',
      houseNo: '',
      organization: '',
      hasAgent: false,
      agentFullName: '',
      agentSex: 'Male',
      agentPhone: '',
      agentCity: '',
      agentSubcity: '',
      agentWoreda: '',
      agentHouseNo: '',
      authenticationNo: '',
      authenticationDate: '',
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleEdit = (tenant: Tenant) => {
    setEditingTenant(tenant);
    setFormData({
      tenantId: tenant.tenant_id || '',
      fullName: tenant.full_name || '',
      sex: tenant.sex || 'Male',
      phone: tenant.phone || '',
      city: tenant.city || '',
      subcity: tenant.subcity || '',
      woreda: tenant.woreda || '',
      houseNo: tenant.house_no || '',
      organization: tenant.organization || '',
      hasAgent: tenant.has_agent || false,
      agentFullName: tenant.agent_full_name || '',
      agentSex: tenant.agent_sex || 'Male',
      agentPhone: tenant.agent_phone || '',
      agentCity: tenant.agent_city || '',
      agentSubcity: tenant.agent_subcity || '',
      agentWoreda: tenant.agent_woreda || '',
      agentHouseNo: tenant.agent_house_no || '',
      authenticationNo: tenant.authentication_no || '',
      authenticationDate: tenant.authentication_date || '',
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Are you sure you want to delete this tenant?')) {
      try {
        const response = await apiCall(
          () => fetch(`http://localhost:5000/api/tenants/${id}`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          'tenants'
        );
        
        if (response && response.success) {
          fetchTenants();
        }
      } catch (error) {
        console.error('Failed to delete tenant:', error);
      }
    }
  };

  const handleTerminate = (tenant: Tenant) => {
    setTerminatingTenant(tenant);
    setShowTerminateModal(true);
  };

  const handleTerminationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminatingTenant) return;
    try {
      const response = await apiCall(
        () => fetch(`http://localhost:5000/api/tenants/${terminatingTenant.id}/terminate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(terminationFormData),
        }),
        'tenants'
      );
      
      if (response && response.tenant) {
        setShowTerminateModal(false);
        setTerminatingTenant(null);
        setTerminationFormData({
          terminationDate: new Date().toISOString().split('T')[0],
          terminationReason: '',
          securityDepositAction: 'return_full',
          partialReturnAmount: '',
          deductions: [],
          notes: '',
        });
        fetchTenants();
        fetchTerminatedTenants();
      }
    } catch (error) {
      console.error('Failed to terminate tenant:', error);
    }
  };

  const addDeduction = () => {
    setTerminationFormData({
      ...terminationFormData,
      deductions: [...terminationFormData.deductions, { description: '', amount: 0 }],
    });
  };
  const removeDeduction = (index: number) => {
    setTerminationFormData({
      ...terminationFormData,
      deductions: terminationFormData.deductions.filter((_, i) => i !== index),
    });
  };
  const updateDeduction = (index: number, field: 'description' | 'amount', value: string | number) => {
    const updatedDeductions = [...terminationFormData.deductions];
    updatedDeductions[index] = { ...updatedDeductions[index], [field]: value };
    setTerminationFormData({ ...terminationFormData, deductions: updatedDeductions });
  };

  const openTenantModal = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowTenantModal(true);
  };

  const filteredTenants = tenants.filter(
    (tenant) =>
      tenant.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.tenant_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone?.includes(searchTerm) ||
      tenant.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const filteredTerminatedTenants = terminatedTenants.filter(
    (tenant) =>
      tenant.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.tenant_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.phone?.includes(searchTerm) ||
      tenant.city?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Tenants</h1>
          <p className="text-gray-600 dark:text-gray-400">Manage your tenant information</p>
        </div>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search tenants..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-100 w-full sm:w-64"
          />
          <button
            onClick={() => {
              setShowAddModal(true);
              setEditingTenant(null);
            }}
            className="flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 dark:bg-blue-700 dark:hover:bg-blue-600 w-full sm:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </button>
        </div>
      </div>
      {/* Tab Switcher */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('active')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'active'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Active Tenants ({filteredTenants.length})
          </button>
          <button
            onClick={() => setActiveTab('terminated')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'terminated'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Terminated Tenants ({filteredTerminatedTenants.length})
          </button>
        </nav>
      </div>
      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {activeTab === 'active'
          ? filteredTenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                activeTab={activeTab}
                openTenantModal={openTenantModal}
                handleEdit={handleEdit}
                handleTerminate={handleTerminate}
              />
            ))
          : filteredTerminatedTenants.map((tenant) => (
              <TenantCard
                key={tenant.id}
                tenant={tenant}
                activeTab={activeTab}
                openTenantModal={openTenantModal}
                handleEdit={handleEdit}
                handleTerminate={handleTerminate}
              />
            ))}
      </div>
      {((activeTab === 'active' && filteredTenants.length === 0) ||
        (activeTab === 'terminated' && filteredTerminatedTenants.length === 0)) && (
        <div className="text-center py-12">
          <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
            No {activeTab} tenants found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            {activeTab === 'active'
              ? 'Try adjusting your search or add a new tenant'
              : 'No terminated tenants match your search criteria'}
          </p>
        </div>
      )}
      {/* Details Modal */}
      <TenantDetailsModal
        show={showTenantModal}
        activeTab={activeTab}
        tenant={selectedTenant}
        onClose={() => setShowTenantModal(false)}
        onEdit={handleEdit}
        onTerminate={handleTerminate}
      />

      {/* Terminate Modal */}
      <TerminateTenantModal
        isOpen={showTerminateModal}
        onClose={() => {
          setShowTerminateModal(false);
          setTerminatingTenant(null);
        }}
        onSubmit={handleTerminationSubmit}
        formData={terminationFormData}
        onFormChange={(data) => setTerminationFormData(prev => ({ ...prev, ...data }))}
        tenantName={terminatingTenant?.full_name || ''}
        tenantId={terminatingTenant?.id}
        token={token}
      />
      {/* Add/Edit Modal */}
      <TenantFormModal
        show={showAddModal || editingTenant != null}
        editingTenant={editingTenant}
        formData={formData}
        onClose={() => {
          setShowAddModal(false);
          setEditingTenant(null);
          resetForm();
        }}
        onSubmit={handleSubmit}
        onInputChange={handleInputChange}
      />
    </div>
  );
};

export default TenantsPage;