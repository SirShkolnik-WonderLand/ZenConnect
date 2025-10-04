"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckSquare, Gift } from "lucide-react";
import { formatDate } from "@/lib/utils";
import type { TaskWithDetails } from "@/lib/contracts";

export default function TasksPage() {
  const [tasks, setTasks] = useState<TaskWithDetails[]>([]);
  const [filter, setFilter] = useState<"OPEN" | "COMPLETED">("OPEN");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, [filter]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tasks?status=${filter}`);
      const result = await response.json();
      
      if (result.ok) {
        setTasks(result.data);
      } else {
        console.error("Failed to fetch tasks:", result.error);
      }
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      const response = await fetch("/api/tasks/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });

      const result = await response.json();
      
      if (result.ok) {
        // Remove the completed task from the list if we're viewing open tasks
        if (filter === "OPEN") {
          setTasks(tasks.filter(t => t.id !== taskId));
        } else {
          // Refresh the list if we're viewing completed tasks
          fetchTasks();
        }
      } else {
        throw new Error(result.error.message);
      }
    } catch (error) {
      console.error("Failed to complete task:", error);
    }
  };

  const confirmComplete = (task: TaskWithDetails) => {
    const referrerName = task.referralCode?.owner.firstName 
      ? `${task.referralCode.owner.firstName} ${task.referralCode?.owner.lastName || ''}`.trim()
      : task.referralCode?.owner.email;
      
    if (confirm(`Confirm reward has been issued to ${referrerName}? This will complete the task.`)) {
      completeTask(task.id);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Tasks</h1>
        <p className="mt-2 text-gray-600">
          Manage referral reward tasks and track completion status
        </p>
      </div>

      {/* Filter Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setFilter("OPEN")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              filter === "OPEN"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Open Tasks
          </button>
          <button
            onClick={() => setFilter("COMPLETED")}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              filter === "COMPLETED"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
          >
            Completed Tasks
          </button>
        </nav>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === "OPEN" ? "No pending reward tasks" : "No completed tasks"}
              </h3>
              <p className="text-gray-600">
                {filter === "OPEN" 
                  ? "Tasks will appear here when referral codes are redeemed."
                  : "Completed reward tasks will appear here."
                }
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>
              {filter === "OPEN" ? "Pending Rewards" : "Completed Rewards"}
            </CardTitle>
            <CardDescription>
              {filter === "OPEN" 
                ? "Issue rewards for these referral redemptions"
                : "Previously completed reward tasks"
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tasks.map((task) => {
                const referrerName = task.referralCode?.owner.firstName 
                  ? `${task.referralCode.owner.firstName} ${task.referralCode?.owner.lastName || ''}`.trim()
                  : task.referralCode?.owner.email;
                  
                const newPatientName = task.newPatient?.firstName 
                  ? `${task.newPatient.firstName} ${task.newPatient?.lastName || ''}`.trim()
                  : task.newPatient?.email;

                return (
                  <div
                    key={task.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-gray-500">Created</div>
                        <div className="font-medium">{formatDate(task.createdAt)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Referrer</div>
                        <div className="font-medium">{referrerName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">New Patient</div>
                        <div className="font-medium">{newPatientName}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Code</div>
                        <div className="font-mono text-sm">{task.referralCode?.code}</div>
                      </div>
                      {filter === "COMPLETED" && task.completedAt && (
                        <div>
                          <div className="text-sm text-gray-500">Completed</div>
                          <div className="font-medium">{formatDate(task.completedAt)}</div>
                        </div>
                      )}
                    </div>
                    
                    {filter === "OPEN" && (
                      <Button
                        onClick={() => confirmComplete(task)}
                        size="sm"
                      >
                        <CheckSquare className="w-4 h-4 mr-2" />
                        Mark Complete
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}




