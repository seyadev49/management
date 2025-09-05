import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { X, Check, Upload, FileText, AlertCircle } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  price: number;
  price_yearly: number;
  interval: string;
  features: string[];
}

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const UpgradeModal: React.FC<UpgradeModalProps> = ({ isOpen, onClose }) => {
  const { token } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'plan' | 'payment' | 'receipt'>('plan');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchPlans();
      setStep('plan');
      setError('');
    }
  }, [isOpen]);

  const fetchPlans = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/subscription/plans', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans);
        if (data.plans.length > 0) {
          setSelectedPlan(data.plans[1].id); // Default to professional plan
        }
      }
    } catch (error) {
      console.error('Failed to fetch plans:', error);
    }
  };

  const handleUpgrade = async () => {
    if (!receiptFile) {
      setError('Please upload a payment receipt to confirm your upgrade');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('planId', selectedPlan);
      formData.append('paymentMethod', paymentMethod);
      formData.append('billingCycle', billingCycle);
      formData.append('receipt', receiptFile);

      const response = await fetch('http://localhost:5000/api/subscription/upgrade', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (response.ok) {
        alert('Subscription upgrade request submitted! We will verify your payment and activate your plan within 24 hours.');
        onClose();
        // Refresh the page to update subscription status
        window.location.reload();
      } else {
        const data = await response.json();
        setError(data.message || 'Upgrade failed');
      }
    } catch (error) {
      console.error('Failed to upgrade subscription:', error);
      setError('Upgrade failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 'plan') {
      setStep('payment');
    } else if (step === 'payment') {
      setStep('receipt');
    }
  };

  const handleBack = () => {
    if (step === 'receipt') {
      setStep('payment');
    } else if (step === 'payment') {
      setStep('plan');
    }
  };

  // Calculate savings for a specific plan
  const calculateSavings = (plan: Plan) => {
    if (billingCycle === 'monthly') return 0;
    
    // Calculate savings: (monthly price * 12) - annual price
    const monthlyCost = plan.price * 12;
    const annualCost = plan.price_yearly;
    return monthlyCost - annualCost;
  };

  if (!isOpen) return null;

  const selectedPlanData = plans.find(plan => plan.id === selectedPlan);
  
  const getPrice = () => {
    if (!selectedPlanData) return 0;
    return billingCycle === 'annual' ? selectedPlanData.price_yearly : selectedPlanData.price;
  };

  const getSavings = () => {
    if (!selectedPlanData || billingCycle === 'monthly') return 0;
    
    // Calculate savings: (monthly price * 12) - annual price
    const monthlyCost = selectedPlanData.price * 12;
    const annualCost = selectedPlanData.price_yearly;
    return monthlyCost - annualCost;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900"></div>
        </div>

        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white">Upgrade Your Plan</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center justify-center mb-8">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === 'plan' ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                }`}>
                  1
                </div>
                <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700">
                  <div className={`h-full bg-blue-600 transition-all duration-300 ${
                    step === 'payment' || step === 'receipt' ? 'w-full' : 'w-0'
                  }`}></div>
                </div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === 'payment' ? 'bg-blue-600 text-white' : 
                  step === 'receipt' ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                }`}>
                  2
                </div>
                <div className="w-16 h-1 bg-gray-200 dark:bg-gray-700">
                  <div className={`h-full bg-blue-600 transition-all duration-300 ${
                    step === 'receipt' ? 'w-full' : 'w-0'
                  }`}></div>
                </div>
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step === 'receipt' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
                }`}>
                  3
                </div>
              </div>
            </div>

            {error && (
              <div className="mb-6 flex items-center space-x-2 text-red-600 bg-red-50 dark:bg-red-900/20 dark:border-red-800/30 border border-red-200 dark:text-red-300 p-3 rounded-lg">
                <AlertCircle className="h-5 w-5" />
                <span className="text-sm">{error}</span>
              </div>
            )}

            {/* Step 1: Plan Selection */}
            {step === 'plan' && (
              <div className="space-y-6">
                {/* Billing Cycle Toggle */}
                <div className="flex justify-center">
                  <div className="bg-gray-100 p-1 rounded-lg dark:bg-gray-700">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                        billingCycle === 'monthly'
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                      }`}
                    >
                      Monthly
                    </button>
                    <button
                      onClick={() => setBillingCycle('annual')}
                      className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                        billingCycle === 'annual'
                          ? 'bg-white text-gray-900 shadow-sm dark:bg-gray-600 dark:text-white'
                          : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white'
                      }`}
                    >
                      Annual
                      <span className="ml-2 text-xs bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 px-2 py-1 rounded-full">
                        Save 10%
                      </span>
                    </button>
                  </div>
                </div>

                {/* Plan Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {plans.map((plan) => {
                    const price = billingCycle === 'annual' ? plan.price_yearly : plan.price;
                    const savings = calculateSavings(plan);

                    return (
                      <div
                        key={plan.id}
                        className={`border-2 rounded-lg p-6 cursor-pointer transition-all duration-200 relative ${
                          selectedPlan === plan.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 hover:border-gray-300 dark:border-gray-700 dark:hover:border-gray-600'
                        }`}
                        onClick={() => setSelectedPlan(plan.id)}
                      >
                        {billingCycle === 'annual' && savings > 0 && (
                          <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                            <span className="bg-green-500 text-white text-xs px-3 py-1 rounded-full">
                              Save ${savings.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                        )}
                        
                        <div className="text-center">
                          <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{plan.name}</h4>
                          <div className="mb-4">
                            <span className="text-3xl font-bold text-gray-900 dark:text-white">${price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                            <span className="text-gray-600 dark:text-gray-400">/{billingCycle === 'annual' ? 'year' : 'month'}</span>
                            {billingCycle === 'annual' && (
                              <div className="text-sm text-green-600 dark:text-green-400 font-medium">
                                ${(price / 12).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/month billed annually
                              </div>
                            )}
                          </div>
                          <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            {plan.features.map((feature, index) => (
                              <li key={index} className="flex items-center">
                                <Check className="h-4 w-4 text-green-500 dark:text-green-400 mr-2" />
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Step 2: Payment Method */}
            {step === 'payment' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Choose Payment Method</h4>
                  <p className="text-gray-600 dark:text-gray-400">Select how you'd like to pay for your subscription</p>
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
                      <p><strong>Amount:</strong> ${getPrice().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</p>
                    </div>
                  ) : paymentMethod === 'awash' ? (
                    <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                      <p><strong>Bank:</strong> Awash Bank</p>
                      <p><strong>Account Number:</strong> 2000987654321</p>
                      <p><strong>Account Name:</strong> Seid Abdela</p>
                      <p><strong>Amount:</strong> ${getPrice().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</p>
                    </div>
                  ) : (
                    <div className="text-sm text-blue-800 dark:text-blue-300 space-y-1">
                      <p><strong>Telebirr Number:</strong> 0923797665</p>
                      <p><strong>Account Name:</strong> shakurya kader</p>
                      <p><strong>Amount:</strong> ${getPrice().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ETB</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Step 3: Receipt Upload */}
            {step === 'receipt' && (
              <div className="space-y-6">
                <div className="text-center">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Upload Payment Receipt</h4>
                  <p className="text-gray-600 dark:text-gray-400">Please upload your payment receipt to confirm the upgrade</p>
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

                {/* Order Summary */}
                {selectedPlanData && (
                  <div className="bg-gray-50 rounded-lg p-4 dark:bg-gray-700/50">
                    <h5 className="font-semibold text-gray-900 dark:text-white mb-3">Order Summary</h5>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">{selectedPlanData.name}</span>
                        <span className="font-semibold text-gray-900 dark:text-white">
                          ${getPrice().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{billingCycle === 'annual' ? 'year' : 'month'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600 dark:text-gray-400">Billing Cycle</span>
                        <span className="text-gray-900 dark:text-white capitalize">{billingCycle}</span>
                      </div>
                      {billingCycle === 'annual' && getSavings() > 0 && (
                        <div className="flex justify-between items-center text-green-600 dark:text-green-400">
                          <span>Annual Discount</span>
                          <span>-${getSavings().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      )}
                      <hr className="my-2 border-gray-200 dark:border-gray-700" />
                      <div className="flex justify-between items-center font-semibold">
                        <span className="text-gray-900 dark:text-white">Total</span>
                        <span className="text-gray-900 dark:text-white">
                          ${getPrice().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/{billingCycle === 'annual' ? 'year' : 'month'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            {step === 'plan' && (
              <button
                onClick={handleNext}
                disabled={!selectedPlan}
                className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm dark:bg-blue-700 dark:hover:bg-blue-800"
              >
                Continue
              </button>
            )}

            {step === 'payment' && (
              <>
                <button
                  onClick={handleNext}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  Continue to Receipt Upload
                </button>
                <button
                  onClick={handleBack}
                  className="mt-3 w-full inline-flex justify-center rounded-lg border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-600 dark:border-gray-500 dark:text-gray-200 dark:hover:bg-gray-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Back
                </button>
              </>
            )}

            {step === 'receipt' && (
              <>
                <button
                  onClick={handleUpgrade}
                  disabled={loading || !receiptFile}
                  className="w-full inline-flex justify-center rounded-lg border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed sm:ml-3 sm:w-auto sm:text-sm dark:bg-blue-700 dark:hover:bg-blue-800"
                >
                  {loading ? 'Processing...' : 'Complete Upgrade'}
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
              onClick={onClose}
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

export default UpgradeModal;