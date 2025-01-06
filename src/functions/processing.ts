// import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
// import { prisma } from '../lib/prisma';
// import crypto from "crypto";

// interface ProcessVideoParams {
//   videoUrl: string;
//   videoId: string;
//   userId: string;
// }

// export async function initiateVideoProcessing({ videoUrl, videoId, userId }: ProcessVideoParams) {
//   try {
//     const video = await prisma.video.create({
//       data: {
//         id: videoId,
//         status: 'PROCESSING',
//         originalVideoUrl: videoUrl,
//         userId: userId,
//       },
//     });

//     await simulateVideoProcessing(videoId);

//     return video;
//   } catch (error) {
//     console.error('Error initiating video processing:', error);
//     throw error;
//   }
// }

// async function simulateVideoProcessing(videoId: string) {
//   try {
//     await new Promise(resolve => setTimeout(resolve, 5000));

//     await prisma.video.update({
//       where: { id: videoId },
//       data: {
//         status: 'READY',
//         manifestUrl: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/processed/${videoId}/manifest.m3u8`,
//       },
//     });
//   } catch (error) {
//     console.error('Error processing video:', error);
//     await prisma.video.update({
//       where: { id: videoId },
//       data: {
//         status: 'FAILED',
//       },
//     });
//     throw error;
// }
// prisma.$disconnect();
// }
