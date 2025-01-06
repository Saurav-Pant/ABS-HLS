'use client'

import { useState } from 'react'
import VideoUploadForm from '../components/VideoUploadForm'
import VideoPlayer from '../components/VideoPlayer'
import React from 'react'

interface VideoData {
  id: string
  manifestUrl: string
  title: string
  description: string
  status: string
  processingProgress: number
  availableQualities: string[]
}

export default function Home() {
  const [videoData, setVideoData] = useState<VideoData | null>(null)

  const handleVideoUpload = (data: VideoData) => {
    setVideoData(data)
  }

  return (
    <main className="container mx-auto py-10 px-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <VideoUploadForm onUploadSuccess={(data: { id: string; manifestUrl: string; title: string; description: string; status: string; processingProgress: number; }) => {
            handleVideoUpload({...data, availableQualities: []})
          }} />
        </div>

        {videoData && videoData.status === 'READY' && (
          <div>
            <VideoPlayer
              manifestUrl={videoData.manifestUrl}
              title={videoData.title}
              description={videoData.description}
              availableQualities={videoData.availableQualities}
            />
          </div>
        )}
      </div>
    </main>
  )
}
