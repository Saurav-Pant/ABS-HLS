import { ECS } from '@aws-sdk/client-ecs';
import { S3 } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';

export class VideoTranscoder {
  private ecs: ECS;
  private s3: S3;
  private readonly MAX_POLLING_ATTEMPTS = 60;
  private readonly POLLING_INTERVAL = 30000;

  constructor() {
    const region = process.env.CUSTOM_AWS_REGION || 'ap-south-1';
    this.ecs = new ECS({ region });
    this.s3 = new S3({ region });
  }

  async startTranscoding(videoId: string, bucket: string, key: string, outputPath: string) {
    let taskArn: string | undefined;

    try {
      const presignedUrl = await this.generatePresignedUrl(bucket, key);
      taskArn = await this.startECSTask(presignedUrl, bucket, outputPath);
      await this.pollTaskStatus(taskArn);
    } catch (error) {
      console.error("Error during video transcoding:", error);
      if (taskArn) {
        await this.stopTask(taskArn);
      }
      throw error;
    }
  }

  private async generatePresignedUrl(bucket: string, key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
  }

  private async startECSTask(presignedUrl: string, bucket: string, outputPath: string): Promise<string> {
    const response = await this.ecs.runTask({
      cluster: 'video-processing-cluster',
      taskDefinition: 'video-processing',
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: [process.env.SUBNET_ID || ''],
          securityGroups: [process.env.SECURITY_GROUP_ID || ''],
          assignPublicIp: 'ENABLED'
        }
      },
      overrides: {
        containerOverrides: [{
          name: 'ffmpeg',
          command: [
            '-i', presignedUrl,

            '-filter_complex', '[0:v]split=3[v1][v2][v3];[v1]scale=w=1920:h=1080[v1out];[v2]scale=w=1280:h=720[v2out];[v3]scale=w=854:h=480[v3out]',
            '-hls_time 10',
            '-preset ultrafast',
            '-hls_playlist_type vod',
            '-hls_segment_filename', `s3://${bucket}/${outputPath}/1080p_%03d.ts`,
            's3://${bucket}/${outputPath}/1080p.m3u8',

            '-hls_time 10',
            '-preset ultrafast',
            '-hls_playlist_type vod',
            '-hls_segment_filename', `s3://${bucket}/${outputPath}/720p_%03d.ts`,
            's3://${bucket}/${outputPath}/720p.m3u8',

            '-hls_time 10',
            '-preset ultrafast',
            '-hls_playlist_type vod',
            '-hls_segment_filename', `s3://${bucket}/${outputPath}/480p_%03d.ts`,
            's3://${bucket}/${outputPath}/480p.m3u8'
          ],
          environment: [
            { name: 'AWS_REGION', value: process.env.CUSTOM_AWS_REGION || 'ap-south-1' }
          ]
        }]
      }
    });

    if (!response.tasks?.[0]?.taskArn) {
      throw new Error('Failed to start ECS task');
    }

    return response.tasks[0].taskArn;
  }

  private async pollTaskStatus(taskArn: string) {
    let attempts = 0;
    while (attempts < this.MAX_POLLING_ATTEMPTS) {
      const status = await this.ecs.describeTasks({
        cluster: 'video-processing-cluster',
        tasks: [taskArn]
      });

      const task = status.tasks?.[0];
      if (!task) throw new Error('Task not found');

      if (task.lastStatus === 'STOPPED') {
        if (task.containers?.[0]?.exitCode === 0) return;
        throw new Error(`Task failed with exit code ${task.containers?.[0]?.exitCode}`);
      }

      attempts++;
      await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
    }

    throw new Error('Task polling timeout exceeded');
  }

  private async stopTask(taskArn: string) {
    try {
      await this.ecs.stopTask({
        cluster: 'video-processing-cluster',
        task: taskArn,
        reason: 'Processing failed'
      });
    } catch (error) {
      console.error('Error stopping task:', error);
    }
  }
}
