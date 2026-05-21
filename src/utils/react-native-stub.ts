/**
 * 🔥 react-native 웹 빌드 스텁
 * 
 * 웹 환경에서 react-native를 import하려고 할 때
 * 빌드 에러를 방지하기 위한 빈 모듈
 */

export default {};
export const Platform = {
  OS: 'web',
  select: (obj: any) => obj.web || obj.default,
};
