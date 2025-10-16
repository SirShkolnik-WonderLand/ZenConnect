'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/lib/auth';
import { apiService } from '@/lib/api';
import { LoadingState } from '@/components/ui/loading';
import { MainLayout } from '@/components/layout/MainLayout';
import { Upload, FileText, Users, Calendar, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

interface Task {
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  user: {
    name: string;
    email: string;
  };
}

interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
}

interface Referral {
  id: string;
  code: string;
  patientName: string;
  patientEmail: string;
  status: string;
  referredBy: string;
}

interface Upload {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
}

export default function DashboardPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated
    if (!authService.isAuthenticated()) {
      router.push('/login');
      return;
    }

        // Fetch data from API using the new API service
        const fetchData = async () => {
          try {
            const [tasksResponse, servicesResponse, referralsResponse, uploadsResponse] = await Promise.all([
              apiService.getTasks(),
              apiService.getServices(),
              apiService.getReferrals(),
              apiService.getUploads({ limit: 5 }),
            ]);

            setTasks(tasksResponse.tasks || []);
            setServices(servicesResponse.services || []);
            setReferrals(referralsResponse.referrals || []);
            setUploads(uploadsResponse.uploads || []);
          } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load dashboard data');
          } finally {
            setLoading(false);
          }
        };

    fetchData();
  }, [router]);

  const handleLogout = () => {
    authService.logout();
    toast.success('Logged out successfully');
    router.push('/login');
  };

  if (loading) {
    return <LoadingState message="Loading dashboard..." />;
  }

  const user = authService.getUser();

  return (
    <MainLayout title="Dashboard">
      <div className="space-y-6">
        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <button
                        onClick={() => router.push('/csv-upload')}
                        className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Upload className="h-5 w-5 mr-2" />
                        Upload Jane App CSV
                      </button>
                      <button
                        onClick={() => router.push('/services')}
                        className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Calendar className="h-5 w-5 mr-2" />
                        Manage Services
                      </button>
                      <button
                        onClick={() => router.push('/mailchimp')}
                        className="flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                      >
                        <Mail className="h-5 w-5 mr-2" />
                        MailChimp Integration
                      </button>
              </div>
            </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{tasks.length}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Total Tasks</p>
                  <p className="text-lg font-semibold text-gray-900">{tasks.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{services.length}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Services</p>
                  <p className="text-lg font-semibold text-gray-900">{services.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{referrals.length}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">Referrals</p>
                  <p className="text-lg font-semibold text-gray-900">{referrals.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{uploads.length}</span>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-500">CSV Uploads</p>
                  <p className="text-lg font-semibold text-gray-900">{uploads.length}</p>
                </div>
              </div>
            </div>
          </div>

        {/* Tasks Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Tasks</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Latest tasks in the system</p>
            </div>
            <ul className="divide-y divide-gray-200">
              {tasks && tasks.length > 0 ? tasks.slice(0, 5).map((task) => (
                <li key={task.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          task.status === 'completed' ? 'bg-green-100 text-green-800' :
                          task.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{task.title}</div>
                        <div className="text-sm text-gray-500">{task.description}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Priority: {task.priority}
                    </div>
                  </div>
                </li>
              )) : (
                <li className="px-4 py-8 text-center text-gray-500">
                  No tasks found
                </li>
              )}
            </ul>
          </div>

        {/* Referrals Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-5 sm:px-6">
              <h3 className="text-lg leading-6 font-medium text-gray-900">Recent Referrals</h3>
              <p className="mt-1 max-w-2xl text-sm text-gray-500">Latest patient referrals</p>
            </div>
            <ul className="divide-y divide-gray-200">
              {referrals && referrals.length > 0 ? referrals.map((referral) => (
                <li key={referral.id} className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {referral.code}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{referral.patientName}</div>
                        <div className="text-sm text-gray-500">Referred by: {referral.referredBy}</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-500">
                      Status: {referral.status}
                    </div>
                  </div>
                </li>
              )) : (
                <li className="px-4 py-8 text-center text-gray-500">
                  No referrals found
                </li>
              )}
            </ul>
          </div>
      </div>
    </MainLayout>
  );
}
