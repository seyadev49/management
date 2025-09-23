import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';

export interface SearchResult {
  id: number;
  title: string;
  subtitle: string;
  type: 'property' | 'tenant' | 'payment' | 'maintenance' | 'document';
  route: string;
  icon: string;
}

export const useGlobalSearch = () => {
  const { token } = useAuth();
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchData = useCallback(async (query: string): Promise<SearchResult[]> => {
    if (!query.trim() || !token) return [];

    setLoading(true);
    setError(null);

    try {
      const results: SearchResult[] = [];

      // Search Properties
      const propertiesResponse = await fetch('http://localhost:5000/api/properties', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (propertiesResponse.ok) {
        const propertiesData = await propertiesResponse.json();
        const matchingProperties = propertiesData.properties?.filter((property: any) =>
          property.name?.toLowerCase().includes(query.toLowerCase()) ||
          property.address?.toLowerCase().includes(query.toLowerCase()) ||
          property.city?.toLowerCase().includes(query.toLowerCase()) ||
          property.type?.toLowerCase().includes(query.toLowerCase())
        ) || [];

        matchingProperties.forEach((property: any) => {
          results.push({
            id: property.id,
            title: property.name,
            subtitle: `${property.type} • ${property.city}, ${property.subcity || ''}`,
            type: 'property',
            route: '/properties',
            icon: '🏢'
          });
        });
      }

      // Search Tenants
      const tenantsResponse = await fetch('http://localhost:5000/api/tenants', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (tenantsResponse.ok) {
        const tenantsData = await tenantsResponse.json();
        const matchingTenants = tenantsData.tenants?.filter((tenant: any) =>
          tenant.full_name?.toLowerCase().includes(query.toLowerCase()) ||
          tenant.tenant_id?.toLowerCase().includes(query.toLowerCase()) ||
          tenant.phone?.includes(query) ||
          tenant.city?.toLowerCase().includes(query.toLowerCase())
        ) || [];

        matchingTenants.forEach((tenant: any) => {
          results.push({
            id: tenant.id,
            title: tenant.full_name,
            subtitle: `ID: ${tenant.tenant_id} • ${tenant.city}, ${tenant.subcity || ''}`,
            type: 'tenant',
            route: '/tenants',
            icon: '👤'
          });
        });
      }

      // Search Payments
      const paymentsResponse = await fetch('http://localhost:5000/api/payments', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        const matchingPayments = paymentsData.payments?.filter((payment: any) =>
          payment.tenant_name?.toLowerCase().includes(query.toLowerCase()) ||
          payment.property_name?.toLowerCase().includes(query.toLowerCase()) ||
          payment.payment_type?.toLowerCase().includes(query.toLowerCase())
        ) || [];

        matchingPayments.slice(0, 5).forEach((payment: any) => {
          results.push({
            id: payment.id,
            title: `Payment - ${payment.tenant_name}`,
            subtitle: `$${payment.amount} • ${payment.property_name} • ${payment.status}`,
            type: 'payment',
            route: '/payments',
            icon: '💳'
          });
        });
      }

      // Search Maintenance Requests
      const maintenanceResponse = await fetch('http://localhost:5000/api/maintenance', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (maintenanceResponse.ok) {
        const maintenanceData = await maintenanceResponse.json();
        const matchingMaintenance = maintenanceData.requests?.filter((request: any) =>
          request.title?.toLowerCase().includes(query.toLowerCase()) ||
          request.description?.toLowerCase().includes(query.toLowerCase()) ||
          request.property_name?.toLowerCase().includes(query.toLowerCase())
        ) || [];

        matchingMaintenance.slice(0, 5).forEach((request: any) => {
          results.push({
            id: request.id,
            title: request.title,
            subtitle: `${request.property_name} • ${request.priority} priority • ${request.status}`,
            type: 'maintenance',
            route: '/maintenance',
            icon: '🔧'
          });
        });
      }

      // Search Documents
      const documentsResponse = await fetch('http://localhost:5000/api/documents', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (documentsResponse.ok) {
        const documentsData = await documentsResponse.json();
        const matchingDocuments = documentsData.documents?.filter((document: any) =>
          document.document_name?.toLowerCase().includes(query.toLowerCase()) ||
          document.entity_type?.toLowerCase().includes(query.toLowerCase())
        ) || [];

        matchingDocuments.slice(0, 5).forEach((document: any) => {
          results.push({
            id: document.id,
            title: document.document_name,
            subtitle: `${document.entity_type} document • ${document.document_type}`,
            type: 'document',
            route: '/documents',
            icon: '📄'
          });
        });
      }

      return results.slice(0, 10); // Limit to 10 results
    } catch (error) {
      console.error('Search error:', error);
      setError('Search failed. Please try again.');
      return [];
    } finally {
      setLoading(false);
    }
  }, [token]);

  const performSearch = useCallback(async (query: string) => {
    const results = await searchData(query);
    setSearchResults(results);
  }, [searchData]);

  const clearSearch = useCallback(() => {
    setSearchResults([]);
    setError(null);
  }, []);

  return {
    searchResults,
    loading,
    error,
    performSearch,
    clearSearch
  };
};