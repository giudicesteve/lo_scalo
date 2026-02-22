"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { Logo } from "@/components/Logo"
import { useLanguage } from "@/store/language"
import { ExternalLink, ArrowLeft } from "lucide-react"

// Template playlist - da aggiornare manualmente ogni anno
// Aggiungere nuove playlist in cima alla lista
const playlists = [
  {
    id: "playlist-1",
    title: "Morning 1",
    image: "/playlists/Lo Scalo - Morning cover 1.jpg",
    spotifyUrl: "https://open.spotify.com/playlist/358OslWcEpWegWVjHtBt9h",
    year: "2017",
  },
  {
    id: "playlist-2",
    title: "Morning 2",
    image: "/playlists/Lo Scalo - Morning cover 2.jpg",
    spotifyUrl: "https://open.spotify.com/playlist/3NIwbCCuUkCYkCDqpfG8rl",
    year: "2018",
  },
  {
    id: "playlist-3",
    title: "Morning 3",
    image: "/playlists/Lo Scalo - Morning cover 3.jpg",
    spotifyUrl: "https://open.spotify.com/playlist/4o6wISDCYEGtZUTeXBfLnX",
    year: "2019",
  },
  {
    id: "playlist-4",
    title: "Morning 4",
    image: "/playlists/Lo Scalo - Morning cover 4.jpg",
    spotifyUrl: "https://open.spotify.com/playlist/7u0ZqQS5NcifCiCedoQDXx",
    year: "2020",
  },
  {
    id: "playlist-5",
    title: "Morning 5",
    image: "/playlists/Lo Scalo - Morning cover 5.jpg",
    spotifyUrl: "https://open.spotify.com/playlist/6VUEA1edOYIwklK5BrXYAD",
    year: "2021",
  },
  {
    id: "playlist-6",
    title: "Morning 6",
    image: "/playlists/Lo Scalo - Morning cover 6.jpg",
    spotifyUrl: "https://open.spotify.com/playlist/786PMB9v8ql9CLBzRDRMPe",
    year: "2022",
  },
  {
    id: "playlist-7",
    title: "Morning 7",
    image: "/playlists/Lo Scalo - Morning cover 7.png",
    spotifyUrl: "https://open.spotify.com/playlist/15Cz3Y3KwEsqsespTwRtzB",
    year: "2023",
  },
  {
    id: "playlist-8",
    title: "Morning 8",
    image: "/playlists/Lo Scalo - Morning cover 8.jpg",
    spotifyUrl: "https://open.spotify.com/playlist/0w3C8vLpGoiFmJoh1E2U84",
    year: "2024",
  },
  {
    id: "playlist-9",
    title: "Morning 9",
    image: "/playlists/Lo Scalo - Morning cover 9.jpg",
    spotifyUrl: "https://open.spotify.com/playlist/3nPujQVFww1jyj7nSqS0P7",
    year: "2025",
  },
]

export default function PlaylistPage() {
  const { t } = useLanguage()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // Placeholder durante SSR
  if (!mounted) {
    return (
      <main className="min-h-screen bg-brand-cream flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="animate-pulse max-w-6xl w-full">
            <div className="h-8 bg-brand-light-gray/50 rounded w-1/3 mx-auto mb-4"></div>
            <div className="h-4 bg-brand-light-gray/50 rounded w-2/3 mx-auto mb-12"></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="aspect-square bg-brand-light-gray/50 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-brand-cream flex flex-col relative">
      {/* Freccia indietro */}
      <Link 
        href="/home" 
        className="absolute top-6 left-6 z-10 p-2 text-brand-dark"
      >
        <ArrowLeft className="w-6 h-6" />
      </Link>

      {/* Content */}
      <div className="flex-1 py-12 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header con Logo */}
          <div className="flex flex-col items-center mb-8">
            <Logo variant="vertical" className="w-64 h-auto mb-12" />
            
           
            {/* Introduzione */}
            <p className="text-body-lg text-brand-gray text-center max-w-2xl leading-relaxed">
              {t('playlist.intro')}
            </p>
          </div>

          {/* Griglia Playlist */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            {playlists.map((playlist) => (
              <a
                key={playlist.id}
                href={playlist.spotifyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group block bg-white rounded-2xl overflow-hidden shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
              >
                {/* Copertina */}
                <div className="aspect-square relative overflow-hidden bg-brand-light-gray">
                  <Image
                    src={playlist.image}
                    alt={playlist.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <Image
                    src={playlist.image}
                    alt={playlist.title}
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {/* Overlay con icona Spotify */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-300 flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform translate-y-4 group-hover:translate-y-0">
                      <div className="bg-brand-primary text-white px-4 py-2 rounded-full flex items-center gap-2 text-body-sm font-medium">
                        <ExternalLink className="w-4 h-4" />
                        {t('playlist.open-spotify')}
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Info */}
                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-title-sm font-bold text-brand-dark group-hover:text-brand-primary transition-colors">
                      {playlist.title}
                    </h3>
                    <span className="text-label-sm text-brand-gray bg-brand-light-gray px-2 py-1 rounded-full">
                      {playlist.year}
                    </span>
                  </div>
                </div>
              </a>
            ))}
          </div>

          {/* Footer */}
          <div className="flex justify-center">
            <Link
              href="/home"
              className="px-8 py-3 rounded-full border-2 border-brand-dark text-brand-dark hover:bg-brand-dark hover:text-white transition-all duration-200"
            >
              <span className="text-title-md font-medium">{t('common.back')}</span>
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
