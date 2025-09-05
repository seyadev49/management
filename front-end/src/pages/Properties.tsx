import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Plus, Building2 } from 'lucide-react';
import { Property, Unit, Tenant } from '../features/properties/types';
import { PropertyFormModal } from '../features/properties/components/PropertyFormModal';
import { AddUnitModal } from '../features/properties/components/AddUnitModal';
import { UnitsModal } from '../features/properties/components/UnitsModal';
import { PropertyCard } from '../features/properties/components/PropertyCard';
import { ContractFormModal } from '../features/properties/components/ContractFormModal';

const API_BASE_URL = 'http://localhost:5000/api';

const Properties: React.FC = () => {
    const { token } = useAuth();

    // Component State
    const [properties, setProperties] = useState<Property[]>([]);
    const [propertyUnits, setPropertyUnits] = useState<Unit[]>([]);
    const [availableUnits, setAvailableUnits] = useState<Unit[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
    const [loading, setLoading] = useState(true);
    const [formLoading, setFormLoading] = useState(false);
    const [isUnitsLoading, setIsUnitsLoading] = useState(false);

    // Modal Visibility State
    const [isPropertyModalOpen, setPropertyModalOpen] = useState(false);
    const [isUnitModalOpen, setUnitModalOpen] = useState(false);
    const [isUnitsViewerModalOpen, setUnitsViewerModalOpen] = useState(false);
    const [isContractModalOpen, setContractModalOpen] = useState(false);
    const [isEditingUnit, setIsEditingUnit] = useState(false); // Track if we're editing an existing unit

    // Add this state to your Properties component
const [contractError, setContractError] = useState<string | null>(null);


    const [error, setError] = useState<string | null>(null);
    // Form Data State
    const initialPropertyFormData = { 
        name: '', 
        type: 'apartment', 
        address: '', 
        city: '', 
        subcity: '', 
        woreda: '', 
        description: '' 
    };
    const [propertyFormData, setPropertyFormData] = useState(initialPropertyFormData);

    const initialUnitFormData = {
        id: '',
        propertyId: '', 
        unitNumber: '', 
        floorNumber: '', 
        roomCount: '', 
        monthlyRent: '', 
        deposit: '' 
    };
    const [unitFormData, setUnitFormData] = useState(initialUnitFormData);

    const initialContractFormData = {
        propertyId: '', 
        unitId: '', 
        tenantId: '', 
        leaseDuration: 12, 
        contractStartDate: new Date().toISOString().split('T')[0], 
        contractEndDate: '',
        monthlyRent: '', 
        deposit: '', 
        paymentTerm: 1, 
        rentStartDate: new Date().toISOString().split('T')[0], 
        rentEndDate: '',
        eeuPayment: 0, 
        waterPayment: 0, 
        generatorPayment: 0,
    };
    const [contractFormData, setContractFormData] = useState(initialContractFormData);

    // Data Fetching
    const fetchProperties = useCallback(async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_BASE_URL}/properties`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            if (response.ok) {
                const data = await response.json();
                setProperties(data.properties);
            }
        } catch (error) {
            console.error('Failed to fetch properties:', error);
        } finally {
            setLoading(false);
        }
    }, [token]);

    const fetchTenants = useCallback(async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/tenants`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            if (response.ok) {
                const data = await response.json();
                setTenants(data.tenants);
            }
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        }
    }, [token]);

    const fetchPropertyUnits = async (propertyId: number) => {
        try {
            setIsUnitsLoading(true);
            const response = await fetch(`${API_BASE_URL}/units?propertyId=${propertyId}`, { 
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                } 
            });
            
            if (response.ok) {
                const data = await response.json();
               
                setPropertyUnits(data.units || []);
            } else {
                console.log('API Error Response:', await response.text());
                setPropertyUnits([]);
            }
        } catch (error) {
            console.error('Failed to fetch property units:', error);
            setPropertyUnits([]);
        } finally {
            setIsUnitsLoading(false);
        }
    };

    const fetchAvailableUnits = async (propertyId: number) => {
        try {
            const response = await fetch(`${API_BASE_URL}/units?propertyId=${propertyId}`, { 
                headers: { Authorization: `Bearer ${token}` } 
            });
            if (response.ok) {
                const data = await response.json();
                const vacantUnits = data.units?.filter((unit: Unit) => !unit.is_occupied) || [];
                setAvailableUnits(vacantUnits);
            }
        } catch (error) {
            console.error('Failed to fetch available units:', error);
        }
    };
    
    useEffect(() => {
        fetchProperties();
        fetchTenants();
    }, [fetchProperties, fetchTenants]);

    // Handlers
    const handleOpenPropertyForm = (property: Property | null) => {
        setSelectedProperty(property);
        setPropertyFormData(property ? { 
            ...property, 
            woreda: property.woreda || '', 
            description: property.description || '' 
        } : initialPropertyFormData);
        setPropertyModalOpen(true);
    };

    const handlePropertySubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        const url = selectedProperty ? `${API_BASE_URL}/properties/${selectedProperty.id}` : `${API_BASE_URL}/properties`;
        const method = selectedProperty ? 'PUT' : 'POST';

        try {
            const response = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json', 
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify(propertyFormData),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Property saved:', data);
                fetchProperties();
                setPropertyModalOpen(false);
            } else {
                const errorData = await response.json();
                console.error('Failed to save property:', errorData);
            }
        } catch (error) {
            console.error('Failed to save property:', error);
        } finally {
            setFormLoading(false);
        }
    };

    const handleViewUnits = async (property: Property) => {
        setSelectedProperty(property);
        await fetchPropertyUnits(property.id);
        setUnitsViewerModalOpen(true);
       
    };
    
    const handleAddUnit = (property: Property, unitToEdit?: Unit) => {
        setSelectedProperty(property);
        
        if (unitToEdit) {
            // Editing an existing unit
            setIsEditingUnit(true);
            setUnitFormData({
                id: unitToEdit.id.toString(),
                propertyId: property.id.toString(),
                unitNumber: unitToEdit.unit_number,
                floorNumber: unitToEdit.floor_number?.toString() || '',
                roomCount: unitToEdit.room_count?.toString() || '',
                monthlyRent: unitToEdit.monthly_rent.toString(),
                deposit: unitToEdit.deposit.toString(),
            });
        } else {
            // Adding a new unit
            setIsEditingUnit(false);
            setUnitFormData({
                id: '',
                propertyId: property.id.toString(),
                unitNumber: '',
                floorNumber: '',
                roomCount: '',
                monthlyRent: '',
                deposit: '',
            });
        }
        
        setUnitModalOpen(true);
    };
    
    const handleUnitSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormLoading(true);
        try {
            const url = isEditingUnit 
                ? `${API_BASE_URL}/units/${unitFormData.id}` 
                : `${API_BASE_URL}/units`;
            const method = isEditingUnit ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: { 
                    'Content-Type': 'application/json', 
                    Authorization: `Bearer ${token}` 
                },
                body: JSON.stringify({
                    ...unitFormData,
                    floorNumber: unitFormData.floorNumber ? parseInt(unitFormData.floorNumber, 10) : null,
                    roomCount: unitFormData.roomCount ? parseInt(unitFormData.roomCount, 10) : null,
                    monthlyRent: parseFloat(unitFormData.monthlyRent),
                    deposit: parseFloat(unitFormData.deposit),
                }),
            });

            if (response.ok) {
                const data = await response.json();
                console.log('Unit saved:', data);
                setUnitModalOpen(false);
                setIsEditingUnit(false);
                setUnitFormData(initialUnitFormData);
                fetchProperties();
                if (selectedProperty) {
                    fetchPropertyUnits(selectedProperty.id);
                }
            } else {
                const errorData = await response.json();
                console.error('Failed to save unit:', errorData);
            }
        } catch (error) {
            console.error('Failed to save unit:', error);
        } finally {
            setFormLoading(false);
        }
    };

    const handleCreateContract = async (property: Property) => {
        setSelectedProperty(property);
        await fetchAvailableUnits(property.id);
        setContractFormData({ ...initialContractFormData, propertyId: String(property.id) });
        setContractModalOpen(true);
    };

// Update the handleContractSubmit function
const handleContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    try {
        const response = await fetch(`${API_BASE_URL}/contracts`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                Authorization: `Bearer ${token}` 
            },
            body: JSON.stringify(contractFormData),
        });

        if (response.ok) {
            const data = await response.json();
            console.log('Contract created:', data);
            fetchProperties();
            setContractModalOpen(false);
            setContractError(null); // Clear error on success
        } else {
            const errorData = await response.json();
            console.error('Failed to create contract:', errorData);
            // Show error message to user
            setContractError(errorData.message || 'Failed to create contract');
        }
    } catch (error) {
        console.error('Failed to create contract:', error);
        setContractError('Network error occurred');
    } finally {
        setFormLoading(false);
    }
};

    const handleContractInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let newFormData = { ...contractFormData, [name]: value };

        if (name === 'contractStartDate' || name === 'leaseDuration') {
            const startDate = new Date(newFormData.contractStartDate);
            const duration = parseInt(newFormData.leaseDuration as any, 10);
            if (!isNaN(startDate.getTime()) && !isNaN(duration)) {
                const endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + duration);
                newFormData.contractEndDate = endDate.toISOString().split('T')[0];
                newFormData.rentEndDate = newFormData.contractEndDate;
            }
        }

        if (name === 'unitId' && value) {
            const selectedUnit = availableUnits.find(unit => unit.id === parseInt(value));
            if (selectedUnit) {
                newFormData.monthlyRent = selectedUnit.monthly_rent.toString();
                newFormData.deposit = selectedUnit.deposit.toString();
            }
        }

        setContractFormData(newFormData);
    };
    
    // Render Logic
    if (loading) {
        return <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>;
    }

    const handleDelete = async (property: Property) => {
        if (window.confirm(`Are you sure you want to delete ${property.name}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/properties/${property.id}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                
                if (response.ok) {
                    fetchProperties(); // Refresh the list
                } else {
                    const errorData = await response.json();
                    alert(errorData.message || 'Failed to delete property');
                }
            } catch (error) {
                console.error('Delete error:', error);
                alert('Failed to delete property');
            }
        }
    };

    const handleDeleteUnit = async (unit: Unit) => {
        if (window.confirm(`Are you sure you want to delete Unit ${unit.unit_number}?`)) {
            try {
                const response = await fetch(`${API_BASE_URL}/units/${unit.id}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                
                if (response.ok) {
                    // Refresh units list
                    if (selectedProperty) {
                        fetchPropertyUnits(selectedProperty.id);
                    }
                    fetchProperties(); // Also refresh properties to update counts
                } else {
                    const errorData = await response.json();
                    alert(errorData.message || 'Failed to delete unit');
                }
            } catch (error) {
                console.error('Delete unit error:', error);
                alert('Failed to delete unit');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold dark:text-gray-100">Properties</h1>
                    <p className="text-gray-600 dark:text-gray-400">Manage your rental properties</p>
                </div>
                <button 
                    onClick={() => handleOpenPropertyForm(null)} 
                    className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                    <Plus className="h-4 w-4 mr-2" /> Add Property
                </button>
            </div>

            {properties.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {properties.map((prop) => (
                        <PropertyCard
                            key={prop.id}
                            property={prop}
                            onEdit={handleOpenPropertyForm}
                            onViewUnits={handleViewUnits}
                            onAddUnit={(property) => handleAddUnit(property)}
                            onCreateContract={handleCreateContract}
                            onDelete={handleDelete} 
                        />
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium">No properties yet</h3>
                    <p className="text-gray-600 mb-4">Get started by adding your first property</p>
                    <button 
                        onClick={() => handleOpenPropertyForm(null)} 
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        <Plus className="h-4 w-4 mr-2" /> Add Property
                    </button>
                </div>
            )}

            <PropertyFormModal
                isOpen={isPropertyModalOpen}
                onClose={() => {
                    setPropertyModalOpen(false);
                    setSelectedProperty(null);
                }}
                onSubmit={handlePropertySubmit}
                formData={propertyFormData}
                onInputChange={(e) => setPropertyFormData({ ...propertyFormData, [e.target.name]: e.target.value })}
                isEditing={!!selectedProperty}
                isLoading={formLoading}
            />

            {selectedProperty && (
                <>
                    <AddUnitModal
                        isOpen={isUnitModalOpen}
                        onClose={() => {
                            setUnitModalOpen(false);
                            setIsEditingUnit(false);
                            setUnitFormData(initialUnitFormData);
                        }}
                        onSubmit={handleUnitSubmit}
                        formData={unitFormData}
                        onInputChange={(e) => setUnitFormData({ ...unitFormData, [e.target.name]: e.target.value })}
                        propertyName={selectedProperty.name}
                        isEditing={isEditingUnit}
                        isLoading={formLoading}
                    />
                    <UnitsModal
                        isOpen={isUnitsViewerModalOpen}
                        onClose={() => {
                            setUnitsViewerModalOpen(false);
                            setSelectedProperty(null);
                        }}
                        units={propertyUnits}
                        propertyName={selectedProperty.name}
                        onAddUnit={() => {
                            // CRITICAL FIX: Close the Units Viewer Modal first before opening the Add Unit Modal
                            setUnitsViewerModalOpen(false);
                            handleAddUnit(selectedProperty);
                        }}
                        onEditUnit={(unit) => {
                            // Close units viewer modal and open edit unit modal
                            setUnitsViewerModalOpen(false);
                            handleAddUnit(selectedProperty!, unit);
                        }}
                        onDeleteUnit={handleDeleteUnit}
                    />
<ContractFormModal
    isOpen={isContractModalOpen}
    onClose={() => {
        setContractModalOpen(false);
        setSelectedProperty(null);
        setContractError(null); // Clear error when closing
    }}
    onSubmit={handleContractSubmit}
    formData={contractFormData}
    onInputChange={handleContractInputChange}
    propertyName={selectedProperty.name}
    availableUnits={availableUnits}
    tenants={tenants}
    error={contractError} // Pass the error here
/>
                </>
            )}
        </div>
    );
};

export default Properties;