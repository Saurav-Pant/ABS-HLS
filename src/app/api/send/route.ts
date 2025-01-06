import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from '../../../lib/prisma'
import { getServerSession } from "next-auth/next";
import { authOptions } from "../../../server/auth";

const s3Client = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

async function uploadFileToS3(file: Buffer, fileName: string, contentType: string) {
  const params = {
    Bucket: process.env.AWS_BUCKET_NAME!,
    Key: fileName,
    Body: file,
    ContentType: contentType,
  };

  try {
    await s3Client.send(new PutObjectCommand(params));
    return `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
  } catch (error) {
    console.error('Error uploading to S3:', error);
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const thumbnailFile = formData.get('thumbnail') as File;
    const videoFile = formData.get('video') as File;

    if (!title || !thumbnailFile || !videoFile) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const allowedImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const allowedVideoTypes = ['video/mp4'];

    if (!allowedImageTypes.includes(thumbnailFile.type)) {
      return NextResponse.json(
        { error: 'Invalid thumbnail format' },
        { status: 400 }
      );
    }

    if (!allowedVideoTypes.includes(videoFile.type)) {
      return NextResponse.json(
        { error: 'Invalid video format. Only MP4 is supported.' },
        { status: 400 }
      );
    }

    const videoId = crypto.randomBytes(12).toString('hex');

    const thumbnailUrl = await uploadFileToS3(
      Buffer.from(await thumbnailFile.arrayBuffer()),
      `thumbnails/${videoId}/${thumbnailFile.name}`,
      thumbnailFile.type
    );

    const videoUrl = await uploadFileToS3(
      Buffer.from(await videoFile.arrayBuffer()),
      `videos/${videoId}/${videoFile.name}`,
      videoFile.type
    );

    const video = await prisma.video.create({
      data: {
        id: videoId,
        title,
        description,
        thumbnailUrl,
        originalVideoUrl: videoUrl,
        userId: user.id,
        status: 'PROCESSING',
        processingProgress: 0,
        availableQualities: [],
      },
    });

    return NextResponse.json({
      message: 'Upload successful',
      data: {
        id: video.id,
        title: video.title,
        description: video.description,
        thumbnailUrl: video.thumbnailUrl,
        status: video.status,
        processingProgress: video.processingProgress,
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
