"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { 
  LayoutDashboard, 
  Upload, 
  HelpCircle, 
  Users, 
  CheckSquare, 
  FileText, 
  Settings,
  LogOut,
  Activity,
  Database,
  Mail,
  Zap
} from "lucide-react";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

interface HealthStatus {
  db: "ok" | "down" | "unknown";
  mailchimp: "ok" | "down" | "unknown";
}

interface User {
  email: string;
  role: string;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [health, setHealth] = useState<HealthStatus>({ db: "unknown", mailchimp: "unknown" });
  const [user, setUser] = useState<User | null>(null);

  const navItems = [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", exact: true },
    { href: "/dashboard/upload", icon: Upload, label: "Upload CSV" },
    { href: "/dashboard/services/unknown", icon: HelpCircle, label: "Unknown Services" },
    { href: "/dashboard/referrals", icon: Users, label: "Referrals" },
    { href: "/dashboard/tasks", icon: CheckSquare, label: "Tasks" },
    { href: "/dashboard/audit", icon: FileText, label: "Audit Logs" },
    { href: "/dashboard/settings", icon: Settings, label: "Settings" },
  ];

  useEffect(() => {
    // Check health status
    const checkHealth = async () => {
      try {
        const response = await fetch("/api/healthz");
        const data = await response.json();
        setHealth({
          db: data.db ? "ok" : "down",
          mailchimp: data.mailchimp ? "ok" : "down"
        });
      } catch (error) {
        setHealth({ db: "down", mailchimp: "down" });
      }
    };

    // Get user info
    const getUserInfo = async () => {
      try {
        const response = await fetch("/api/auth/me");
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Mock user for development
          setUser({ email: "admin@clinic.com", role: "ADMIN" });
        }
      } catch (error) {
        setUser({ email: "admin@clinic.com", role: "ADMIN" });
      }
    };

    checkHealth();
    getUserInfo();
    
    // Check health every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
    } catch (error) {
      console.error("Logout error:", error);
      router.push("/login");
    }
  };

  const isActive = (href: string, exact?: boolean) => {
    if (exact) {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <div className="sidebar">
        {/* Logo */}
        <div className="logo-section">
          <div className="logo">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div className="logo-text">ZenConnect</div>
        </div>

        {/* Navigation */}
        <nav className="nav-section">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-item ${isActive(item.href, item.exact) ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Health Status */}
        <div className="health-section">
          <div className="health-title">System Status</div>
          <div className="health-item">
            <div className="health-indicator">
              <div className={`health-dot ${health.db}`}></div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Database</span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>
              {health.db}
            </span>
          </div>
          <div className="health-item">
            <div className="health-indicator">
              <div className={`health-dot ${health.mailchimp}`}></div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>Mailchimp</span>
            </div>
            <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '600' }}>
              {health.mailchimp}
            </span>
          </div>
        </div>

        {/* User Section */}
        <div className="user-section">
          <div className="user-avatar">
            {user?.email?.charAt(0).toUpperCase() || "A"}
          </div>
          <div className="user-info">
            <div className="user-email">{user?.email || "Loading..."}</div>
            <div className="user-role">{user?.role || "ADMIN"}</div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '8px',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
              e.currentTarget.style.color = '#ef4444';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'none';
              e.currentTarget.style.color = '#64748b';
            }}
            title="Sign out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {/* Top Bar */}
        <div className="top-bar">
          <div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#1e293b' }}>
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Activity className="w-4 h-4" style={{ color: health.db === 'ok' && health.mailchimp === 'ok' ? '#10b981' : '#ef4444' }} />
            <span style={{ 
              fontSize: '14px', 
              fontWeight: '500',
              color: health.db === 'ok' && health.mailchimp === 'ok' ? '#10b981' : '#ef4444'
            }}>
              {health.db === 'ok' && health.mailchimp === 'ok' ? 'All Systems Operational' : 'System Issues Detected'}
            </span>
          </div>
        </div>

        {/* Page Content */}
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}