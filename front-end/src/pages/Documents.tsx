// Documents.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useApiWithLimitCheck } from '../hooks/useApiWithLimitCheck';
import { 
  FileText, Upload, Download, Trash2, Search, FolderPlus, Eye, 
  File, FileImage, FileText as FileTextIcon, FileAudio, FileVideo 
} from 'lucide-react';

interface Document {
  id: number;
  document_name: string;
  document_type: string;
  entity_type: string | null;
  entity_id: number | null;
  file_size: number;
  uploaded_by_name: string;
  created_at: string;
  category_name: string;
}

interface Category {
  id: number;
  name: string;
  is_system: boolean;
}

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

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedEntityType, setSelectedEntityType] = useState<string>('all');

  const API_BASE = 'http://localhost:5000';

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
    }
  }, [token, API_BASE]);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchDocuments(), fetchCategories()]).finally(() => setLoading(false));
  }, [fetchDocuments, fetchCategories]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);

    if (!formData.get('file')) {
      alert('Please select a file');
      return;
    }

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
        setShowUploadModal(false);
        form.reset();
        fetchDocuments();
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      alert(error?.response?.data?.message || 'Upload failed. Please try again.');
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
      fetchDocuments();
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Failed to delete document');
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
      }
    } catch (error) {
      console.error('Download failed:', error);
      alert('Failed to download document');
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
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('Create category error:', error);
      alert('Failed to create category');
    }
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileTextIcon className="h-5 w-5 text-red-500" />;
    if (type.includes('image')) return <FileImage className="h-5 w-5 text-green-500" />;
    if (type.includes('word') || type.includes('document')) return <File className="h-5 w-5 text-blue-500" />;
    if (type.includes('sheet') || type.includes('excel')) return <File className="h-5 w-5 text-green-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const canPreview = (type: string) => {
    return type.includes('pdf') || type.includes('image') || type.includes('text');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Sidebar */}
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="font-semibold text-gray-900 dark:text-white">Categories</h2>
            <button 
              onClick={() => setShowCreateCategory(true)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400"
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
            }`}
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
              <File className="h-4 w-4 mr-2 opacity-70" />
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1">
        {/* Header & Filters */}
        <div className="space-y-4 mb-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Documents</h1>
              <p className="text-gray-600 dark:text-gray-400">Manage all your important files</p>
            </div>
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Document
            </button>
          </div>

          {/* Search & Filters */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
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
              
              <div>
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {documents.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Document</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Size</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Uploaded By</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <span className="mr-3">{getFileIcon(doc.document_type)}</span>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {doc.document_name}
                            </div>
                            {doc.entity_type && (
                              <div className="text-sm text-gray-500 dark:text-gray-400">
                                {doc.entity_type} #{doc.entity_id}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200 rounded-full">
                          {doc.category_name}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {formatFileSize(doc.file_size)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {doc.uploaded_by_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end space-x-2">
                          {canPreview(doc.document_type) && (
                            <button
                              onClick={() => setPreviewDocument(doc)}
                              className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300"
                              title="Preview"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(doc.id, doc.document_name)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                            title="Download"
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(doc.id)}
                            disabled={deletingId === doc.id}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
                            title="Delete"
                          >
                            {deletingId === doc.id ? (
                              <div className="animate-spin h-4 w-4 border-2 border-red-500 rounded-full border-t-transparent"></div>
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No documents found</h3>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                {searchTerm || selectedCategory !== 'all' || selectedEntityType !== 'all'
                  ? "Try adjusting your filters"
                  : "Upload your first document to get started"}
              </p>
              <button
                onClick={() => setShowUploadModal(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Document
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleUpload} className="p-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Upload Document</h3>
              
              <div className="space-y-4">
                {/* Drag & Drop Area */}
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    name="file"
                    required
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.txt,.xlsx,.xls"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-600 dark:text-gray-300">
                      <span className="text-blue-600 dark:text-blue-400 font-medium">Click to upload</span> or drag and drop
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">PDF, DOC, XLS, JPG, PNG (max. 10MB)</p>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Document Name
                  </label>
                  <input
                    type="text"
                    name="documentName"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Auto-filled from file name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    name="categoryId"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  >
                    <option value="">Uncategorized</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Related To
                    </label>
                    <select
                      name="entityType"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    >
                      <option value="">None</option>
                      <option value="property">Property</option>
                      <option value="tenant">Tenant</option>
                      <option value="contract">Contract</option>
                      <option value="maintenance">Maintenance</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Entity ID
                    </label>
                    <input
                      type="number"
                      name="entityId"
                      min="1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                      placeholder="e.g., 123"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-70 flex items-center"
                >
                  {uploading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white rounded-full border-t-transparent mr-2"></div>
                      Uploading...
                    </>
                  ) : (
                    'Upload'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        <div className="fixed inset-0 z-50 bg-black bg-opacity-75 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="font-medium text-gray-900 dark:text-white">{previewDocument.document_name}</h3>
              <button 
                onClick={() => setPreviewDocument(null)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 bg-gray-50 dark:bg-gray-900">
              {previewDocument.document_type.includes('pdf') ? (
                <iframe
                  src={`${API_BASE}/api/documents/download/${previewDocument.id}`}
                  className="w-full h-full min-h-[500px]"
                  title="PDF Preview"
                />
              ) : previewDocument.document_type.includes('image') ? (
                <img
                  src={`${API_BASE}/api/documents/download/${previewDocument.id}`}
                  alt={previewDocument.document_name}
                  className="max-w-full max-h-full object-contain mx-auto"
                />
              ) : previewDocument.document_type.includes('text') ? (
                <pre className="whitespace-pre-wrap text-sm bg-white dark:bg-gray-800 p-4 rounded">
                  {/* In real app, fetch text content via API */}
                  Text preview not implemented (would require backend text extraction)
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