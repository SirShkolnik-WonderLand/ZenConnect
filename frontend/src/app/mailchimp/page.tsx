'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { apiService } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading';
import { Modal } from '@/components/ui/modal';
import { MainLayout } from '@/components/layout/MainLayout';
import toast from 'react-hot-toast';
import { 
  Mail, 
  Send, 
  TestTube, 
  BarChart3, 
  Users, 
  CheckCircle, 
  AlertCircle,
  FileText,
  Settings
} from 'lucide-react';

interface MailChimpStats {
  totalCampaigns: number;
  campaigns: Array<{
    id: string;
    subject: string;
    sendTime: string;
    recipients: number;
  }>;
}

interface EmailTemplate {
  id: string;
  name: string;
  type: 'wellness' | 'medical';
  description: string;
}

interface Referral {
  id: string;
  patientName: string;
  patientEmail?: string;
  code: string;
  status: string;
  referredBy: string;
}

export default function MailChimpPage() {
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'failed'>('unknown');
  const [stats, setStats] = useState<MailChimpStats | null>(null);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(true);
  const [testEmailModal, setTestEmailModal] = useState(false);
  const [campaignModal, setCampaignModal] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testName, setTestName] = useState('');
  const [testType, setTestType] = useState<'wellness' | 'medical'>('wellness');
  const [selectedReferrals, setSelectedReferrals] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      toast.error('Please log in to access this page.');
      return;
    }
    fetchData();
  }, [router]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [referralsResponse] = await Promise.all([
        apiService.getReferrals({ limit: 100 }),
      ]);

      setReferrals(referralsResponse.referrals || []);
      
      // Try to get MailChimp data, but don't fail if it's not configured
      try {
        const [statsResponse, templatesResponse] = await Promise.all([
          apiService.getMailChimpStats(),
          apiService.getEmailTemplates(),
        ]);
        setStats(statsResponse);
        setTemplates(templatesResponse.templates || []);
      } catch (mailchimpError) {
        console.warn('MailChimp not configured:', mailchimpError);
        setStats(null);
        setTemplates([]);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    try {
      const response = await apiService.testMailChimpConnection();
      if (response.success) {
        setConnectionStatus('connected');
        toast.success('MailChimp connection successful!');
      } else {
        setConnectionStatus('failed');
        toast.error('MailChimp connection failed - check API configuration');
      }
    } catch (error) {
      setConnectionStatus('failed');
      toast.error('MailChimp not configured - please set up API keys in environment variables');
    }
  };

  const sendTestEmail = async () => {
    if (!testEmail || !testName) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      await apiService.sendSingleEmail({
        email: testEmail,
        name: testName,
        type: testType,
        referralCode: testType === 'wellness' ? 'TEST-REF-123' : undefined,
        serviceName: `${testType} service`,
        providerName: 'ZenConnect Clinic',
      });

      toast.success(`${testType} email sent successfully to ${testEmail}`);
      setTestEmailModal(false);
      setTestEmail('');
      setTestName('');
    } catch (error) {
      console.error('Error sending test email:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send test email');
    }
  };

  const sendWellnessCampaign = async () => {
    const wellnessReferrals = referrals.filter(r => r.status === 'pending' && selectedReferrals.includes(r.id));
    
    if (wellnessReferrals.length === 0) {
      toast.error('No pending wellness referrals selected');
      return;
    }

    try {
      await apiService.sendWellnessCampaign(wellnessReferrals.map(r => r.id));
      toast.success(`Wellness campaign sent to ${wellnessReferrals.length} recipients!`);
      setCampaignModal(false);
      setSelectedReferrals([]);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error sending wellness campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send wellness campaign');
    }
  };

  const sendMedicalCampaign = async () => {
    const medicalReferrals = referrals.filter(r => r.status === 'medical_only' && selectedReferrals.includes(r.id));
    
    if (medicalReferrals.length === 0) {
      toast.error('No medical referrals selected');
      return;
    }

    try {
      await apiService.sendMedicalCampaign(medicalReferrals.map(r => r.id));
      toast.success(`Medical campaign sent to ${medicalReferrals.length} recipients!`);
      setCampaignModal(false);
      setSelectedReferrals([]);
      fetchData(); // Refresh data
    } catch (error) {
      console.error('Error sending medical campaign:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to send medical campaign');
    }
  };

  const toggleReferralSelection = (referralId: string) => {
    setSelectedReferrals(prev => 
      prev.includes(referralId) 
        ? prev.filter(id => id !== referralId)
        : [...prev, referralId]
    );
  };

  if (loading) {
    return <LoadingState message="Loading MailChimp dashboard..." />;
  }

  const pendingReferrals = referrals.filter(r => r.status === 'pending');
  const medicalReferrals = referrals.filter(r => r.status === 'medical_only');

  return (
    <MainLayout title="MailChimp Integration">
      <div className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900">MailChimp Integration</h2>
          <button
            onClick={testConnection}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <TestTube className="h-5 w-5 mr-2" />
            Test Connection
          </button>
        </div>

        {/* Connection Status */}
        <div className="bg-white shadow rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              {connectionStatus === 'connected' ? (
                <CheckCircle className="h-8 w-8 text-green-500" />
              ) : connectionStatus === 'failed' ? (
                <AlertCircle className="h-8 w-8 text-red-500" />
              ) : (
                <Settings className="h-8 w-8 text-gray-400" />
              )}
            </div>
            <div className="ml-5">
              <h3 className="text-lg font-medium text-gray-900">MailChimp Connection</h3>
              <p className="text-sm text-gray-500">
                {connectionStatus === 'connected' 
                  ? 'Connected and ready to send campaigns' 
                  : connectionStatus === 'failed'
                  ? 'Connection failed - check your API credentials'
                  : 'Connection status unknown - click "Test Connection" to check'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <BarChart3 className="h-8 w-8 text-blue-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Campaigns</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {stats?.totalCampaigns || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-8 w-8 text-green-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Referrals</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {pendingReferrals.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <FileText className="h-8 w-8 text-purple-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Email Templates</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {templates.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Mail className="h-8 w-8 text-orange-500" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Medical Referrals</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {medicalReferrals.length}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <button
            onClick={() => setTestEmailModal(true)}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center justify-center">
              <TestTube className="h-8 w-8 text-blue-500 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Send Test Email</h3>
                <p className="text-sm text-gray-500">Test email templates</p>
              </div>
            </div>
          </button>

          <button
            onClick={() => setCampaignModal(true)}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center justify-center">
              <Send className="h-8 w-8 text-green-500 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Send Campaigns</h3>
                <p className="text-sm text-gray-500">Send bulk emails to referrals</p>
              </div>
            </div>
          </button>

          <button
            onClick={fetchData}
            className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow border border-gray-200"
          >
            <div className="flex items-center justify-center">
              <BarChart3 className="h-8 w-8 text-purple-500 mr-3" />
              <div>
                <h3 className="text-lg font-medium text-gray-900">Refresh Stats</h3>
                <p className="text-sm text-gray-500">Update campaign statistics</p>
              </div>
            </div>
          </button>
        </div>

        {/* Email Templates */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">Email Templates</h3>
            <p className="mt-1 max-w-2xl text-sm text-gray-500">
              Available email templates for different service types.
            </p>
          </div>
          <div className="border-t border-gray-200">
            <dl>
              {templates.map((template, index) => (
                <div
                  key={template.id}
                  className={`${index % 2 === 0 ? 'bg-gray-50' : 'bg-white'} px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6`}
                >
                  <dt className="text-sm font-medium text-gray-500">{template.name}</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:col-span-2">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          template.type === 'wellness' ? 'bg-purple-100 text-purple-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {template.type}
                        </span>
                        <p className="text-gray-600 mt-1">{template.description}</p>
                      </div>
                    </div>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Test Email Modal */}
        <Modal isOpen={testEmailModal} onClose={() => setTestEmailModal(false)} title="Send Test Email">
          <div className="space-y-4">
            <div>
              <label htmlFor="test-email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                id="test-email"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="test@example.com"
              />
            </div>
            <div>
              <label htmlFor="test-name" className="block text-sm font-medium text-gray-700">
                Recipient Name
              </label>
              <input
                type="text"
                id="test-name"
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                value={testName}
                onChange={(e) => setTestName(e.target.value)}
                placeholder="John Doe"
              />
            </div>
            <div>
              <label htmlFor="test-type" className="block text-sm font-medium text-gray-700">
                Email Type
              </label>
              <select
                id="test-type"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                value={testType}
                onChange={(e) => setTestType(e.target.value as 'wellness' | 'medical')}
              >
                <option value="wellness">Wellness Referral</option>
                <option value="medical">Medical Follow-up</option>
              </select>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setTestEmailModal(false)}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={sendTestEmail}
                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Send Test Email
              </button>
            </div>
          </div>
        </Modal>

        {/* Campaign Modal */}
        <Modal isOpen={campaignModal} onClose={() => setCampaignModal(false)} title="Send Email Campaigns">
          <div className="space-y-4">
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Select Referrals to Email:</h4>
              
              {/* Pending Wellness Referrals */}
              {pendingReferrals.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-purple-900 mb-2">Wellness Referrals (Pending)</h5>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                    {pendingReferrals.map((referral) => (
                      <label key={referral.id} className="flex items-center p-2 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedReferrals.includes(referral.id)}
                          onChange={() => toggleReferralSelection(referral.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-900">
                          {referral.patientName} ({referral.code}) - {referral.patientEmail}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Medical Referrals */}
              {medicalReferrals.length > 0 && (
                <div className="mb-4">
                  <h5 className="text-sm font-medium text-red-900 mb-2">Medical Referrals</h5>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-md">
                    {medicalReferrals.map((referral) => (
                      <label key={referral.id} className="flex items-center p-2 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedReferrals.includes(referral.id)}
                          onChange={() => toggleReferralSelection(referral.id)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <span className="ml-3 text-sm text-gray-900">
                          {referral.patientName} ({referral.code}) - {referral.patientEmail}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {pendingReferrals.length === 0 && medicalReferrals.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">No referrals available for email campaigns.</p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => setCampaignModal(false)}
                className="inline-flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Cancel
              </button>
              {pendingReferrals.length > 0 && (
                <button
                  type="button"
                  onClick={sendWellnessCampaign}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  Send Wellness Campaign
                </button>
              )}
              {medicalReferrals.length > 0 && (
                <button
                  type="button"
                  onClick={sendMedicalCampaign}
                  className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                  Send Medical Campaign
                </button>
              )}
            </div>
          </div>
        </Modal>
        </div>
      </div>
    </MainLayout>
  );
}
