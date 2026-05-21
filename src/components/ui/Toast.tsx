import { createContext, useContext, useState, ReactNode } from "react"

type ToastContextType = {
  toast: (msg: string) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null)

  const toast = (msg: string) => {
    setMessage(msg)
    setTimeout(() => setMessage(null), 2500)
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}

      {message && (
        <div style={{
          position: "fixed",
          bottom: "90px",
          left: "50%",
          transform: "translateX(-50%)",
          background: "black",
          color: "white",
          padding: "12px 18px",
          borderRadius: "12px",
          zIndex: 9999,
          fontSize: "14px"
        }}>
          {message}
        </div>
      )}
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error("useToast must be used inside ToastProvider")
  return ctx
}
