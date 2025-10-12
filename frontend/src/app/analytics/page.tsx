'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { apiService } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading';
import { MainLayout } from '@/components/layout/MainLayout';
import { BarChart3, TrendingUp, Users, Mail, Calendar, FileText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>({});
  const router = useRouter();

  useEffect(() => {
    if (!authService.isAuthenticated()) {
      router.push('/login');
      toast.error('Please log in to access this page.');
      return;
    }
    fetchAnalytics();
  }, [router]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [tasksResponse, servicesResponse, referralsResponse, uploadsResponse, auditResponse] = await Promise.all([
        apiService.getTasks(),
        apiService.getServices(),
        apiService.getReferrals(),
        apiService.getUploads(),
        apiService.getAuditStats(),
      ]);

      setStats({
        tasks: tasksResponse.tasks || [],
        services: servicesResponse.services || [],
        referrals: referralsResponse.referrals || [],
        uploads: uploadsResponse.uploads || [],
        auditStats: auditResponse || {},
      });
    } catch (error) {
      console.error('Error fetching analytics:', error);
      toast.error('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingState message="Loading analytics..." />;
  }

  const referralsByStatus = stats.referrals.reduce((acc: any, referral: any) => {
    acc[referral.status] = (acc[referral.status] || 0) + 1;
    return acc;
  }, {});

  const servicesByCategory = stats.services.reduce((acc: any, service: any) => {
    acc[service.category] = (acc[service.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <MainLayout title="Analytics Dashboard">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Header */}
          <div className="mb-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Analytics Dashboard</h1>
                <p className="mt-1 text-sm text-gray-600">
                  Comprehensive insights into your ZenConnect system performance
                </p>
              </div>
              <button
                onClick={fetchAnalytics}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <TrendingUp className="h-5 w-5 mr-2" />
                Refresh Data
              </button>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Users className="h-8 w-8 text-blue-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Total Referrals</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.referrals.length}</dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <Calendar className="h-8 w-8 text-green-500" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">Services</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.services.length}</dd>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">CSV Uploads</dt>
                      <dd className="text-lg font-medium text-gray-900">{stats.uploads.length}</dd>
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
                      <dt className="text-sm font-medium text-gray-500 truncate">Email Campaigns</dt>
                      <dd className="text-lg font-medium text-gray-900">
                        {referralsByStatus.email_sent || 0}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Referrals by Status */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Referrals by Status</h3>
              <div className="space-y-3">
                {Object.entries(referralsByStatus).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        status === 'pending' ? 'bg-yellow-400' :
                        status === 'completed' ? 'bg-green-400' :
                        status === 'email_sent' ? 'bg-blue-400' :
                        'bg-gray-400'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {status.replace('_', ' ')}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Services by Category */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Services by Category</h3>
              <div className="space-y-3">
                {Object.entries(servicesByCategory).map(([category, count]) => (
                  <div key={category} className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className={`w-3 h-3 rounded-full mr-3 ${
                        category === 'wellness' ? 'bg-purple-400' :
                        category === 'medical' ? 'bg-red-400' :
                        'bg-gray-400'
                      }`}></div>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {category}
                      </span>
                    </div>
                    <span className="text-sm font-bold text-gray-900">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white shadow rounded-lg">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">System Overview</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">
                Key performance indicators and system health metrics
              </p>
            </div>
            <div className="border-t border-gray-200">
              <dl>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Conversion Rate</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {stats.referrals.length > 0 
                      ? `${Math.round((referralsByStatus.completed || 0) / stats.referrals.length * 100)}%`
                      : '0%'
                    } (Completed referrals / Total referrals)
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Email Engagement</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {referralsByStatus.email_sent || 0} emails sent to {stats.referrals.length} total referrals
                  </dd>
                </div>
                <div className="bg-gray-50 px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Wellness vs Medical</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {servicesByCategory.wellness || 0} wellness services, {servicesByCategory.medical || 0} medical services
                  </dd>
                </div>
                <div className="bg-white px-4 py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                  <dt className="text-sm font-medium text-gray-500">Data Processing</dt>
                  <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">
                    {stats.uploads.length} CSV files processed, {stats.referrals.length} referrals generated
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}


