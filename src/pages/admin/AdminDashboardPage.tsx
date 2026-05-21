/**
 * 🔥 Admin Dashboard Page
 * 
 * 경로: /admin
 * 
 * 역할:
 * - Admin 대시보드
 * - My Organizations
 * - Recent Events
 * - Quick Actions
 */

import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthUser } from "@/hooks/useAuthUser";
import { getEvents } from "@/services/eventService";
import { getOrganizations } from "@/services/organizationService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Calendar,
  Trophy,
  Users,
  Target,
  Plus,
  ArrowRight,
} from "lucide-react";
import { Loader2 } from "lucide-react";
import type { Event } from "@/types/event";

export default function AdminDashboardPage() {
  const navigate = useNavigate();
  const { profile } = useAuthUser();
  const [loading, setLoading] = useState(true);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [recentEvents, setRecentEvents] = useState<Event[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [orgsData, eventsData] = await Promise.all([
        getOrganizations().catch(() => []),
        getEvents({ limit: 5 }).catch(() => []),
      ]);

      setOrganizations(orgsData);
      setRecentEvents(eventsData);
    } catch (error) {
      console.error("데이터 로드 실패:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">대시보드</h1>
        <p className="text-gray-600 mt-1">관리 콘솔에 오신 것을 환영합니다.</p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">조직</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {organizations.length}
                </p>
              </div>
              <Building2 className="w-12 h-12 text-blue-500" />
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => navigate("/admin/organizations")}
            >
              조직 관리
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">대회</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {recentEvents.length}
                </p>
              </div>
              <Calendar className="w-12 h-12 text-green-500" />
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => navigate("/admin/events")}
            >
              대회 관리
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">빠른 작업</p>
                <p className="text-sm text-gray-600 mt-1">대회 생성</p>
              </div>
              <Plus className="w-12 h-12 text-purple-500" />
            </div>
            <Button
              className="w-full mt-4"
              onClick={() => navigate("/admin/events/create")}
            >
              대회 만들기
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* My Organizations */}
      {organizations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              내 조직
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {organizations.map((org) => (
                <Link
                  key={org.id}
                  to={`/admin/organizations/${org.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{org.name}</h3>
                    <p className="text-sm text-gray-500">{org.regionCode || "-"}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Events */}
      {recentEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              최근 대회
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recentEvents.map((event) => (
                <Link
                  key={event.id}
                  to={`/admin/events/${event.id}`}
                  className="flex items-center justify-between p-4 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <h3 className="font-semibold text-gray-900">{event.name}</h3>
                    <p className="text-sm text-gray-500">
                      {event.status === "ongoing" ? "진행중" : event.status === "completed" ? "완료" : "예정"}
                    </p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-gray-400" />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
