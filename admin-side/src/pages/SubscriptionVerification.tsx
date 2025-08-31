import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  FileText, 
  Check, 
  X, 
  Eye, 
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  Download,
  Search,
  Filter,
  Loader2
} from 'lucide-react';

interface PendingSubscription {
  id: number;
  organization_id: number;
  organization_name: string;
  organization_email: string;
  plan_id: string;
  amount: number;
  billing_cycle: string;
  status: string;
  receipt_path: string;
  created_at: string;
  payment_method: string;
}

const SubscriptionVerification: React.FC = () => {
  const { token } = useAuth();
  const [pendingSubscriptions, setPendingSubscriptions] = useState<PendingSubscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<{url: string, isPdf: boolean} | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptError, setReceiptError] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingSubscriptions();
  }, [token]);

  const fetchPendingSubscriptions = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/admin/billing/subscriptions?status=pending_verification', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPendingSubscriptions(data.subscriptions);
      }
    } catch (error) {
      console.error('Error fetching pending subscriptions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerification = async (subscriptionId: number, action: 'approve' | 'reject', reason?: string) => {
    setActionLoading(`${action}-${subscriptionId}`);
    try {
      const response = await fetch(`http://localhost:5000/api/admin/billing/subscriptions/${subscriptionId}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action, reason }),
      });

      if (response.ok) {
        await fetchPendingSubscriptions();
        const actionText = action === 'approve' ? 'approved' : 'rejected';
        alert(`Subscription ${actionText} successfully`);
      } else {
        const errorData = await response.json();
        alert(errorData.message || `Failed to ${action} subscription`);
      }
    } catch (error) {
      console.error(`Error ${action}ing subscription:`, error);
      alert(`Failed to ${action} subscription`);
    } finally {
      setActionLoading(null);
    }
  };
const viewReceipt = async (receiptPath: string) => {
  setReceiptLoading(true);
  setReceiptError(null);
  try {
    // Create a URL that serves the file directly with auth token
    const encodedPath = encodeURIComponent(receiptPath);
    const receiptUrl = `http://localhost:5000/api/admin/billing/receipts/download?receiptPath=${encodedPath}`;
    
    // Verify the receipt is accessible
    const response = await fetch(receiptUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch receipt: ${response.status} - ${errorText}`);
    }
    
    // Check content type to determine if it's PDF
    const contentType = response.headers.get('content-type') || '';
    const isPdf = contentType.includes('pdf') || receiptPath.toLowerCase().endsWith('.pdf');
    
    // For images, we need to create a blob URL
    if (!isPdf) {
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      setSelectedReceipt({ url: blobUrl, isPdf });
    } else {
      setSelectedReceipt({ url: blobUrl, isPdf });
    }
    
    setShowReceiptModal(true);
  } catch (error) {
    console.error('Error viewing receipt:', error);
    setReceiptError('Failed to load receipt. Please try downloading instead.');
    setSelectedReceipt(null);
    setShowReceiptModal(true);
  } finally {
    setReceiptLoading(false);
  }
};

  const downloadReceipt = async (receiptPath: string, organizationName: string) => {
    try {
      const downloadUrl = `http://localhost:5000/api/admin/billing/receipts/download?receiptPath=${encodeURIComponent(receiptPath)}`;
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `receipt-${organizationName}-${Date.now()}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt');
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'basic': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'professional': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300';
      case 'enterprise': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  const filteredSubscriptions = pendingSubscriptions.filter(sub =>
    (sub.organization_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     sub.organization_email?.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (filterPlan === '' || sub.plan_id === filterPlan)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Subscription Verification</h1>
          <p className="text-gray-600 dark:text-gray-400">Review and verify pending subscription payments</p>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
          <Clock className="h-4 w-4" />
          <span>{filteredSubscriptions.length} pending verification</span>
        </div>
      </div>

      {/* Filters */}
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
          <select
            value={filterPlan}
            onChange={(e) => setFilterPlan(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
          >
            <option value="">All Plans</option>
            <option value="basic">Basic</option>
            <option value="professional">Professional</option>
            <option value="enterprise">Enterprise</option>
          </select>
        </div>
      </div>

      {/* Pending Subscriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSubscriptions.map((subscription) => (
          <div key={subscription.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {subscription.organization_name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{subscription.organization_email}</p>
              </div>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                <Clock className="h-3 w-3 mr-1" />
                Pending
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Plan:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(subscription.plan_id)}`}>
                  {subscription.plan_id}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Amount:</span>
                <span className="text-sm font-medium text-gray-900 dark:text-white">${subscription.amount}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Billing:</span>
                <span className="text-sm text-gray-900 dark:text-white capitalize">{subscription.billing_cycle}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Payment Method:</span>
                <span className="text-sm text-gray-900 dark:text-white capitalize">
                  {subscription.payment_method.replace('_', ' ')}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-gray-400">Submitted:</span>
                <span className="text-sm text-gray-900 dark:text-white">
                  {new Date(subscription.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            {/* Receipt Actions */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mb-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Payment Receipt</span>
                <div className="flex space-x-2">
                  <button
                    onClick={() => viewReceipt(subscription.receipt_path)}
                    disabled={receiptLoading}
                    className="flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50 disabled:opacity-50"
                  >
                    {receiptLoading ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <Eye className="h-3 w-3 mr-1" />
                    )}
                    View
                  </button>
                  <button
                    onClick={() => downloadReceipt(subscription.receipt_path, subscription.organization_name)}
                    className="flex items-center px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                  >
                    <Download className="h-3 w-3 mr-1" />
                    Download
                  </button>
                </div>
              </div>
            </div>

            {/* Verification Actions */}
            <div className="flex space-x-2">
              <button
                onClick={() => handleVerification(subscription.id, 'approve')}
                disabled={actionLoading === `approve-${subscription.id}`}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === `approve-${subscription.id}` ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <Check className="h-4 w-4 mr-2" />
                )}
                Approve
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Enter rejection reason:');
                  if (reason) {
                    handleVerification(subscription.id, 'reject', reason);
                  }
                }}
                disabled={actionLoading === `reject-${subscription.id}`}
                className="flex-1 flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {actionLoading === `reject-${subscription.id}` ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                ) : (
                  <X className="h-4 w-4 mr-2" />
                )}
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredSubscriptions.length === 0 && (
        <div className="text-center py-12">
          <CheckCircle className="mx-auto h-12 w-12 text-green-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">All caught up!</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || filterPlan ? 'No subscriptions match your filters.' : 'No pending subscription verifications.'}
          </p>
        </div>
      )}

      {/* Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Payment Receipt</h2>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-4 flex-grow flex items-center justify-center">
              {receiptLoading ? (
                <div className="flex flex-col items-center">
                  <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
                  <p className="mt-2 text-gray-600 dark:text-gray-400">Loading receipt...</p>
                </div>
              ) : receiptError ? (
                <div className="text-center p-6">
                  <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Error Loading Receipt</h3>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">{receiptError}</p>
                  <div className="mt-4">
                    <button
                      onClick={() => window.open(selectedReceipt?.url, '_blank')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Open in New Tab
                    </button>
                  </div>
                </div>
              ) : selectedReceipt ? (
                selectedReceipt.isPdf ? (
                  <div className="w-full h-96 flex flex-col items-center">
                    <div className="mb-4 text-center">
                      <FileText className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-gray-600 dark:text-gray-400">PDF Receipt Preview</p>
                    </div>
                    <iframe
                      src={selectedReceipt.url}
                      className="w-full h-80 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700"
                      title="Payment Receipt PDF"
                      onError={(e) => {
                        console.error('Failed to load PDF:', e);
                        setReceiptError('Failed to display PDF. Opening in new tab...');
                        setTimeout(() => {
                          window.open(selectedReceipt.url, '_blank');
                        }, 1000);
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full flex flex-col items-center">
                    <img
                      src={selectedReceipt.url}
                      alt="Payment Receipt"
                      className="max-w-full h-auto rounded-lg shadow-lg mx-auto max-h-[70vh]"
                      onError={(e) => {
                        console.error('Failed to load receipt image:', selectedReceipt.url);
                        setReceiptError('Failed to display image. Opening in new tab...');
                        setTimeout(() => {
                          window.open(selectedReceipt.url, '_blank');
                        }, 1000);
                      }}
                    />
                  </div>
                )
              ) : (
                <div className="text-center p-6">
                  <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
                  <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No Receipt Available</h3>
                  <p className="mt-1 text-gray-500 dark:text-gray-400">This subscription does not have a receipt.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionVerification;