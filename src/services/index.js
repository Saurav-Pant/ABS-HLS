// With Lambda

// import { S3 } from '@aws-sdk/client-s3';
// import { GetObjectCommand } from '@aws-sdk/client-s3';
// import { exec } from 'child_process';
// import { promises as fs } from 'fs';
// import path from 'path';

// const CONFIG = {
//   REGION: process.env.AWS_REGION || 'ap-south-1',
//   TEMP_DIR: '/tmp',
//   INPUT_FILENAME: 'input.mp4',
//   DEFAULT_SUCCESS_STATUS: 'COMPLETED',
//   DEFAULT_ERROR_STATUS: 'FAILED',
//   MIN_DISK_SPACE: 512 * 1024 * 1024,
//   AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
//   AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
// };

// const RESOLUTIONS = [
//   { width: 1920, height: 1080, name: '1080p', bitrate: '5000000' },
//   { width: 1280, height: 720, name: '720p', bitrate: '2800000' },
//   { width: 854, height: 480, name: '480p', bitrate: '1400000' }
// ];

// class VideoTranscoder {
//   constructor() {
//     console.log('Initializing VideoTranscoder...');
//     this.s3 = new S3({
//       region: CONFIG.REGION,
//       credentials: {
//         accessKeyId: CONFIG.AWS_ACCESS_KEY_ID,
//         secretAccessKey: CONFIG.AWS_SECRET_ACCESS_KEY
//       }
//     });
//     console.log(`Configured S3 client with region: ${CONFIG.REGION}`);
//   }

//   async checkFFmpeg() {
//     console.log('Checking FFmpeg installation...');
//     try {
//       const output = await this.executeFFmpeg('ffmpeg -version');
//       console.log('FFmpeg check successful:', output.split('\n')[0]);
//       return true;
//     } catch (error) {
//       console.error('FFmpeg check failed:', error);
//       throw new Error('FFmpeg is not properly installed or accessible');
//     }
//   }

//   async checkSystemResources() {
//     console.log('Checking system resources...');
//     try {
//       const stats = await fs.statfs(CONFIG.TEMP_DIR);
//       const availableSpace = stats.bfree * stats.bsize;
//       console.log(`Available disk space: ${availableSpace / (1024 * 1024)}MB`);

//       if (availableSpace < CONFIG.MIN_DISK_SPACE) {
//         throw new Error(`Insufficient disk space. Required: ${CONFIG.MIN_DISK_SPACE / (1024 * 1024)}MB, Available: ${availableSpace / (1024 * 1024)}MB`);
//       }

//       return true;
//     } catch (error) {
//       console.error('System resource check failed:', error);
//       throw error;
//     }
//   }

//   async downloadVideo(bucket, key) {
//     console.log(`Starting video download from s3://${bucket}/${key}`);

//     try {
//       await this.s3.headBucket({ Bucket: bucket });

//       const command = new GetObjectCommand({ Bucket: bucket, Key: key });
//       const response = await this.s3.send(command);

//       const inputPath = path.join(CONFIG.TEMP_DIR, CONFIG.INPUT_FILENAME);
//       const writeStream = fs.createWriteStream(inputPath);

//       await new Promise((resolve, reject) => {
//         response.Body.pipe(writeStream)
//           .on('finish', () => {
//             console.log('Download completed successfully');
//             resolve();
//           })
//           .on('error', (err) => {
//             console.error('Download stream error:', err);
//             reject(err);
//           });
//       });

//       const stats = await fs.stat(inputPath);
//       console.log(`Downloaded file size: ${stats.size} bytes`);

//       return inputPath;
//     } catch (error) {
//       console.error('Video download failed:', error);
//       throw error;
//     }
//   }

//   executeFFmpeg(command) {
//     return new Promise((resolve, reject) => {
//       console.log(`Executing FFmpeg command: ${command}`);
//       const startTime = Date.now();

//       const process = exec(command, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
//         const duration = (Date.now() - startTime) / 1000;
//         console.log(`FFmpeg execution took ${duration} seconds`);

//         if (error) {
//           console.error('FFmpeg execution failed:', error);
//           console.error('FFmpeg stderr:', stderr);
//           reject(error);
//         } else {
//           console.log('FFmpeg execution successful');
//           resolve(stdout);
//         }
//       });

//       process.stderr.on('data', (data) => {
//         if (data.includes('time=')) {
//           console.log('FFmpeg progress:', data.trim());
//         }
//       });
//     });
//   }

//   async processResolution(inputPath, res, outputDir) {
//     const startTime = Date.now();
//     console.log(`Starting ${res.name} resolution processing at ${new Date().toISOString()}`);

//     const resolutionDir = path.join(outputDir, res.name);
//     const variantPath = path.join(resolutionDir, 'playlist.m3u8');
//     const segmentPattern = path.join(resolutionDir, 'segment%03d.ts');

//     await fs.mkdir(resolutionDir, { recursive: true });

//     const command = [
//       'ffmpeg',
//       '-y',
//       '-i', inputPath,
//       '-vf', `scale=w=${res.width}:h=${res.height}:force_original_aspect_ratio=decrease`,
//       '-c:v', 'libx264',
//       '-preset', 'fast',
//       '-profile:v', 'main',
//       '-b:v', res.bitrate,
//       '-c:a', 'aac',
//       '-b:a', '128k',
//       '-hls_time', '10',
//       '-hls_list_size', '0',
//       '-hls_segment_type', 'mpegts',
//       '-hls_playlist_type', 'vod',
//       '-hls_segment_filename', segmentPattern,
//       '-loglevel', 'info',
//       variantPath
//     ].join(' ');

//     try {
//       const result = await this.executeFFmpeg(command);
//       const duration = (Date.now() - startTime) / 1000;
//       console.log(`Completed ${res.name} resolution in ${duration} seconds`);
//       return { variantPath, resolutionDir };
//     } catch (error) {
//       console.error(`Failed ${res.name} resolution after ${(Date.now() - startTime) / 1000} seconds:`, error);
//       throw error;
//     }
//   }

//   async uploadToS3(localPath, bucket, key) {
//     console.log(`Starting upload: ${localPath} -> s3://${bucket}/${key}`);

//     try {
//       try {
//         await this.s3.headBucket({ Bucket: bucket });
//       } catch (error) {
//         throw new Error(`Destination bucket ${bucket} is not accessible: ${error.message}`);
//       }

//       const fileContent = await fs.readFile(localPath);

//       const uploadParams = {
//         Bucket: bucket,
//         Key: key,
//         Body: fileContent,
//         ContentType: key.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/MP2T'
//       };

//       await this.s3.putObject(uploadParams);
//       console.log(`Successfully uploaded ${key} to ${bucket}`);
//     } catch (error) {
//       console.error(`Failed to upload ${key} to ${bucket}:`, error);
//       throw new Error(`S3 upload failed: ${error.message} (Bucket: ${bucket}, Key: ${key})`);
//     }
//   }

//   async uploadHLSFiles(bucket, prefix, directory) {
//     console.log(`Uploading HLS files from ${directory} to s3://${bucket}/${prefix}`);
//     try {
//       const files = await fs.readdir(directory);
//       console.log(`Found ${files.length} files to upload`);

//       for (const file of files) {
//         const localPath = path.join(directory, file);
//         const s3Key = `${prefix}/${file}`;
//         await this.uploadToS3(localPath, bucket, s3Key);
//       }
//       console.log('Successfully uploaded all HLS files');
//     } catch (error) {
//       console.error('Failed to upload HLS files:', error);
//       throw error;
//     }
//   }

//   async verifyFFmpegInstallation() {
//     console.log('=== FFmpeg Verification Start ===');

//     try {
//       const versionCommand = 'ffmpeg -version';
//       console.log('Checking FFmpeg version...');
//       const versionOutput = await this.executeFFmpeg(versionCommand);
//       console.log('FFmpeg version:', versionOutput.split('\n')[0]);

//       console.log(`Checking temp directory (${CONFIG.TEMP_DIR}) permissions...`);
//       const testDir = path.join(CONFIG.TEMP_DIR, 'test-' + Date.now());
//       await fs.mkdir(testDir, { recursive: true });

//       const testFile = path.join(testDir, 'test.txt');
//       await fs.writeFile(testFile, 'test');
//       console.log('Successfully created test file');

//       const testVideoFile = path.join(testDir, 'test.mp4');
//       const testCommand = [
//         'ffmpeg',
//         '-f', 'lavfi',
//         '-i', 'testsrc=duration=1:size=320x240:rate=30',
//         '-c:v', 'libx264',
//         testVideoFile
//       ].join(' ');

//       console.log('Testing FFmpeg with command:', testCommand);
//       await this.executeFFmpeg(testCommand);
//       console.log('Successfully created test video');

//       await fs.rm(testDir, { recursive: true });
//       console.log('Cleanup successful');

//       console.log('=== FFmpeg Verification Successful ===');
//       return true;
//     } catch (error) {
//       console.error('=== FFmpeg Verification Failed ===');
//       console.error('Error:', error);
//       console.error('Stack:', error.stack);
//       throw error;
//     }
//   }

//   async startTranscoding(videoId, bucket, key, outputPath) {
//     const logMemoryUsage = () => {
//       const used = process.memoryUsage();
//       console.log('Memory usage:', {
//         heapTotal: `${Math.round(used.heapTotal / 1024 / 1024)} MB`,
//         heapUsed: `${Math.round(used.heapUsed / 1024 / 1024)} MB`,
//         external: `${Math.round(used.external / 1024 / 1024)} MB`,
//         rss: `${Math.round(used.rss / 1024 / 1024)} MB`
//       });
//     };

//     console.log(`Starting transcoding process for video ${videoId}`);
//     const outputDir = path.join(CONFIG.TEMP_DIR, videoId);
//     let inputPath = null;

//     try {
//       logMemoryUsage();
//       await this.verifyFFmpegInstallation();

//       await this.checkFFmpeg();
//       await this.checkSystemResources();

//       await fs.mkdir(outputDir, { recursive: true });

//       inputPath = await this.downloadVideo(bucket, key);
//       console.log('Video download complete');

//       let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';

//       for (const res of RESOLUTIONS) {
//         const { variantPath, resolutionDir } = await this.processResolution(inputPath, res, outputDir);

//         masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(res.bitrate)}000,RESOLUTION=${res.width}x${res.height}\n`;
//         masterPlaylist += `${res.name}/playlist.m3u8\n`;

//         await this.uploadHLSFiles(bucket, `${outputPath}/${res.name}`, resolutionDir);
//       }

//       const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
//       await fs.writeFile(masterPlaylistPath, masterPlaylist);
//       await this.uploadToS3(masterPlaylistPath, bucket, `${outputPath}/master.m3u8`);

//       console.log('Transcoding process completed successfully');

//       logMemoryUsage();
//       return {
//         status: CONFIG.DEFAULT_SUCCESS_STATUS,
//         message: `Transcoding completed for video ${videoId}`,
//         outputPath: `${outputPath}/master.m3u8`
//       };
//     } catch (error) {
//       console.error(`Transcoding failed for video ${videoId}:`, error);
//       if (inputPath) {
//         try {
//           await fs.unlink(inputPath);
//         } catch (cleanupError) {
//           console.warn('Failed to cleanup input file:', cleanupError);
//         }
//       }
//       await this.cleanup(outputDir);
//       logMemoryUsage();
//       throw error;
//     }
//   }

//   async cleanup(directory) {
//     console.log(`Starting cleanup of directory: ${directory}`);
//     try {
//       await fs.rm(directory, { recursive: true, force: true });
//       console.log('Cleanup complete');
//     } catch (error) {
//       console.warn('Cleanup error:', error);
//     }
//   }
// }

// export const handler = async (event, context) => {
//   console.log('Lambda invocation details:', {
//     functionName: context.functionName,
//     functionVersion: context.functionVersion,
//     memoryLimitInMB: context.memoryLimitInMB,
//     remainingTime: context.getRemainingTimeInMillis(),
//     awsRequestId: context.awsRequestId
//   });

//   console.log('Environment variables:', {
//     DATABASE_URL: process.env.DATABASE_URL ? 'Set' : 'Not set',
//     AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
//     AWS_REGION: process.env.AWS_REGION,
//     NODE_ENV: process.env.NODE_ENV,
//     LAMBDA_MEMORY: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
//     LAMBDA_TIMEOUT: process.env.AWS_LAMBDA_FUNCTION_TIMEOUT
//   });

//   console.log('Received event:', JSON.stringify(event, null, 2));

//   const requiredParams = ['videoId', 'inputBucket', 'inputKey', 'outputPath'];
//   const missingParams = requiredParams.filter(param => !event[param]);

//   if (missingParams.length > 0) {
//     const error = `Missing required parameters: ${missingParams.join(', ')}`;
//     console.error(error);
//     return {
//       statusCode: 400,
//       body: JSON.stringify({
//         status: CONFIG.DEFAULT_ERROR_STATUS,
//         message: error
//       })
//     };
//   }

//   const transcoder = new VideoTranscoder();

//   try {
//     const { videoId, inputBucket, inputKey, outputPath } = event;

//     const result = await transcoder.startTranscoding(
//       videoId,
//       inputBucket,
//       inputKey,
//       outputPath
//     );

//     return {
//       statusCode: 200,
//       body: JSON.stringify(result)
//     };
//   } catch (error) {
//     console.error('Processing failed:', error);
//     console.error('Stack trace:', error.stack);

//     return {
//       statusCode: 500,
//       body: JSON.stringify({
//         status: CONFIG.DEFAULT_ERROR_STATUS,
//         message: error.message,
//         stack: error.stack,
//         videoId: event.videoId
//       })
//     };
//   }
// }


// With container

import { S3 } from '@aws-sdk/client-s3';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { exec } from 'child_process';
import { promises as fs } from 'fs';
import path from 'path';

// Basic configuration
const CONFIG = {
  TEMP_DIR: '/tmp/videos',  // Changed to a specific videos directory
  INPUT_FILENAME: 'input.mp4',
  REGION: process.env.AWS_REGION || 'ap-south-1',
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY
};

// Video resolution settings
const RESOLUTIONS = [
  { width: 1920, height: 1080, name: '1080p', bitrate: '5000000' },
  { width: 1280, height: 720, name: '720p', bitrate: '2800000' },
  { width: 854, height: 480, name: '480p', bitrate: '1400000' }
];

class VideoTranscoder {
  constructor() {
    this.s3 = new S3({
      region: CONFIG.REGION,
      credentials: {
        accessKeyId: CONFIG.AWS_ACCESS_KEY_ID,
        secretAccessKey: CONFIG.AWS_SECRET_ACCESS_KEY
      }
    });
    console.log('VideoTranscoder initialized');
  }

  // Download video from S3
  async downloadVideo(bucket, key) {
    console.log(`Downloading video from s3://${bucket}/${key}`);
    const command = new GetObjectCommand({ Bucket: bucket, Key: key });
    const response = await this.s3.send(command);

    await fs.mkdir(CONFIG.TEMP_DIR, { recursive: true });
    const inputPath = path.join(CONFIG.TEMP_DIR, CONFIG.INPUT_FILENAME);
    const writeStream = fs.createWriteStream(inputPath);

    await new Promise((resolve, reject) => {
      response.Body.pipe(writeStream)
        .on('finish', resolve)
        .on('error', reject);
    });

    return inputPath;
  }

  // Execute FFmpeg command
  executeFFmpeg(command) {
    return new Promise((resolve, reject) => {
      console.log(`Running FFmpeg command: ${command}`);
      exec(command, { maxBuffer: 50 * 1024 * 1024 }, (error, stdout, stderr) => {
        if (error) {
          console.error('FFmpeg error:', error);
          reject(error);
        } else {
          resolve(stdout);
        }
      });
    });
  }

  // Process video for a specific resolution
  async processResolution(inputPath, res, outputDir) {
    console.log(`Processing ${res.name} resolution`);
    const resolutionDir = path.join(outputDir, res.name);
    await fs.mkdir(resolutionDir, { recursive: true });

    const command = [
      'ffmpeg',
      '-i', inputPath,
      '-vf', `scale=w=${res.width}:h=${res.height}:force_original_aspect_ratio=decrease`,
      '-c:v', 'libx264',
      '-b:v', res.bitrate,
      '-c:a', 'aac',
      '-b:a', '128k',
      '-hls_time', '10',
      '-hls_list_size', '0',
      '-hls_segment_filename', path.join(resolutionDir, 'segment%03d.ts'),
      path.join(resolutionDir, 'playlist.m3u8')
    ].join(' ');

    await this.executeFFmpeg(command);
    return resolutionDir;
  }

  // Upload files to S3
  async uploadToS3(localPath, bucket, key) {
    console.log(`Uploading to s3://${bucket}/${key}`);
    const fileContent = await fs.readFile(localPath);
    await this.s3.putObject({
      Bucket: bucket,
      Key: key,
      Body: fileContent
    });
  }

  // Main transcoding process
  async processVideo(videoId, bucket, key, outputPath) {
    console.log(`Starting video processing for ${videoId}`);
    const outputDir = path.join(CONFIG.TEMP_DIR, videoId);

    try {
      // Download video
      const inputPath = await this.downloadVideo(bucket, key);
      console.log('Video download complete');

      // Process each resolution
      let masterPlaylist = '#EXTM3U\n#EXT-X-VERSION:3\n';

      for (const res of RESOLUTIONS) {
        console.log(`Starting ${res.name} resolution processing`);
        const resolutionDir = await this.processResolution(inputPath, res, outputDir);

        // Add to master playlist
        masterPlaylist += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(res.bitrate)}000,RESOLUTION=${res.width}x${res.height}\n`;
        masterPlaylist += `${res.name}/playlist.m3u8\n`;

        // Upload resolution files
        const files = await fs.readdir(resolutionDir);
        for (const file of files) {
          await this.uploadToS3(
            path.join(resolutionDir, file),
            bucket,
            `${outputPath}/${res.name}/${file}`
          );
        }
        console.log(`Completed ${res.name} resolution processing`);
      }

      // Upload master playlist
      const masterPlaylistPath = path.join(outputDir, 'master.m3u8');
      await fs.writeFile(masterPlaylistPath, masterPlaylist);
      await this.uploadToS3(masterPlaylistPath, bucket, `${outputPath}/master.m3u8`);
      console.log('Master playlist uploaded');

      // Cleanup
      await fs.rm(outputDir, { recursive: true });
      console.log('Cleanup completed');

      return {
        status: 'COMPLETED',
        outputPath: `${outputPath}/master.m3u8`
      };
    } catch (error) {
      console.error('Video processing failed:', error);
      await fs.rm(outputDir, { recursive: true, force: true }).catch(console.error);
      throw error;
    }
  }
}

// Main execution
const main = async () => {
  try {
    const { VIDEO_ID, INPUT_BUCKET, INPUT_KEY, OUTPUT_PATH } = process.env;

    if (!VIDEO_ID || !INPUT_BUCKET || !INPUT_KEY || !OUTPUT_PATH) {
      throw new Error('Missing required environment variables: VIDEO_ID, INPUT_BUCKET, INPUT_KEY, OUTPUT_PATH');
    }

    const transcoder = new VideoTranscoder();
    const result = await transcoder.processVideo(
      VIDEO_ID,
      INPUT_BUCKET,
      INPUT_KEY,
      OUTPUT_PATH
    );

    console.log('Processing completed successfully:', result);
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
};

// Start the application
main();
