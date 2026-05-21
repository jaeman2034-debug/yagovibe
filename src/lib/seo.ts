// 🔥 동적 title 설정
export const setTitle = (title?: string) => {
    const base = "YAGO SPORTS";
    document.title = title ? `${title} | ${base}` : base;
  };
  
  // 🔥 description 메타태그 설정
  export const setMeta = (desc?: string) => {
    const d = desc || "AI 기반 스마트 중고거래 플랫폼";
    let tag = document.querySelector('meta[name="description"]');
  
    if (!tag) {
      tag = document.createElement("meta");
      tag.setAttribute("name", "description");
      document.head.appendChild(tag);
    }
  
    tag.setAttribute("content", d);
  };
