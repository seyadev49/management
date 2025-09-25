import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Users, Plus } from 'lucide-react';
import { Tenant } from './types';
import { TenantCard } from './components/TenantCard';
import { TenantFormModal } from './components/TenantFormModal';
import { TerminateTenantModal } from './components/TerminateTenantModal';
import { TenantDetailsModal } from './components/TenantDetailsModal';
import { RenewContractModal } from './components/RenewContractModal';
import { ContractHistoryModal } from './components/ContractHistoryModal';
import { useApiWithLimitCheck } from '../../hooks/useApiWithLimitCheck';
import toast from 'react-hot-toast';

const TenantsPage: React.FC = () => {
  const { token } = useAuth();
  const { apiCall } = useApiWithLimitCheck();

  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [terminatedTenants, setTerminatedTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [showTerminateModal, setShowTerminateModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [terminatingTenant, setTerminatingTenant] = useState<Tenant | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [renewingTenant, setRenewingTenant] = useState<Tenant | null>(null);

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

  const [renewalFormData, setRenewalFormData] = useState({
    newEndDate: '',
    monthlyRent: '',
    deposit: '',
    leaseDuration: '12',
    notes: '',
  });

  // ✅ SMART HELPER: Detect if tenant is terminated (handles multiple field names)
  const isTenantTerminated = (tenant: Tenant): boolean => {
    return !!(tenant.termination_date || tenant.terminated_at || tenant.endDate || tenant.status === 'terminated');
  };

  const isTenantActive = (tenant: Tenant): boolean => {
    return !isTenantTerminated(tenant);
  };

  // ✅ FETCH ACTIVE TENANTS — filter out any terminated ones
  const fetchTenants = useCallback(async () => {
    try {
      const response = await apiCall(
        () => fetch('http://localhost:5000/api/tenants', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        'tenants'
      );
      if (response && response.tenants) {
        const activeOnly = response.tenants.filter(isTenantActive);
        setTenants(activeOnly);
      } else {
        setTenants([]);
      }
    } catch (error) {
      console.error('Failed to fetch tenants:', error);
      toast.error('❌ Failed to load active tenants');
      setTenants([]);
    } finally {
      setLoading(false);
    }
  }, [token, apiCall]);

  // ✅ FETCH TERMINATED TENANTS — ensure only terminated
  const fetchTerminatedTenants = useCallback(async () => {
    try {
      const response = await apiCall(
        () => fetch('http://localhost:5000/api/tenants/terminated', {
          headers: { Authorization: `Bearer ${token}` },
        }),
        'tenants'
      );
      if (response && response.tenants) {
        const terminatedOnly = response.tenants.filter(isTenantTerminated);
        setTerminatedTenants(terminatedOnly);
      } else {
        setTerminatedTenants([]);
      }
    } catch (error) {
      console.error('Failed to fetch terminated tenants:', error);
      toast.error('❌ Failed to load terminated tenants');
      setTerminatedTenants([]);
    } finally {
      setLoading(false);
    }
  }, [token, apiCall]);

  useEffect(() => {
    // Fetch both active and terminated tenants to get accurate counts
    const fetchAllTenants = async () => {
      setLoading(true);
      try {
        await Promise.all([fetchTenants(), fetchTerminatedTenants()]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchAllTenants();
  }, [fetchTenants, fetchTerminatedTenants]);

  // 🚨 DEBUG: Log tenant data in dev mode
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('🔍 [DEBUG] Active Tenants Raw:', tenants);
      console.log('🔍 [DEBUG] Terminated Tenants Raw:', terminatedTenants);
    }
  }, [tenants, terminatedTenants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

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

      if (response && (response.tenant || response.message?.includes("successfully"))) {
        toast.success(editingTenant ? '✅ Tenant updated successfully!' : '✅ Tenant added successfully!');
        setShowAddModal(false);
        setEditingTenant(null);
        resetForm();
        fetchTenants();
      } else {
        throw new Error(response?.message || 'Failed to save tenant');
      }
    } catch (error: any) {
      console.error('Failed to save tenant:', error);
      toast.error('❌ ' + (error.message || 'Failed to save tenant'));
    } finally {
      setFormLoading(false);
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
      setFormLoading(true);
      try {
        const response = await apiCall(
          () => fetch(`http://localhost:5000/api/tenants/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
          }),
          'tenants'
        );

        if (response && (response.success || response.message?.includes("successfully"))) {
          toast.success('✅ Tenant deleted successfully!');
          fetchTenants();
          fetchTerminatedTenants();
        } else {
          throw new Error(response?.message || 'Failed to delete tenant');
        }
      } catch (error: any) {
        console.error('Failed to delete tenant:', error);
        toast.error('❌ ' + (error.message || 'Failed to delete tenant'));
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleTerminate = (tenant: Tenant) => {
    setTerminatingTenant(tenant);
    setShowTerminateModal(true);
  };

  const handleRenew = (tenant: Tenant) => {
    setRenewingTenant(tenant);
    setRenewalFormData({
      newEndDate: '',
      monthlyRent: tenant.monthly_rent?.toString() || '',
      deposit: '',
      leaseDuration: '12',
      notes: '',
    });
    setShowRenewModal(true);
  };

  const handleViewHistory = (tenant: Tenant) => {
    setSelectedTenant(tenant);
    setShowHistoryModal(true);
  };

  const handleTerminationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminatingTenant) return;
    setFormLoading(true);

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

      if (response && (response.tenant || response.message?.includes("successfully"))) {
        toast.success('✅ Tenant terminated successfully!');

        // ✅ Remove from active list
        setTenants(prev => prev.filter(t => t.id !== terminatingTenant.id));
        // ✅ Add to terminated list
        setTerminatedTenants(prev => {
          if (!prev.some(t => t.id === terminatingTenant.id)) {
            return [...prev, { ...terminatingTenant, termination_date: terminationFormData.terminationDate }];
          }
          return prev;
        });

        setShowTerminateModal(false);
        setTerminatingTenant(null);
        resetTerminationForm();
      } else {
        throw new Error(response?.message || 'Failed to terminate tenant');
      }
    } catch (error: any) {
      console.error('Failed to terminate tenant:', error);
      toast.error('❌ ' + (error.message || 'Failed to terminate tenant'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!renewingTenant) return;
    setFormLoading(true);

    try {
      const response = await apiCall(
        () => fetch(`http://localhost:5000/api/tenants/${renewingTenant.id}/renew`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(renewalFormData),
        }),
        'tenants'
      );

      if (response && (response.renewalDetails || response.message?.includes("successfully"))) {
        toast.success('✅ Contract renewed successfully!');
        setShowRenewModal(false);
        setRenewingTenant(null);
        resetRenewalForm();
        fetchTenants(); // Refresh to get updated contract dates
      } else {
        throw new Error(response?.message || 'Failed to renew contract');
      }
    } catch (error: any) {
      console.error('Failed to renew contract:', error);
      toast.error('❌ ' + (error.message || 'Failed to renew contract'));
    } finally {
      setFormLoading(false);
    }
  };

  const resetTerminationForm = () => {
    setTerminationFormData({
      terminationDate: new Date().toISOString().split('T')[0],
      terminationReason: '',
      securityDepositAction: 'return_full',
      partialReturnAmount: '',
      deductions: [],
      notes: '',
    });
  };

  const resetRenewalForm = () => {
    setRenewalFormData({
      newEndDate: '',
      monthlyRent: '',
      deposit: '',
      leaseDuration: '12',
      notes: '',
    });
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
      tenant.full_name?.toLowerCase().includes(searchTerm.