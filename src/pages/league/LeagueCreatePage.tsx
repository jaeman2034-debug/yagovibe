/**
 * 🔥 리그 생성 페이지
 * 
 * 경로: /leagues/create
 * 
 * 역할:
 * - 리그 정보 입력
 * - 리그 생성
 * - 권한: 인증된 사용자
 */

import { useNavigate, useSearchParams } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '@/context/AuthProvider';
import { createLeague } from '@/services/leagueService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function LeagueCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const federationSlug = searchParams.get("federation") || "";

  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [sportType, setSportType] = useState('football');
  const [season, setSeason] = useState(new Date().getFullYear().toString());
  const [region, setRegion] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [description, setDescription] = useState('');
  const [mode, setMode] = useState<"tournament" | "league">("tournament");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !name || !startDate || !endDate) {
      alert('필수 항목을 입력해주세요.');
      return;
    }

    try {
      setLoading(true);

      const leagueId = await createLeague({
        name,
        sportType,
        season,
        region: region || '전국',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || undefined,
        createdBy: user.uid,
        mode,
        federationSlug: federationSlug || undefined,
      });

      if (federationSlug) {
        navigate(`/federations/${federationSlug}/admin?tab=league&leagueId=${leagueId}`);
      } else {
        navigate(`/leagues/${leagueId}`);
      }
    } catch (error: any) {
      console.error('리그 생성 실패:', error);
      alert(error.message || '리그 생성에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto p-6">
        {/* 헤더 */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/leagues')}
            className="text-sm text-gray-600 hover:text-gray-900 mb-4 flex items-center gap-1"
          >
            <ArrowLeft className="w-4 h-4" />
            리그 목록으로 돌아가기
          </button>
          <h1 className="text-2xl font-bold">{mode === "tournament" ? "대회 생성" : "리그 생성"}</h1>
        </div>
          {/* 리그 타입 */}
          <div>
            <Label htmlFor="mode">리그 타입 *</Label>
            <select
              id="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as "tournament" | "league")}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="tournament">대회 (tournament)</option>
              <option value="league">리그 (league)</option>
            </select>
          </div>


        {/* 폼 */}
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm p-6 space-y-6">
          {/* 리그 이름 */}
          <div>
            <Label htmlFor="name">리그 이름 *</Label>
            <Input
              id="name"
              type="text"
              placeholder="예: 노원 풋살 리그 2026"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2"
              required
            />
          </div>

          {/* 종목 */}
          <div>
            <Label htmlFor="sportType">종목 *</Label>
            <select
              id="sportType"
              value={sportType}
              onChange={(e) => setSportType(e.target.value)}
              className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="football">축구</option>
              <option value="basketball">농구</option>
              <option value="baseball">야구</option>
            </select>
          </div>

          {/* 시즌 */}
          <div>
            <Label htmlFor="season">시즌 *</Label>
            <Input
              id="season"
              type="text"
              placeholder="예: 2026"
              value={season}
              onChange={(e) => setSeason(e.target.value)}
              className="mt-2"
              required
            />
          </div>

          {/* 지역 */}
          <div>
            <Label htmlFor="region">지역</Label>
            <Input
              id="region"
              type="text"
              placeholder="예: 서울 노원구"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              className="mt-2"
            />
          </div>

          {/* 기간 */}
          <div>
            <Label htmlFor="startDate">시작일 *</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              min={today}
              className="mt-2"
              required
            />
          </div>

          <div>
            <Label htmlFor="endDate">종료일 *</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate || today}
              className="mt-2"
              required
            />
          </div>

          {/* 설명 */}
          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              placeholder="리그에 대한 설명을 입력하세요"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-2"
              rows={4}
            />
          </div>

          {/* 제출 버튼 */}
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/leagues')}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  생성 중...
                </>
              ) : (
                '리그 생성'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
