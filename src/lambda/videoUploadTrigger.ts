import { S3Event } from 'aws-lambda';
import { S3, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { SQS } from '@aws-sdk/client-sqs';
// import { createPrismaClient } from '../lib/createPrismaClient';

export const handler = async (event: S3Event) => {
    console.log('S3 Event received:', JSON.stringify(event, null, 2));

    const s3 = new S3({
        region: process.env.CUSTOM_AWS_REGION || 'ap-south-1',
    });

    const sqs = new SQS({
        region: process.env.CUSTOM_AWS_REGION || 'ap-south-1',
        maxAttempts: 3,
        requestHandler: {
            socketTimeout: 10000
        }
    });

    // const prisma = createPrismaClient();

    try {
        const record = event.Records[0];
        console.log('Processing S3 record:', {
            bucket: record.s3.bucket.name,
            key: record.s3.object.key
        });

        const bucketName = record.s3.bucket.name;
        const key = decodeURIComponent(record.s3.object.key.replace(/\+/g, ' '));
        const videoId = key.split('/')[1];

        if (!videoId) {
            throw new Error('Could not extract video ID from key');
        }

        // Generate a pre-signed URL for the S3 object
        const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
        const signedUrl = await getSignedUrl(s3, command, { expiresIn: 3600 });

        const message = {
            videoId,
            bucket: bucketName,
            key,
            outputPath: `processed/${videoId}`,
            signedUrl
        };

        console.log('Sending SQS message:', JSON.stringify(message, null, 2));
        console.log("QUEUE_URL", process.env.QUEUE_URL || 'https://sqs.ap-south-1.amazonaws.com/767397702079/video-processing-queue');

        try {
            const result = await sqs.sendMessage({
                QueueUrl: process.env.QUEUE_URL || 'https://sqs.ap-south-1.amazonaws.com/767397702079/video-processing-queue',
                MessageBody: JSON.stringify(message)
            });

            console.log('Message sent successfully:', result.MessageId);

            //   await prisma.video.update({
            //     where: { id: videoId },
            //     data: { status: 'PROCESSED' }
            //   });

            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'Pushed to SQS successfully!',
                    messageId: result.MessageId
                })
            };
        } catch (error) {
            console.error(`SQS send attempt failed:`, error);
            throw error;
        }
    } catch (error) {
        console.error('Error in videoUploadTrigger:', error);
        throw error;
    } finally {
        console.log("Checking Without Prisma");
    }
};
