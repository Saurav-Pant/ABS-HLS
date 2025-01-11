// import { SQSEvent } from 'aws-lambda';
// import VideoTranscoder from '../services/VideoTranscoder';

// export const handler = async (event: SQSEvent) => {
//   console.log("Working or what?")
//   console.log('SQS Event received in processVideo:', JSON.stringify(event, null, 2));

//   try {
//     const transcoder = new VideoTranscoder();
//     const record = event.Records[0];
//     const messageBody = JSON.parse(record.body);
//     console.log('Processing message:', JSON.stringify(messageBody, null, 2));

//     await transcoder.startTranscoding(
//       messageBody.videoId,
//       messageBody.bucket,
//       messageBody.key,
//       messageBody.outputPath
//     );
//   } catch (error) {
//     console.error('Error in processVideo:', error);
//     throw error;
//   }
// };



import { SQSEvent } from 'aws-lambda';
import { ECS } from '@aws-sdk/client-ecs';

const ecs = new ECS({ region: 'ap-south-1' });

export const handler = async (event: SQSEvent) => {
  console.log('SQS Event received:', JSON.stringify(event, null, 2));

  try {
    const record = event.Records[0];
    const messageBody = JSON.parse(record.body);

    const response = await ecs.runTask({
      cluster: 'video-processing-cluster',
      taskDefinition: 'video-processing',
      launchType: 'FARGATE',
      networkConfiguration: {
        awsvpcConfiguration: {
          subnets: [''],
          securityGroups: [''],
          assignPublicIp: 'ENABLED'
        }
      },
      overrides: {
        containerOverrides: [{
          name: 'ffmpeg',
          environment: [
            { name: 'VIDEO_ID', value: messageBody.videoId },
            { name: 'INPUT_BUCKET', value: messageBody.bucket },
            { name: 'INPUT_KEY', value: messageBody.key },
            { name: 'OUTPUT_PATH', value: messageBody.outputPath }
          ]
        }]
      }
    });

    console.log('Started ECS task:', response.tasks?.[0]?.taskArn);
  } catch (error) {
    console.error('Error in processVideo:', error);
    throw error;
  }
};
