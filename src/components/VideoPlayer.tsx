'use client'

import { useEffect, useRef } from 'react'
import videojs from 'video.js'
import 'video.js/dist/video-js.css'
import type Player from 'video.js/dist/types/player'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select'

interface VideoPlayerProps {
  manifestUrl: string
  title: string
  description?: string
  availableQualities: string[]
}

export default function VideoPlayer({
  manifestUrl,
  title,
  description,
  availableQualities
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const playerRef = useRef<Player | null>(null)

  useEffect(() => {
    if (!videoRef.current) return

    playerRef.current = videojs(videoRef.current, {
      controls: true,
      fluid: true,
      html5: {
        hls: {
          enableLowInitialPlaylist: true,
          smoothQualityChange: true,
          overrideNative: true,
        }
      }
    })

    playerRef.current.src({
      src: manifestUrl,
      type: 'application/x-mpegURL'
    })

    return () => {
      if (playerRef.current) {
        playerRef.current.dispose()
      }
    }
  }, [manifestUrl])

  const handleQualityChange = (quality: string) => {
    if (!playerRef.current) return
    const player = playerRef.current
    // @ts-ignore
    const qualityLevels = player.qualityLevels()

    for (let i = 0; i < qualityLevels.length; i++) {
      const level = qualityLevels[i]
      const height = level.height
      const qualityString = `${height}p`

      if (qualityString === quality) {
        for (let j = 0; j < qualityLevels.length; j++) {
          qualityLevels[j].enabled = (j === i)
        }
        break
      }
    }
  }

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div data-vjs-player>
            <video
              ref={videoRef}
              className="video-js vjs-big-play-centered"
            />
          </div>

          {availableQualities?.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm">Quality:</span>
              <Select onValueChange={handleQualityChange}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Auto" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto</SelectItem>
                  {availableQualities.map((quality) => (
                    <SelectItem key={quality} value={quality}>
                      {quality}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
