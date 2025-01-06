'use client'

import { useState } from 'react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Progress } from '../components/ui/progress'
import { useToast } from '../hooks/use-toast'

interface VideoUploadFormProps {
  onUploadSuccess: (data: {
    id: string;
    manifestUrl: string;
    title: string;
    description: string;
    status: string;
    processingProgress: number;
  }) => void;
}

export default function VideoUploadForm({ onUploadSuccess }: VideoUploadFormProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setUploading(true)
    setProgress(0)

    const form = e.currentTarget
    const formData = new FormData(form)

    try {
      const response = await fetch('/api/send', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const data = await response.json()
      onUploadSuccess(data.data)

      pollVideoStatus(data.data.id)

      toast({
        title: 'Success',
        description: 'Video uploaded successfully and is being processed',
      })
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to upload video',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
      form.reset()
    }
  }

  const pollVideoStatus = async (videoId: string) => {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`/api/videos/${videoId}/status`)
        const data = await response.json()

        setProgress(data.processingProgress)

        if (data.status === 'READY') {
          clearInterval(interval)
          onUploadSuccess(data)
        } else if (data.status === 'FAILED') {
          clearInterval(interval)
          toast({
            title: 'Error',
            description: data.errorMessage || 'Video processing failed',
            variant: 'destructive',
          })
        }
      } catch (error) {
        clearInterval(interval)
      }
    }, 5000) 
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-md">
      <div className="space-y-2">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" />
      </div>

      <div className="space-y-2">
        <Label htmlFor="thumbnail">Thumbnail</Label>
        <Input
          id="thumbnail"
          name="thumbnail"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="video">Video</Label>
        <Input
          id="video"
          name="video"
          type="file"
          accept="video/mp4"
          required
        />
      </div>

      {progress > 0 && progress < 100 && (
        <div className="space-y-2">
          <Label>Processing Progress</Label>
          <Progress value={progress} />
        </div>
      )}

      <Button type="submit" disabled={uploading} className="w-full">
        {uploading ? 'Uploading...' : 'Upload Video'}
      </Button>
    </form>
  )
}
