"use client"

import { useState, type ReactNode } from "react"
import Image from "next/image"
import { ImageIcon } from "lucide-react"
import { validMenuImage } from "@/lib/admin-menu"

export function MenuProductImage({
  src,
  name,
  sizes,
  eager = false,
  className = "",
  fallback,
}: {
  src: string
  name: string
  sizes: string
  eager?: boolean
  className?: string
  fallback?: ReactNode
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null)
  return (
    <div className={`relative overflow-hidden bg-secondary/70 ${className}`}>
      {src && validMenuImage(src) && failedSource !== src ? (
        <Image
          src={src}
          alt={name}
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          className="object-cover"
          onError={() => setFailedSource(src)}
        />
      ) : (
        (fallback ?? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground">
            <ImageIcon aria-hidden="true" className="h-7 w-7" />
            <span className="text-[11px]">{src ? "Foto indisponível" : "Sem foto"}</span>
          </div>
        ))
      )}
    </div>
  )
}
