'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { apiService } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading';
import { MainLayout } from '@/components/layout/MainLayout';
import { Settings as SettingsIcon, User, Bell, Shield, Database, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface Settings {
  autoEmailReferrals: boolean;
  emailNotifications: boolean;
  auditLogging: boolean;
  mailchimpApiKey: string;
  mailchimpServerPrefix: string;
  mailchimpListId: string;
  notificationNewReferrals: boolean;
  notificationCsvUploads: boolean;
  notificationEmailCampaigns: boolean;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<Settings>({
    autoEmailReferrals: false,
    emailNotifications: false,
    auditLogging: false,
    mailchimpApiKey: '',
    mailchimpServerPrefix: '',
    mailchimpListId: '',
    notificationNewReferrals: false,
    notificationCsvUploads: false,
    notificationEmailCampaigns: false,
  });
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [mailchimpForm, setMailchimpForm] = useState({
    apiKey: '',
    serverPrefix: '',
    listId: '',
  });
  const [systemForm, setSystemForm] = useState({
    autoEmailReferrals: false,
    emailNotifications: false,
    auditLogging: false,
    notificationNewReferrals: false,
    notificationCsvUploads: false,
    notificationEmailCampaigns: false,
  });
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    const fetchSettingsData = async () => {
      try {
        // Check authentication first
        if (!authService.isAuthenticated()) {
          router.push('/login');
          return;
        }

        // Get current user from auth service
        const currentUser = authService.getUser();
        if (currentUser) {
          setUser(currentUser);
          setProfileForm({
            name: currentUser.name || '',
            email: currentUser.email || '',
          });
        }

        // Try to fetch settings from API
        try {
          const systemSettings = await apiService.getSettings() as Settings;
          setSettings(systemSettings);
          setMailchimpForm({
            apiKey: systemSettings.mailchimpApiKey || '',
            serverPrefix: systemSettings.mailchimpServerPrefix || '',
            listId: systemSettings.mailchimpListId || '',
          });
          setSystemForm({
            autoEmailReferrals: systemSettings.autoEmailReferrals || false,
            emailNotifications: systemSettings.emailNotifications || false,
            auditLogging: systemSettings.auditLogging || false,
            notificationNewReferrals: systemSettings.notificationNewReferrals || false,
            notificationCsvUploads: systemSettings.notificationCsvUploads || false,
            notificationEmailCampaigns: systemSettings.notificationEmailCampaigns || false,
          });
        } catch (apiError) {
          console.warn('Could not fetch settings from API, using defaults:', apiError);
          // Continue with default values
        }

      } catch (error) {
        console.error('Error in fetchSettingsData:', error);
        toast.error('Failed to load settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchSettingsData();
  }, [isMounted, router]);

  const handleProfileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setProfileForm({ ...profileForm, [e.target.id]: e.target.value });
  };

  const handleMailchimpChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMailchimpForm({ ...mailchimpForm, [e.target.id]: e.target.value });
  };

  const handleSystemChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSystemForm({ ...systemForm, [e.target.id]: e.target.checked });
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Update Profile
      if (profileForm.name !== user?.name || profileForm.email !== user?.email || profileForm.newPassword) {
        if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmNewPassword) {
          toast.error('New password and confirm password do not match.');
          setLoading(false);
          return;
        }
        
        try {
          await apiService.updateCurrentUser({
            name: profileForm.name,
            email: profileForm.email,
            currentPassword: profileForm.currentPassword,
            newPassword: profileForm.newPassword,
          });
          toast.success('Profile updated successfully!');
          
          // Update local user state
          const updatedUser = { ...user, name: profileForm.name, email: profileForm.email } as UserProfile;
          setUser(updatedUser);
          setProfileForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmNewPassword: '' }));
        } catch (error) {
          toast.error('Failed to update profile. Please try again.');
        }
      }

      // Update system settings (admin only)
      if (user?.role === 'admin') {
        try {
          await apiService.updateSettings({
            ...systemForm,
            mailchimpApiKey: mailchimpForm.apiKey,
            mailchimpServerPrefix: mailchimpForm.serverPrefix,
            mailchimpListId: mailchimpForm.listId,
          });
          toast.success('System settings updated!');
        } catch (error) {
          toast.error('Failed to update system settings. Please try again.');
        }
      }

      toast.success('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.message || 'Failed to save settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleTestMailchimpConnection = async () => {
    setLoading(true);
    try {
      const response = await apiService.testMailChimpConnection({
        apiKey: mailchimpForm.apiKey,
        serverPrefix: mailchimpForm.serverPrefix,
      });
      if (response.success) {
        toast.success('MailChimp connection successful!');
      } else {
        toast.error(response.message || 'MailChimp connection failed.');
      }
    } catch (error: any) {
      console.error('Error testing MailChimp connection:', error);
      toast.error(error.message || 'Failed to test MailChimp connection.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading state until mounted
  if (!isMounted) {
    return <LoadingState message="Loading..." />;
  }

  if (loading) {
    return <LoadingState message="Loading settings..." />;
  }

  return (
    <MainLayout title="Settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage your ZenConnect account and system preferences
              </p>
            </div>
            <button
              onClick={handleSaveSettings}
              disabled={loading}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <SettingsIcon className="h-5 w-5 mr-2" />
              Save Settings
            </button>
          </div>
        </div>

        <div className="space-y-6">
          {/* Profile Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <User className="h-5 w-5 mr-2" />
                Profile Settings
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Update your personal information and account details
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="grid grid-cols-1 gap-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                      Full Name
                    </label>
                    <input
                      type="text"
                      id="name"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={profileForm.name}
                      onChange={handleProfileChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                      Email Address
                    </label>
                    <input
                      type="email"
                      id="email"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      value={profileForm.email}
                      onChange={handleProfileChange}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <input
                    type="text"
                    id="role"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm bg-gray-100"
                    value={user?.role || ''}
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Security Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Security Settings
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Manage your password and security preferences
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="space-y-6">
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700">
                    Current Password
                  </label>
                  <input
                    type="password"
                    id="currentPassword"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={profileForm.currentPassword}
                    onChange={handleProfileChange}
                  />
                </div>
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                    New Password
                  </label>
                  <input
                    type="password"
                    id="newPassword"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={profileForm.newPassword}
                    onChange={handleProfileChange}
                  />
                </div>
                <div>
                  <label htmlFor="confirmNewPassword" className="block text-sm font-medium text-gray-700">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    id="confirmNewPassword"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    value={profileForm.confirmNewPassword}
                    onChange={handleProfileChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* MailChimp Settings - Only for admins */}
          {user?.role === 'admin' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                  <Mail className="h-5 w-5 mr-2" />
                  MailChimp Integration
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Configure your MailChimp API settings for email campaigns
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <div className="space-y-6">
                  <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-gray-700">
                      MailChimp API Key
                    </label>
                    <input
                      type="password"
                      id="apiKey"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Enter your MailChimp API key"
                      value={mailchimpForm.apiKey}
                      onChange={handleMailchimpChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="serverPrefix" className="block text-sm font-medium text-gray-700">
                      Server Prefix
                    </label>
                    <input
                      type="text"
                      id="serverPrefix"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="e.g., us1"
                      value={mailchimpForm.serverPrefix}
                      onChange={handleMailchimpChange}
                    />
                  </div>
                  <div>
                    <label htmlFor="listId" className="block text-sm font-medium text-gray-700">
                      List ID
                    </label>
                    <input
                      type="text"
                      id="listId"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Enter your MailChimp list ID"
                      value={mailchimpForm.listId}
                      onChange={handleMailchimpChange}
                    />
                  </div>
                  <button
                    onClick={handleTestMailchimpConnection}
                    disabled={loading}
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                  >
                    Test MailChimp Connection
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* System Settings - Only for admins */}
          {user?.role === 'admin' && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-4 py-5 sm:px-6">
                <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  System Settings
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">
                  Configure system-wide preferences and defaults
                </p>
              </div>
              <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Auto-email referrals</h4>
                      <p className="text-sm text-gray-500">Automatically send emails when new referrals are created</p>
                    </div>
                    <input
                      type="checkbox"
                      id="autoEmailReferrals"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={systemForm.autoEmailReferrals}
                      onChange={handleSystemChange}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Email notifications</h4>
                      <p className="text-sm text-gray-500">Receive email notifications for system activities</p>
                    </div>
                    <input
                      type="checkbox"
                      id="emailNotifications"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={systemForm.emailNotifications}
                      onChange={handleSystemChange}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Audit logging</h4>
                      <p className="text-sm text-gray-500">Enable comprehensive audit logging for compliance</p>
                    </div>
                    <input
                      type="checkbox"
                      id="auditLogging"
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      checked={systemForm.auditLogging}
                      onChange={handleSystemChange}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Notification Settings */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900 flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notification Preferences
              </h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Choose what notifications you'd like to receive
              </p>
            </div>
            <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">New referrals</h4>
                    <p className="text-sm text-gray-500">Get notified when new referrals are created</p>
                  </div>
                  <input
                    type="checkbox"
                    id="notificationNewReferrals"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={systemForm.notificationNewReferrals}
                    onChange={handleSystemChange}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">CSV uploads</h4>
                    <p className="text-sm text-gray-500">Get notified when CSV files are processed</p>
                  </div>
                  <input
                    type="checkbox"
                    id="notificationCsvUploads"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={systemForm.notificationCsvUploads}
                    onChange={handleSystemChange}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900">Email campaigns</h4>
                    <p className="text-sm text-gray-500">Get notified about email campaign status</p>
                  </div>
                  <input
                    type="checkbox"
                    id="notificationEmailCampaigns"
                    className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    checked={systemForm.notificationEmailCampaigns}
                    onChange={handleSystemChange}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}