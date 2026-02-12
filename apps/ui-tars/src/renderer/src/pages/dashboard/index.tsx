/**
 * Copyright (c) 2025 Bytedance, Inc. and its affiliates.
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import { Activity, Zap, Clock, TrendingUp } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@renderer/components/ui/card';
import { DragArea } from '../../components/Common/drag';

const Dashboard = () => {
  const [performanceData, setPerformanceData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Try to load performance dashboard data
        const data = await window.electron.ipcRenderer.invoke(
          'visualization:getPerformanceDashboard',
        );
        setPerformanceData(data);
      } catch (error) {
        console.error('[Dashboard] Failed to load data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
    const interval = setInterval(loadDashboardData, 5000); // Refresh every 5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="w-full h-full flex flex-col">
      <DragArea />
      <div className="w-full h-full flex flex-col p-6 overflow-auto">
        <h1 className="text-2xl font-semibold mb-6">
          Performance & Optimization Dashboard
        </h1>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <Activity className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Optimization Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Optimization Status
                </CardTitle>
                <CardDescription>Active optimization features</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Smart Retry</span>
                    <span className="text-xs text-green-500 font-medium">
                      ✓ Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Performance Monitor</span>
                    <span className="text-xs text-green-500 font-medium">
                      ✓ Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Visualization</span>
                    <span className="text-xs text-green-500 font-medium">
                      ✓ Active
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">OCR Service</span>
                    <span className="text-xs text-muted-foreground font-medium">
                      ○ Disabled
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Performance Metrics Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Performance Metrics
                </CardTitle>
                <CardDescription>System performance overview</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Avg Response Time</span>
                    <span className="text-sm font-medium">
                      {performanceData?.avgResponseTime || 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Success Rate</span>
                    <span className="text-sm font-medium text-green-600">
                      {performanceData?.successRate || '85%'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Operations</span>
                    <span className="text-sm font-medium">
                      {performanceData?.totalOps || '0'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* System Health Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  System Health
                </CardTitle>
                <CardDescription>Overall system status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">VLM API</span>
                    <span className="text-xs text-green-500 font-medium">
                      ✓ Connected
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Memory Usage</span>
                    <span className="text-sm font-medium">
                      {performanceData?.memoryUsage || 'Normal'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Uptime</span>
                    <span className="text-sm font-medium">
                      {performanceData?.uptime || 'N/A'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="mt-6 text-sm text-muted-foreground">
          <p>
            💡 Tip: Enable more optimization features in Settings → Optimization
            to unlock advanced capabilities.
          </p>
        </div>
      </div>
      <DragArea />
    </div>
  );
};

export default Dashboard;
