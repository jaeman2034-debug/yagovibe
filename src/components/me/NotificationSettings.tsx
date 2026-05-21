/**
 * 🔥 알림 설정 컴포넌트
 * 
 * 역할:
 * - 개인별 알림 설정 관리
 * - 토글 즉시 저장
 * - 필수 알림은 끌 수 없음 표시
 */

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthProvider';
import { Bell, Lock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface NotificationSettings {
  // 중요 알림 (기본 ON, 끄기 가능)
  joinApproved?: boolean;
  associationJoined?: boolean;
  roleChanged?: boolean;
  
  // 선택 알림 (기본 OFF)
  teamNotice?: boolean;
  marketing?: boolean;
  
  updatedAt?: any;
}

export function NotificationSettings() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<NotificationSettings>({
    joinApproved: true,
    associationJoined: true,
    roleChanged: true,
    teamNotice: false,
    marketing: false,
  });

  // 설정 로드
  useEffect(() => {
    if (!user?.uid) return;

    const loadSettings = async () => {
      try {
        const settingsRef = doc(db, `users/${user.uid}/notificationSettings/default`);
        const settingsSnap = await getDoc(settingsRef);
        
        if (settingsSnap.exists()) {
          const data = settingsSnap.data() as NotificationSettings;
          setSettings({
            joinApproved: data.joinApproved !== false, // 기본값: true
            associationJoined: data.associationJoined !== false, // 기본값: true
            roleChanged: data.roleChanged !== false, // 기본값: true
            teamNotice: data.teamNotice === true, // 기본값: false
            marketing: data.marketing === true, // 기본값: false
            ...data,
          });
        }
      } catch (error) {
        console.error('알림 설정 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [user?.uid]);

  // 설정 저장
  const updateSetting = async (key: keyof NotificationSettings, value: boolean) => {
    if (!user?.uid || saving) return;

    setSaving(true);
    
    try {
      const newSettings = { ...settings, [key]: value, updatedAt: serverTimestamp() };
      setSettings(newSettings);

      const settingsRef = doc(db, `users/${user.uid}/notificationSettings/default`);
      await setDoc(settingsRef, newSettings, { merge: true });

      toast.success('설정이 저장되었어요');
    } catch (error) {
      console.error('알림 설정 저장 실패:', error);
      toast.error('설정 저장에 실패했어요');
      // 롤백
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Bell className="w-5 h-5 text-gray-700" />
        <h2 className="text-lg font-semibold text-gray-900">알림 설정</h2>
      </div>

      {/* 안내 메시지 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          💡 중요 알림은 항상 보내드려요. (팀장 위임, 팀에서 제외 등)
        </p>
      </div>

      {/* 중요 알림 (기본 ON, 끄기 가능) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">중요 알림</h3>
        
        <NotificationToggle
          label="팀 가입 승인 알림"
          description="팀 가입이 승인되면 알려드려요"
          value={settings.joinApproved ?? true}
          onChange={(value) => updateSetting('joinApproved', value)}
          disabled={saving}
        />

        <NotificationToggle
          label="협회 가입 알림"
          description="우리 팀이 협회에 가입하면 알려드려요"
          value={settings.associationJoined ?? true}
          onChange={(value) => updateSetting('associationJoined', value)}
          disabled={saving}
        />

        <NotificationToggle
          label="역할 변경 알림"
          description="팀 내 역할이 변경되면 알려드려요"
          value={settings.roleChanged ?? true}
          onChange={(value) => updateSetting('roleChanged', value)}
          disabled={saving}
        />
      </div>

      {/* 선택 알림 (기본 OFF) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">선택 알림</h3>
        
        <NotificationToggle
          label="팀 공지 알림"
          description="팀 공지가 등록되면 알려드려요"
          value={settings.teamNotice ?? false}
          onChange={(value) => updateSetting('teamNotice', value)}
          disabled={saving}
        />

        <NotificationToggle
          label="마케팅 알림"
          description="이벤트 및 프로모션 소식을 알려드려요"
          value={settings.marketing ?? false}
          onChange={(value) => updateSetting('marketing', value)}
          disabled={saving}
        />
      </div>

      {/* 필수 알림 (끌 수 없음) */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-700">필수 알림</h3>
        
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">팀장 위임 알림</span>
          </div>
          <p className="text-xs text-gray-500 ml-6">
            팀장으로 위임되면 항상 알려드려요
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">팀에서 제외 알림</span>
          </div>
          <p className="text-xs text-gray-500 ml-6">
            팀에서 제외되면 항상 알려드려요
          </p>
        </div>
      </div>
    </div>
  );
}

interface NotificationToggleProps {
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

function NotificationToggle({
  label,
  description,
  value,
  onChange,
  disabled,
}: NotificationToggleProps) {
  return (
    <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
      <div className="flex-1">
        <div className="font-medium text-gray-900 text-sm mb-1">{label}</div>
        <div className="text-xs text-gray-500">{description}</div>
      </div>
      <button
        onClick={() => onChange(!value)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          value ? 'bg-blue-600' : 'bg-gray-300'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            value ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
}
