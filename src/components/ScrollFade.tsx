"use client"
import { useRef, useState, useEffect, useCallback } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export function ScrollFade({ children, className, fadeClassName }: {
  children: React.ReactNode
  className?: string
  fadeClassName?: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [show, setShow] = useState(false)

  const check = useCallback(() => {
    const el = ref.current
    if (!el) return
    setShow(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }, [])

  useEffect(() => {
    check()
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [check])

  return (
    <div className="relative">
      <div ref={ref} className={cn("overflow-y-auto", className)} onScroll={check}>
        {children}
      </div>
      {show && (
        <div className={cn(
          "pointer-events-none absolute bottom-0 left-0 right-0 h-10 flex items-end justify-center pb-1",
          "bg-gradient-to-b from-transparent to-popover/90",
          fadeClassName,
        )}>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground/60" />
        </div>
      )}
    </div>
  )
}
