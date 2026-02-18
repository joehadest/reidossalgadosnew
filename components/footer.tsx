"use client"

import Image from "next/image"
import { MapPin, Phone, Instagram } from "lucide-react"
import { useAdmin } from "@/lib/admin-context"

export function Footer() {
  const { store } = useAdmin()

  return (
    <footer className="border-t border-border bg-card">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="relative h-10 w-10 rounded-full overflow-hidden flex-shrink-0">
                <Image
                  src="/logo/logoreidossalgados.png"
                  alt={store.name}
                  fill
                  className="object-cover"
                  sizes="40px"
                />
              </div>
              <span className="font-display font-bold text-lg">{store.name}</span>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">
              {store.about}
            </p>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Contato</h3>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a href={`tel:${store.phone.replace(/\D/g, "")}`} className="flex items-center gap-2 hover:text-foreground transition-colors">
                <Phone className="h-3.5 w-3.5" />
                {store.phone}
              </a>
              <a
                href={`https://instagram.com/${store.instagram.replace("@", "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Instagram className="h-3.5 w-3.5" />
                {store.instagram}
              </a>
            </div>
          </div>

          {/* Address */}
          <div>
            <h3 className="font-semibold text-sm mb-3">Endereco</h3>
            <div className="flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <div>
                <p>{store.address}</p>
                <p>{store.city}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs text-muted-foreground">
          <span>{store.name} &mdash; Todos os direitos reservados</span>
          <a
            href="/admin"
            className="hover:text-foreground transition-colors"
          >
            Painel Admin
          </a>
        </div>
      </div>
    </footer>
  )
}
