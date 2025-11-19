import { useCallback, useState } from "react";

export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((text: string) => {
    setMessage(text);
  }, []);

  const hideToast = useCallback(() => {
    setMessage(null);
  }, []);

  return { message, showToast, hideToast };
}


