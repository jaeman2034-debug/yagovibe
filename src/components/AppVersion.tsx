/**
 * 앱 버전 표시 컴포넌트
 * 
 * package.json의 version을 표시합니다.
 */

import packageJson from '../../package.json';

interface AppVersionProps {
  className?: string;
}

export default function AppVersion({ className = "" }: AppVersionProps) {
  return (
    <p className={`text-xs text-gray-400 ${className}`}>
      앱 버전: v{packageJson.version}
    </p>
  );
}

