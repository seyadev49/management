import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import GlobalSearchBar from './GlobalSearchBar';
import NotificationDropdown from './NotificationDropdown';
import UpgradeModal from './UpgradeModal';
import PlanLimitModal from './PlanLimitModal';
import NetworkStatusIndicator from './NetworkStatusIndicator';
import {
  Home,
  Building2,
  Users,
  CreditCard,
  Wrench,
  FileText,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  Sun,
  Moon
} from 'lucide-react';
import { usePlanLimitContext } from '../contexts/PlanLimitContext';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { user, logout, isSubscriptionOverdue } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const { isModalOpen, showPlanLimitModal, hidePlanLimitModal, planLimitData } = usePlanLimitContext();
  const [isDarkMode, setIsDarkMode] = useState(false); // State for dark mode

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // This function is now called by the usePlanLimits hook when a limit is reached
  const handlePlanLimitReached = (limitData: any) => {
    showPlanLimitModal(limitData);
  };

  // Don't render layout if subscription is overdue
  if (isSubscriptionOverdue) {
    return null;
  }

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', icon: Home },
    { name: 'Properties', to: '/properties', icon: Building2 },
    { name: 'Tenants', to: '/tenants', icon: Users },
    { name: 'Payments', to: '/payments', icon: CreditCard },
    { name: 'Maintenance', to: '/maintenance', icon: Wrench },
    { name: 'Documents', to: '/documents', icon: FileText },
    { name: 'Reports', to: '/reports', icon: BarChart3 },
    { name: 'Settings', to: '/settings', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-between h-16 px-6 bg-blue-600 dark:bg-gray-900">
          <h1 className="text-xl font-bold text-white">RentFlow</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-white hover:text-gray-200"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <nav className="mt-6">
          {navigation.map((item) => (
            <NavLink
              key={item.name}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center px-6 py-3 text-gray-700 hover:bg-blue-50 hover:text-blue-600 transition-colors duration-200 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white ${
                  isActive ? 'bg-blue-50 text-blue-600 border-r-2 border-blue-600 dark:bg-gray-700 dark:border-blue-500' : ''
                }`
              }
              onClick={() => setSidebarOpen(false)}
            >
              <item.icon className="h-5 w-5 mr-3" />
              {item.name}
            </NavLink>
          ))}
        </nav>

        <div className="absolute bottom-0 w-full p-6">
          {user?.subscriptionStatus === 'trial' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-medium text-yellow-800">Trial Period</h3>
              <p className="text-xs text-yellow-600 mt-1">
                Expires: {new Date(user.trialEndDate).toLocaleDateString()}
              </p>
              <button
                onClick={() => setShowUpgradeModal(true)}
                className="mt-2 text-xs text-yellow-800 hover:text-yellow-900 font-medium"
              >
                Upgrade Now →
              </button>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors duration-200 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <LogOut className="h-4 w-4 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              >
                <Menu className="h-6 w-6" />
              </button>
              <div className="hidden md:flex items-center ml-4">
                <GlobalSearchBar className="w-80" />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <NotificationDropdown />
              {/* Dark Mode Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700 transition-colors"
                title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {isDarkMode ? (
                  <Sun className="h-5 w-5" />
                ) : (
                  <Moon className="h-5 w-5" />
                )}
              </button>

              <div className="flex items-center space-x-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.fullName}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{user?.organizationName}</p>
                </div>
                <div className="h-8 w-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user?.fullName?.charAt(0)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          {React.cloneElement(children as React.ReactElement, { onPlanLimitReached: handlePlanLimitReached })}
        </main>
      </div>

      {/* Network Status Indicator */}
      <NetworkStatusIndicator />
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
      />

      {planLimitData && (
        <PlanLimitModal
          isOpen={isModalOpen}
          onClose={hidePlanLimitModal}
          onUpgrade={() => {
            hidePlanLimitModal();
            setShowUpgradeModal(true);
          }}
          feature={planLimitData.feature}
          currentPlan={planLimitData.plan}
          currentUsage={planLimitData.currentUsage}
          limit={planLimitData.limit}
        />
      )}
    </div>
  );
};

export default Layout;