"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronDown, ChevronRight, Copy } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { AuditLogEntry } from "@/lib/contracts";

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filters, setFilters] = useState({
    search: "",
    action: "",
    batchId: "",
    fromDate: "",
    toDate: "",
  });

  useEffect(() => {
    fetchAuditLogs();
  }, [filters]);

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.search) params.append("search", filters.search);
      if (filters.action) params.append("action", filters.action);
      if (filters.batchId) params.append("batchId", filters.batchId);
      if (filters.fromDate) params.append("from", filters.fromDate);
      if (filters.toDate) params.append("to", filters.toDate);

      const response = await fetch(`/api/audit?${params.toString()}`);
      const result = await response.json();
      
      if (result.ok) {
        setLogs(result.data);
      } else {
        console.error("Failed to fetch audit logs:", result.error);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const copyPayload = async (payload: any) => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      console.log("Payload copied to clipboard");
    } catch (err) {
      console.error("Failed to copy payload:", err);
    }
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case "email_sent": return "bg-green-100 text-green-800";
      case "row_error": return "bg-red-100 text-red-800";
      case "unknown_service_deferred": return "bg-yellow-100 text-yellow-800";
      case "referral_redeemed": return "bg-blue-100 text-blue-800";
      case "batch_summary": return "bg-gray-100 text-gray-800";
      case "duplicate_skip": return "bg-orange-100 text-orange-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="mt-2 text-gray-600">
          Immutable logs of all system operations and changes
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <Input
                placeholder="Search payload..."
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Action
              </label>
              <select
                value={filters.action}
                onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All Actions</option>
                <option value="email_sent">Email Sent</option>
                <option value="row_error">Row Error</option>
                <option value="unknown_service_deferred">Unknown Service</option>
                <option value="referral_redeemed">Referral Redeemed</option>
                <option value="batch_summary">Batch Summary</option>
                <option value="duplicate_skip">Duplicate Skip</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Batch ID
              </label>
              <Input
                placeholder="Batch ID..."
                value={filters.batchId}
                onChange={(e) => setFilters({ ...filters, batchId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                From Date
              </label>
              <Input
                type="date"
                value={filters.fromDate}
                onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                To Date
              </label>
              <Input
                type="date"
                value={filters.toDate}
                onChange={(e) => setFilters({ ...filters, toDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Logs</CardTitle>
          <CardDescription>
            {logs.length} logs found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No audit logs match these filters.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="border rounded-lg">
                  <div 
                    className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => toggleExpanded(log.id)}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        {expandedLogs.has(log.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                          <div className="text-sm text-gray-500">Time</div>
                          <div className="font-medium">{formatDate(log.createdAt)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Action</div>
                          <div className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionBadgeColor(log.action)}`}>
                            {log.action}
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Batch</div>
                          <div className="font-mono text-sm">{log.batchId || "N/A"}</div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-500">Actor</div>
                          <div className="text-sm">{log.actorId || "System"}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {expandedLogs.has(log.id) && (
                    <div className="border-t bg-gray-50 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-gray-900">Payload</h4>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyPayload(log.payload)}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy JSON
                        </Button>
                      </div>
                      <pre className="text-xs bg-white p-3 rounded border overflow-x-auto">
                        {JSON.stringify(log.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}




