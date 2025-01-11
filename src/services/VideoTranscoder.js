
// With the Programatic way to code

// import { ECS } from '@aws-sdk/client-ecs';
// import { S3 } from '@aws-sdk/client-s3';
// import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
// import { GetObjectCommand } from '@aws-sdk/client-s3';

// export class VideoTranscoder {
//   private ecs: ECS;
//   private s3: S3;
//   private readonly MAX_POLLING_ATTEMPTS = 60;
//   private readonly POLLING_INTERVAL = 30000;

//   constructor() {
//     const region = process.env.CUSTOM_AWS_REGION || 'ap-south-1';
//     this.ecs = new ECS({ region });
//     this.s3 = new S3({ region });
//   }

//   async startTranscoding(videoId: string, bucket: string, key: string, outputPath: string) {
//     let taskArn: string | undefined;

//     try {
//       const presignedUrl = await this.generatePresignedUrl(bucket, key);
//       taskArn = await this.startECSTask(presignedUrl, bucket, outputPath);
//       await this.pollTaskStatus(taskArn);
//     } catch (error) {
//       console.error("Error during video transcoding:", error);
//       if (taskArn) {
//         await this.stopTask(taskArn);
//       }
//       throw error;
//     }
//   }

//   private async generatePresignedUrl(bucket: string, key: string): Promise<string> {
//     const command = new GetObjectCommand({ Bucket: bucket, Key: key });
//     return await getSignedUrl(this.s3, command, { expiresIn: 3600 });
//   }

//   private async startECSTask(presignedUrl: string, bucket: string, outputPath: string): Promise<string> {
//     const response = await this.ecs.runTask({
//       cluster: 'video-processing-cluster',
//       taskDefinition: 'video-processing',
//       launchType: 'FARGATE',
//       networkConfiguration: {
//         awsvpcConfiguration: {
//           subnets: [process.env.SUBNET_ID || ''],
//           securityGroups: [process.env.SECURITY_GROUP_ID || ''],
//           assignPublicIp: 'ENABLED'
//         }
//       },
//       overrides: {
//         containerOverrides: [{
//           name: 'ffmpeg',
//           command: [
//             '-i', presignedUrl,

//             '-filter_complex', '[0:v]split=3[v1][v2][v3];[v1]scale=w=1920:h=1080[v1out];[v2]scale=w=1280:h=720[v2out];[v3]scale=w=854:h=480[v3out]',
//             '-hls_time 10',
//             '-preset ultrafast',
//             '-hls_playlist_type vod',
//             '-hls_segment_filename', `s3://${bucket}/${outputPath}/1080p_%03d.ts`,
//             's3://${bucket}/${outputPath}/1080p.m3u8',

//             '-hls_time 10',
//             '-preset ultrafast',
//             '-hls_playlist_type vod',
//             '-hls_segment_filename', `s3://${bucket}/${outputPath}/720p_%03d.ts`,
//             's3://${bucket}/${outputPath}/720p.m3u8',

//             '-hls_time 10',
//             '-preset ultrafast',
//             '-hls_playlist_type vod',
//             '-hls_segment_filename', `s3://${bucket}/${outputPath}/480p_%03d.ts`,
//             's3://${bucket}/${outputPath}/480p.m3u8'
//           ],
//           environment: [
//             { name: 'AWS_REGION', value: process.env.CUSTOM_AWS_REGION || 'ap-south-1' }
//           ]
//         }]
//       }
//     });

//     if (!response.tasks?.[0]?.taskArn) {
//       throw new Error('Failed to start ECS task');
//     }

//     return response.tasks[0].taskArn;
//   }

//   private async pollTaskStatus(taskArn: string) {
//     let attempts = 0;
//     while (attempts < this.MAX_POLLING_ATTEMPTS) {
//       const status = await this.ecs.describeTasks({
//         cluster: 'video-processing-cluster',
//         tasks: [taskArn]
//       });

//       const task = status.tasks?.[0];
//       if (!task) throw new Error('Task not found');

//       if (task.lastStatus === 'STOPPED') {
//         if (task.containers?.[0]?.exitCode === 0) return;
//         throw new Error(`Task failed with exit code ${task.containers?.[0]?.exitCode}`);
//       }

//       attempts++;
//       await new Promise(resolve => setTimeout(resolve, this.POLLING_INTERVAL));
//     }

//     throw new Error('Task polling timeout exceeded');
//   }

//   private async stopTask(taskArn: string) {
//     try {
//       await this.ecs.stopTask({
//         cluster: 'video-processing-cluster',
//         task: taskArn,
//         reason: 'Processing failed'
//       });
//     } catch (error) {
//       console.error('Error stopping task:', error);
//     }
//   }
// }



// Explicitly with using the Docker


import { S3 } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

const CONFIG = {
  REGION: process.env.AWS_REGION || 'ap-south-1',
  TEMP_DIR: '/tmp',
  INPUT_FILENAME: 'input.mp4',
  DEFAULT_SUCCESS_STATUS: 'COMPLETED',
  DEFAULT_ERROR_STATUS: 'FAILED'
};

const RESOLUTIONS = [
  { width: 1920, height: 1080, name: '1080p', bitrate: '5000k' },
  { width: 1280, height: 720, name: '720p', bitrate: '2800k' },
  { width: 854, height: 480, name: '480p', bitrate: '1400k' }
];

class VideoTranscoder {
  constructor() {
    this.s3 = new S3({ region: CONFIG.REGION });
  }

  async downloadVideo(bucket, key) {
    console.log(`Downloading video from s3://${bucket}/${key}`);
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.s3.send(command);

    const inputPath = path.join(CONFIG.TEMP_DIR, CONFIG.INPUT_FILENAME);
    await fs.writeFile(inputPath, Buffer.from(await response.Body.transformToByteArray()));
    return inputPath;
  }

  executeFFmpeg(command) {
    return new Promise((resolve, reject) => {
      console.log('Executing FFmpeg command:', command);
      exec(command, (error, stdout, stderr) => {
        if (error) {
          console.error('FFmpeg error:', stderr);
          reject(error);
        } else {
          console.log('FFmpeg output:', stdout);
          resolve(stdout);
        }
      });
    });
  }

  async uploadToS3(localPath, bucket, key) {
    console.log(`Uploading ${localPath} to s3://${bucket}/${key}`);
    const fileContent = await fs.readFile(localPath);
    await this.s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: fileContent
    });
  }

  async startTranscoding(videoId, bucket, key, outputPath) {
    try {
      console.log(`Starting transcoding for video ${videoId}`);
      const inputPath = await this.downloadVideo(bucket, key);

      let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';

      for (const res of RESOLUTIONS) {
        const outputDir = path.join(CONFIG.TEMP_DIR, res.name);
        await fs.mkdir(outputDir, { recursive: true });

        const variantPath = path.join(outputDir, 'playlist.m3u8');
        const segmentPattern = path.join(outputDir, 'segment%03d.ts');

        const command = `ffmpeg -i ${inputPath} ` +
          `-vf scale=w=${res.width}:h=${res.height}:force_original_aspect_ratio=decrease ` +
          `-c:v libx264 -preset fast -profile:v main ` +
          `-b:v ${res.bitrate} ` +
          `-c:a aac -b:a 128k ` +
          `-hls_time 10 ` +
          `-hls_playlist_type vod ` +
          `-hls_segment_filename "${segmentPattern}" ` +
          `"${variantPath}"`;

        await this.executeFFmpeg(command);

        masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(res.bitrate)}000,RESOLUTION=${res.width}x${res.height}\n`;
        masterPlaylist += `${res.name}/playlist.m3u8\n`;

        await this.uploadToS3(
          variantPath,
          bucket,
          `${outputPath}/${res.name}/playlist.m3u8`
        );

        const segments = await fs.readdir(outputDir);
        for (const segment of segments) {
          if (segment.endsWith('.ts')) {
            await this.uploadToS3(
              path.join(outputDir, segment),
              bucket,
              `${outputPath}/${res.name}/${segment}`
            );
          }
        }
      }

      const masterPlaylistPath = path.join(CONFIG.TEMP_DIR, 'master.m3u8');
      await fs.writeFile(masterPlaylistPath, masterPlaylist);
      await this.uploadToS3(
        masterPlaylistPath,
        bucket,
        `${outputPath}/master.m3u8`
      );

      return {
        status: CONFIG.DEFAULT_SUCCESS_STATUS,
        message: `Transcoding completed for video ${videoId}`,
        outputPath: `${outputPath}/master.m3u8`
      };
    } catch (error) {
      console.error(`Error during video transcoding for video ${videoId}:`, error);
      throw error;
    }
  }

  async cleanup() {
    try {
      const files = await fs.readdir(CONFIG.TEMP_DIR);
      await Promise.all(
        files.map(file =>
          fs.rm(path.join(CONFIG.TEMP_DIR, file), { recursive: true, force: true })
        )
      );
    } catch (error) {
      console.warn('Cleanup error:', error);
    }
  }
}

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  const transcoder = new VideoTranscoder();

  try {
    if (!event.videoId || !event.inputBucket || !event.inputKey || !event.outputPath) {
      throw new Error('Missing required parameters: videoId, inputBucket, inputKey, outputPath');
    }

    const result = await transcoder.startTranscoding(
      event.videoId,
      event.inputBucket,
      event.inputKey,
      event.outputPath
    );

    await transcoder.cleanup();

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('Lambda execution failed:', error);

    await transcoder.cleanup();

    return {
      statusCode: 500,
      body: JSON.stringify({
        status: CONFIG.DEFAULT_ERROR_STATUS,
        message: error.message,
        videoId: event.videoId
      })
    };
  }
};
