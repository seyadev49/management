// src/pages/Documents.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApiWithLimitCheck } from '../hooks/useApiWithLimitCheck';
import { 
  FileText, 
  Upload, 
  Search, 
  FolderPlus,
  File as FileIcon  // ✅ Import and rename
} from 'lucide-react';
import toast from 'react-hot-toast';
import DocumentTable from '../components/documents/DocumentTable';
import DocumentUploadModal from '../components/documents/DocumentUploadModal';
import { Document, Category } from '../components/documents/types';


const Documents: React.FC = () => {
  const { token } = useAuth();
  const { apiCall } = useApiWithLimitCheck();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateCategory, setShowCreateCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');

  const API_BASE = 'http://localhost:5000';

  // Preview effect
  useEffect(() => {
    if (!previewDocument) {
      setPreviewUrl(null);
      return;
    }

    const loadPreview = async () => {
      try {
        const response = await fetch(`${API_BASE}/api/documents/download/${previewDocument.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) throw new Error('Failed to load preview');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        setPreviewUrl(url);
      } catch (error) {
        console.error('Preview load error:', error);
        toast.error('Failed to load preview. You can download the file instead.');
        setPreviewDocument(null);
      }
    };

    loadPreview();

    return () => {
      if (previewUrl) window.URL.revokeObjectURL(previewUrl);
    };
  }, [previewDocument, token, API_BASE]);

  const fetchDocuments = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (selectedCategory !== 'all') params.append('categoryId', selectedCategory);
      if (selectedEntityType !== 'all') params.append('entityType', selectedEntityType);

      const response = await fetch(`${API_BASE}/api/documents?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents);
      }
    } catch (error) {
      console.error('Failed to fetch documents:', error);
      toast.error('Failed to load documents');
    }
  }, [token, searchTerm, selectedCategory, selectedEntityType, API_BASE]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/documents/categories`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      toast.error('Failed to load categories');
    }
  }, [token, API_BASE]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDocuments(), fetchCategories()]).finally(() => setLoading(false));
  }, [fetchDocuments, fetchCategories]);

  const handleUpload = async (formData: FormData) => {
    setUploading(true);
    try {
      const uploadFn = async () => {
        const response = await fetch(`${API_BASE}/api/documents/upload`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw { response: { status: response.status, data: errorData } };
        }
        return response.json();
      };

      const result = await apiCall(uploadFn, 'documents');
      if (result) {
        toast.success('Document uploaded successfully!');
        fetchDocuments();
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      const message = error?.response?.data?.message || 'Upload failed. Please try again.';
      toast.error(message);
      throw error; // Re-throw to prevent modal close
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    setDeletingId(id);
    try {
      const deleteFn = async () => {
        const response = await fetch(`${API_BASE}/api/documents/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('Delete failed');
        return response.json();
      };
      await apiCall(deleteFn, 'documents');
      toast.success('Document deleted successfully!');
      fetchDocuments();
    } catch (error) {
      console.error('Delete failed:', error);
      toast.error('Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDownload = async (id: number, fileName: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/documents/download/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Download started!');
      } else {
        throw new Error('Download failed');
      }
    } catch (error) {
      console.error('Download failed:', error);
      toast.error('Failed to download document');
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/api/documents/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCategoryName.trim() }),
      });

      if (response.ok) {
        const newCat = await response.json();
        setCategories(prev => [...prev, newCat]);
        setShowCreateCategory(false);
        setNewCategoryName('');
        toast.success('Category created!');
      } else {
        const err = await response.json();
        toast.error(err.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Create category error:', error);
      toast.error('Failed to create category');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
  <div className="flex flex-col lg:flex-row gap-6 min-w-0">
    {/* Sidebar */}
    <div className="w-full lg:w-64 flex-shrink-0">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 overflow-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white truncate">Categories</h2>
          <button 
            onClick={() => setShowCreateCategory(true)}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 flex-shrink-0"
          >
            <FolderPlus className="h-4 w-4" />
          </button>
        </div>
        
        <button
          onClick={() => setSelectedCategory('all')}
          className={`w-full text-left px-3 py-2 rounded mb-1 ${
            selectedCategory === 'all' 
              ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' 
              : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
          } whitespace-nowrap`}
        >
          All Documents
        </button>
        
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id.toString())}
            className={`w-full text-left px-3 py-2 rounded mb-1 flex items-center ${
              selectedCategory === cat.id.toString()
                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <FileIcon className="h-4 w-4 mr-2 opacity-70 flex-shrink-0" />
            <span className="truncate">{cat.name}</span>
          </button>
        ))}
      </div>
    </div>

    {/* Main Content */}
    <div className="flex-1 min-w-0">
      {/* Header & Filters */}
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 min-w-0">
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white truncate">Documents</h1>
            <p className="text-gray-600 dark:text-gray-400 truncate">Manage all your important files</p>
          </div>
          <div className="flex-shrink-0">
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Upload className="h-4 w-4 mr-2 flex-shrink-0" />
              Upload Document
            </button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Document name or type..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
              </div>
            </div>
            
            <div className="min-w-0">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Entity Type</label>
              <select
                value={selectedEntityType}
                onChange={(e) => setSelectedEntityType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                <option value="all">All Entities</option>
                <option value="property">Property</option>
                <option value="tenant">Tenant</option>
                <option value="contract">Contract</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-auto min-w-0">
        {documents.length > 0 ? (
          <DocumentTable
            documents={documents}
            deletingId={deletingId}
            onPreview={setPreviewDocument}
            onDownload={handleDownload}
            onDelete={handleDelete}
          />
        ) : (
          <div className="text-center py-12 min-w-0">
            <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4 truncate">
              {searchTerm || selectedCategory !== 'all' || selectedEntityType !== 'all'
                ? "Try adjusting your filters"
                : "Upload your first document to get started"}
            </p>
            <button
              onClick={() => setShowUploadModal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors whitespace-nowrap"
            >
              <Upload className="h-4 w-4 mr-2 flex-shrink-0" />
              Upload Document
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Upload Modal */}
    <DocumentUploadModal
      isOpen={showUploadModal}
      onClose={() => setShowUploadModal(false)}
      categories={categories}
      currentCategoryId={selectedCategory === 'all' ? null : selectedCategory}
      onUpload={handleUpload}
      isUploading={uploading}
    />

    {/* Create Category Modal */}
    {showCreateCategory && (
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-md p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Create New Category</h3>
          <form onSubmit={handleCreateCategory}>
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              placeholder="e.g., Meeting Notes, Insurance"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-4"
              required
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowCreateCategory(false)}
                className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Create
              </button>
            </div>
          </form>
        </div>
      </div>
    )}

    {/* Preview Modal */}
    {previewDocument && (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4 overflow-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="font-medium text-gray-900 dark:text-white truncate">{previewDocument.document_name}</h3>
            <button 
              onClick={() => setPreviewDocument(null)}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
          <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900 flex items-center justify-center min-w-0">
            {previewDocument.document_type.includes('pdf') ? (
              previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="w-full h-full min-h-[500px] border-0"
                  title="PDF Preview"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-600 rounded-full mb-2"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading preview...</p>
                </div>
              )
            ) : previewDocument.document_type.includes('image') ? (
              previewUrl ? (
                <img
                  src={previewUrl}
                  alt={previewDocument.document_name}
                  className="max-w-full max-h-full object-contain"
                />
              ) : (
                <div className="flex flex-col items-center">
                  <div className="animate-spin h-8 w-8 border-2 border-blue-600 rounded-full mb-2"></div>
                  <p className="text-gray-600 dark:text-gray-400">Loading image...</p>
                </div>
              )
            ) : previewDocument.document_type.includes('text') ? (
              <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-800 p-4 rounded max-w-full overflow-auto">
                Text preview not implemented
              </pre>
            ) : (
              <div className="text-center py-10 text-gray-500">
                Preview not available for this file type
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </div>
);

};

export default Documents;