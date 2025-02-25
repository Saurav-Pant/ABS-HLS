# HLS-ABS (HTTP Live Streaming - Adaptive Bitrate Streaming)

## Project Overview
HLS-ABS is a video processing platform that enables adaptive bitrate streaming using AWS services. The platform automatically transcodes uploaded videos into multiple quality levels and creates HLS streams for optimal playback across different devices and network conditions.

## Architecture
![HLS-ABS Architecture](./public/architecture.png)


## Features
- Video upload with thumbnail support
- Automatic video transcoding to multiple qualities (1080p, 720p, 480p)
- HLS (HTTP Live Streaming) manifest generation
- Adaptive bitrate streaming


## Tech Stack
### Frontend
- Next.js 15.1
- React 19
- TypeScript
- Tailwind CSS
- Video.js
- NextAuth.js for authentication
- Shadcn UI components

### Backend
- Node.js 18
- FFmpeg for video processing
- Prisma ORM
- MongoDB
- Docker

### AWS Services
- S3 (Video storage)
- ECS (Fargate for video processing)
- SQS (Message queue)
- Lambda (Serverless functions)
- CloudWatch (Logging)
- IAM (Access management)
- VPC (Networking)

## Prerequisites
- Node.js 18 or higher
- AWS Account with appropriate permissions
- MongoDB database
- Docker installed for local development
- FFmpeg installed locally for development

## Environment Variables
- Check the .env.example file for the required environment variables.
