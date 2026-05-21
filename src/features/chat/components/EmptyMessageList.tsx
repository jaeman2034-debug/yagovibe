import React from "react";

/**
 * 빈 메시지 리스트 컴포넌트
 * 메시지가 없을 때 표시되는 안내 메시지
 */
export function EmptyMessageList() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100%",
        color: "#9ca3af",
        fontSize: 14,
      }}
    >
      메시지를 입력해 대화를 시작하세요.
    </div>
  );
}
