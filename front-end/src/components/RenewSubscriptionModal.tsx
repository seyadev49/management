import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Calendar, CreditCard, Upload, FileText, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface SubscriptionDetails {
  subscription_status: string;
  subscription_plan: string;
  subscription_price: number;
  billing_cycle: string;
  next_renewal_date: string;
  daysUntilRenewal: number;
}

interface RenewSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  subscriptionDetails: SubscriptionDetails | null;
  onRenewSuccess: () => void;
}

const RenewSubscriptionModal: React.FC<RenewSubscriptionModalProps> = ({
  isOpen,
  onClose,
  subscriptionDetails,
  onRenewSuccess
}) => {
  const { token } = useAuth();
  const [step, setStep] = useState<'payment' | 'receipt'>('payment');
  const [paymentMethod, setPaymentMethod] = useState('cbe');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !subscriptionDetails) return null;

  const handleRenew = async () => {
    if (!receiptFile) {
      setError('Please upload a payment receipt to confirm your renewal');
      return;
    }

    setLoading(true);
    setError('');

    try {
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
        const data = await response.json();
        alert('Subscription renewal request submitted! We will verify your payment and extend your subscription within 24 hours.');
        onRenewSuccess();
        resetForm();
      } else {
        const data = await response.json();
        setError(data.message || 'Renewal failed');
      }
    } catch (error) {
      console.error('Failed to renew subscription:', error);
      setError('Renewal failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setStep('payment');
    setPaymentMethod('cbe');
    setReceiptFile(null);
    setError('');
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

  const getUrgencyColor = () => {
    if (subscriptionDetails.daysUntilRenewal <= 0) {
      return 'text-red-600 dark:text-red-400';
    } else if (subscriptionDetails.daysUntilRenewal <= 7) {
      return 'text-orange-600 dark:text-orange-400';
    }
    return 'text-blue-600 dark:text-blue-400';
  };

  const getUrgencyMessage = () => {
    if (subscriptionDetails.daysUntilRenewal <= 0) {
      return `Your subscription is ${Math.abs(subscriptionDetails.daysUntilRenewal)} day(s) overdue. Please renew immediately to maintain access.`;
    } else if (subscriptionDetails.daysUntilRenewal <= 7) {
      return `Your subscription expires in ${subscriptionDetails.daysUntilRenewal} day(s). Renew now to avoid service interruption.`;
    }
    return `Your subscription expires in ${subscriptionDetails.daysUntilRenewal} day(s). Renew early to ensure uninterrupted service.`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900"></div>
        </div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <RefreshCw className="h-6 w-6 text-blue-600 dark:text-blue-400 mr-2" />
                <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Renew Subscription</h3>
              </div>
              <button
                onClick={() => {
                  onClose();
                  resetForm();
                }}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === 'payment' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  1
                </div>
                <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700">
                  <div className={`h-full bg-blue-600 transition-all duration-300 ${
                    step === 'receipt' ? 'w-full' : 'w-0'
                  }`}></div>
                </div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === 'receipt' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                }`}>
                  2
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800/30 border border-red-200 dark:text-red-300 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Renewal Notice */}
            <div className={`mb-6 p-4 rounded-lg border ${
              subscriptionDetails.daysUntilRenewal <= 0
                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                : subscriptionDetails.daysUntilRenewal <= 7
                ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
                : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800'
            }`}>
              <div className="flex items-center mb-2">
                <Calendar className={`h-5 w-5 mr-2 ${getUrgencyColor()}`} />
                <h4 className={`text-sm font-medium ${getUrgencyColor()}`}>
                  Subscription Renewal Required
                </h4>
              </div>
              <p className={`text-sm ${getUrgencyColor()}`}>
                {getUrgencyMessage()}
              </p>
            </div>

            {/* Current Plan Summary */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-6">
              <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Current Subscription</h4>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    {getPlanDisplayName(subscriptionDetails.subscription_plan)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Amount:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">
                    ${subscriptionDetails.subscription_price}/{subscriptionDetails.billing_cycle === 'monthly' ? 'month' : subscriptionDetails.billing_cycle}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Billing Cycle:</span>
                  <span className="text-gray-900 dark:text-white capitalize">{subscriptionDetails.billing_cycle}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-400">Current Expiry:</span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(subscriptionDetails.next_renewal_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Step 1: Payment Method */}
            {step === 'payment' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Choose Payment Method</h4>
                  <p className="text-gray-600 dark:text-gray-400">Select how you'd like to pay for your subscription renewal</p>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors dark:border-gray-700 dark:hover:border-blue-400">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="cbe"
                      checked={paymentMethod === 'cbe'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div className="ml-4 flex items-center">
                      <div className="p-2 bg-blue-100 rounded-lg mr-3 dark:bg-blue-900/30">
                        <span className="text-blue-600 text-lg">🏦</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Commercial Bank of Ethiopia (CBE)</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Transfer to our CBE account</div>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors dark:border-gray-700 dark:hover:border-blue-400">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="awash"
                      checked={paymentMethod === 'awash'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div className="ml-4 flex items-center">
                      <div className="p-2 bg-green-100 rounded-lg mr-3 dark:bg-green-900/30">
                        <span className="text-green-600 text-lg">🏦</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Awash Bank</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Transfer to our Awash account</div>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-blue-300 transition-colors dark:border-gray-700 dark:hover:border-blue-400">
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="telebirr"
                      checked={paymentMethod === 'telebirr'}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <div className="ml-4 flex items-center">
                      <div className="p-2 bg-purple-100 rounded-lg mr-3 dark:bg-purple-900/30">
                        <span className="text-purple-600 text-lg">📱</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">Telebirr</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">Mobile payment via Telebirr</div>
                      </div>
                    </div>
                  </label>
                </div>

                {/* Payment Instructions */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-800/30">
                  <h5 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">Payment Instructions</h5>
                  {paymentMethod === 'cbe' ? (
                    <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                      <p><strong>Bank:</strong> Commercial Bank of Ethiopia</p>
                      <p><strong>Account Number:</strong> 1000671263468</p>
                      <p><strong>Account Name:</strong> Seid Abdela</p>
                      <p><strong>Amount:</strong> ${subscriptionDetails.subscription_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</p>
                    </div>
                  ) : paymentMethod === 'awash' ? (
                    <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                      <p><strong>Bank:</strong> Awash Bank</p>
                      <p><strong>Account Number:</strong> 2000987654321</p>
                      <p><strong>Account Name:</strong> Seid Abdela</p>
                      <p><strong>Amount:</strong> ${subscriptionDetails.subscription_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</p>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                      <p><strong>Telebirr Number:</strong> 0923797665</p>
                      <p><strong>Account Name:</strong> shakurya kader</p>
                      <p><strong>Amount:</strong> ${subscriptionDetails.subscription_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 2: Receipt Upload */}
            {step === 'receipt' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload Payment Receipt</h4>
                  <p className="text-gray-600 dark:text-gray-400">Please upload your payment receipt to confirm the renewal</p>
                </div>

                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors dark:border-gray-700 dark:hover:border-blue-400">
                  <input
                    type="file"
                    id="receipt-upload"
                    accept="image/*,.pdf"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] || null)}
                    className="hidden"
                    required={true}
                  />
                  <label htmlFor="receipt-upload" className="cursor-pointer">
                    <Upload className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      {receiptFile ? receiptFile.name : 'Click to upload receipt'}
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Supported formats: JPG, PNG, PDF (Max 10MB)
                    </p>
                  </label>
                </div>

                {receiptFile && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 dark:bg-green-900/20 dark:border-green-800/30">
                    <div className="flex items-center">
                      <FileText className="h-5 w-5 text-green-600 dark:text-green-400 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-800 dark:text-green-300">{receiptFile.name}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">
                          {(receiptFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Renewal Summary */}
                <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-700/50">
                  <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Renewal Summary</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Plan:</span>
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {getPlanDisplayName(subscriptionDetails.subscription_plan)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Billing Cycle:</span>
                      <span className="text-gray-900 dark:text-white capitalize">{subscriptionDetails.billing_cycle}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 dark:text-gray-400">Current Expiry:</span>
                      <span className="text-gray-900 dark:text-white">
                        {new Date(subscriptionDetails.next_renewal_date).toLocaleDateString()}
                      </span>
                    </div>
                    <hr className="my-2 border-gray-200 dark:border-gray-700" />
                    <div className="flex justify-between items-center font-semibold">
                      <span className="text-gray-900 dark:text-white">Renewal Amount:</span>
                      <span className="text-gray-900 dark:text-white">
                        ${subscriptionDetails.subscription_price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {step === 'payment' && (
              <button
                onClick={handleNext}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-700 dark:hover:bg-blue-800 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Continue to Receipt Upload
              </button>
            )}

            {step === 'receipt' && (
              <>
                <button
                  onClick={handleRenew}
                  disabled={loading || !receiptFile}
                  className="w-full inline-flex justify-center items-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-blue-700 dark:hover:bg-blue-800 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Complete Renewal
                    </>
                  )}
                </button>
                <button
                  onClick={handleBack}
                  disabled={loading}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Back
                </button>
              </>
            )}

            <button
              type="button"
              onClick={() => {
                onClose();
                resetForm();
              }}
              className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RenewSubscriptionModal;