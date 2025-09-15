import React, { useState } from 'react';
import { AlertTriangle, CreditCard, Calendar, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

interface SubscriptionOverdueModalProps {
  isOpen: boolean;
  subscriptionData: {
    plan: string;
    amount: number | string;
    daysOverdue: number;
    nextRenewalDate: string;
  };
}

const SubscriptionOverdueModal: React.FC<SubscriptionOverdueModalProps> = ({
  isOpen,
  subscriptionData
}) => {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('credit_card');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [step, setStep] = useState<'payment' | 'receipt'>('payment');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Helper function to safely format amount
  const formatAmount = (amount: number | string): string => {
    // Convert to number if it's a string
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    // Check if it's a valid number
    if (isNaN(numAmount)) {
      console.error('Invalid amount:', amount);
      return '0.00';
    }
    return numAmount.toFixed(2);
  };

  const handleRenewSubscription = async () => {
    // Always require receipt upload before renewal
    if (!receiptFile) {
      setError('Payment receipt is required');
      toast.error('Payment receipt is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Always use FormData since we're uploading a file
      const formData = new FormData();
      formData.append('paymentMethod', paymentMethod);
      formData.append('receipt', receiptFile);

      const response = await fetch('http://localhost:5000/api/subscription/renew', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        toast.success('Subscription renewal request submitted! We will verify your payment and extend your subscription within 24 hours.');
        // Refresh the page to update subscription status
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const data = await response.json();
        const errorMessage = data.message || 'Renewal failed';
        setError(errorMessage);
        toast.error(errorMessage);
      }
    } catch (error) {
      console.error('Failed to renew subscription:', error);
      const errorMessage = 'Renewal failed. Please try again.';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 'payment') {
      setStep('receipt');
    }
  };

  const handleBack = () => {
    if (step === 'receipt') {
      setStep('payment');
    }
  };

  const getPlanDisplayName = (planId: string) => {
    const plans = {
      basic: 'Basic Plan',
      professional: 'Professional Plan',
      enterprise: 'Enterprise Plan'
    };
    return plans[planId as keyof typeof plans] || planId;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Subscription Payment Overdue
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Your subscription payment is {subscriptionData.daysOverdue} day(s) overdue. 
                    Please renew your subscription to regain access to your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">Subscription Details</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Plan:</span>
                  <span className="text-sm font-medium text-gray-900 capitalize">
                    {getPlanDisplayName(subscriptionData.plan)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Amount Due:</span>
                  <span className="text-sm font-medium text-gray-900">
                    ${formatAmount(subscriptionData.amount)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Days Overdue:</span>
                  <span className="text-sm font-medium text-red-600">
                    {subscriptionData.daysOverdue} days
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1: Payment Method */}
            {step === 'payment' && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Payment Method</h4>
                <div className="space-y-3">
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="credit_card"
                      checked={paymentMethod === 'credit_card'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <CreditCard className="h-5 w-5 ml-3 mr-2 text-gray-600" />
                    <span className="text-sm text-gray-900">Credit Card</span>
                  </label>
                  <label className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="h-5 w-5 ml-3 mr-2 text-gray-600">🏦</span>
                    <span className="text-sm text-gray-900">Bank Transfer</span>
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Receipt Upload (always required) */}
            {step === 'receipt' && (
              <div className="mt-6">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Upload Payment Receipt</h4>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors">
                  <input
                    type="file"
                    id="receipt-upload"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="hidden"
                    required
                  />
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm font-medium text-gray-900 mb-1">
                      {receiptFile ? receiptFile.name : 'Click to upload payment receipt'}
                    </p>
                    <p className="text-xs text-gray-500">
                      Supported formats: JPG, PNG, PDF (Max 10MB)
                    </p>
                  </label>
                </div>

                {receiptFile && (
                  <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-green-600 mr-2" />
                      <div>
                        <p className="text-xs font-medium text-green-800">{receiptFile.name}</p>
                        <p className="text-xs text-green-600">
                          {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="mt-3 flex items-center space-x-2 text-red-600 bg-red-50 border border-red-200 p-2 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-xs">{error}</span>
                  </div>
                )}

                {/* Payment Instructions based on selected method */}
                <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <h5 className="font-semibold text-blue-900 mb-2">Payment Instructions</h5>
                  {paymentMethod === 'credit_card' ? (
                    <div className="text-xs text-blue-800 space-y-1">
                      <p><strong>Card Payment:</strong> Your card will be charged ${formatAmount(subscriptionData.amount)}</p>
                      <p><strong>Note:</strong> Please upload a screenshot of your payment confirmation</p>
                    </div>
                  ) : (
                    <div className="text-xs text-blue-800 space-y-1">
                      <p><strong>Bank:</strong> Commercial Bank of Ethiopia</p>
                      <p><strong>Account Number:</strong> 1000671263468</p>
                      <p><strong>Account Name:</strong> Seid Abdela</p>
                      <p><strong>Amount:</strong> ${formatAmount(subscriptionData.amount)} ETB</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {step === 'payment' && (
              <button
                type="button"
                onClick={handleNext}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Continue to Receipt Upload
              </button>
            )}

            {step === 'receipt' && (
              <>
                <button
                  type="button"
                  onClick={handleRenewSubscription}
                  disabled={loading || !receiptFile}
                  className="w-full inline-flex justify-center items-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Submit Renewal Request
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Back
                </button>
              </>
            )}
          </div>

          <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-3">
            <p className="text-xs text-yellow-800">
              <strong>Note:</strong> You cannot access any part of the system until your subscription is renewed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionOverdueModal;