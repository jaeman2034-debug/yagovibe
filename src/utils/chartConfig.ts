// src/utils/chartConfig.ts
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from 'chart.js';

// Chart.js 컴포넌트 등록
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

// YAGO 브랜드 컬러 팔레트
export const YAGO_COLORS = {
  primary: '#4F46E5',
  gradientStart: '#6366F1',
  gradientEnd: '#A78BFA',
  pink: '#EC4899',
  blue: '#3B82F6',
  gray: '#6B7280',
  green: '#10B981',
  yellow: '#F59E0B',
  red: '#EF4444',
};

// 기본 차트 옵션
export const defaultChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: '#E5E7EB' },
      ticks: { stepSize: 1 }
    },
    x: {
      grid: { display: false }
    }
  }
};

// 막대 차트 데이터 생성 헬퍼
export const createBarChartData = (labels: string[], data: number[]) => ({
  labels,
  datasets: [
    {
      label: "명령 횟수",
      data,
      backgroundColor: [
        YAGO_COLORS.gradientStart,
        YAGO_COLORS.gradientEnd,
        YAGO_COLORS.pink,
        YAGO_COLORS.blue,
        YAGO_COLORS.gray,
        YAGO_COLORS.green,
        YAGO_COLORS.yellow,
      ],
      borderColor: YAGO_COLORS.primary,
      borderWidth: 2,
      borderRadius: 8,
      borderSkipped: false,
    },
  ],
});

// 도넛 차트 데이터 생성 헬퍼
export const createDoughnutChartData = (labels: string[], data: number[]) => ({
  labels,
  datasets: [
    {
      data,
      backgroundColor: [
        YAGO_COLORS.gradientStart,
        YAGO_COLORS.gradientEnd,
        YAGO_COLORS.pink,
        YAGO_COLORS.blue,
        YAGO_COLORS.gray,
      ],
      borderColor: '#FFFFFF',
      borderWidth: 2
    },
  ],
});
