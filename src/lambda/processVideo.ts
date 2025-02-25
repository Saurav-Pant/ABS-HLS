// import { SQSEvent, SQSRecord } from 'aws-lambda';
// import { ECS } from '@aws-sdk/client-ecs';

// interface MessageBody {
//   videoId: string;
//   bucket: string;
//   key: string;
//   outputPath: string;
// }

// interface BatchItemFailure {
//   itemIdentifier: string;
// }

// const ecs = new ECS({ region: 'ap-south-1' });

// const environment = {
//   SUBNET_ONE: process.env.SUBNET_ONE || 'subnet-075add30101401124',
//   SUBNET_TWO: process.env.SUBNET_TWO || 'subnet-069702e143113425f',
//   SECURITY_GROUP: process.env.SECURITY_GROUP || 'sg-014b7afed65051b0b'
// };

// export const handler = async (event: SQSEvent) => {
//   const batchItemFailures: BatchItemFailure[] = [];

//   console.log('Processing SQS messages:', JSON.stringify(event, null, 2));

//   const processRecord = async (record: SQSRecord) => {
//     const messageBody = JSON.parse(record.body) as MessageBody;

//     console.log('Processing video:', messageBody.videoId);

//     const vpcConfiguration = {
//       subnets: [environment.SUBNET_ONE, environment.SUBNET_TWO],
//       securityGroups: [environment.SECURITY_GROUP],
//       assignPublicIp: 'ENABLED' as const
//     };

//     const taskParams = {
//       taskDefinition: 'video-processing',
//       cluster: 'video-processing-cluster',
//       overrides: {
//         containerOverrides: [{
//           name: 'ffmpeg',
//           environment: [
//             { name: 'VIDEO_ID', value: messageBody.videoId },
//             { name: 'INPUT_BUCKET', value: messageBody.bucket },
//             { name: 'INPUT_KEY', value: messageBody.key },
//             { name: 'OUTPUT_PATH', value: messageBody.outputPath }
//           ]
//         }]
//       },
//       launchType: 'FARGATE' as const,
//       networkConfiguration: {
//         awsvpcConfiguration: vpcConfiguration
//       },
//       "assignPublicIp": "ENABLED"
//     };

//     const data = await ecs.runTask(taskParams);
//     console.log("Task started successfully:", data);
// };

//   try {
//     for (const record of event.Records) {
//       try {
//         await processRecord(record);
//       } catch (error) {
//         console.error('Error processing record:', {
//           messageId: record.messageId,
//           error: error instanceof Error ? error.message : 'Unknown error'
//         });
//         batchItemFailures.push({ itemIdentifier: record.messageId });
//       }
//     }

//     return { batchItemFailures };

//   } catch (err) {
//     console.error('Fatal error processing messages:', err);
//     throw err;
//   }
// };



import { SQSEvent, SQSRecord } from 'aws-lambda';
import { ECS } from '@aws-sdk/client-ecs';

interface MessageBody {
  videoId: string;
  bucket: string;
  key: string;
  outputPath: string;
}

interface BatchItemFailure {
  itemIdentifier: string;
}

const ecs = new ECS({ region: 'ap-south-1' });

const networkConfig = {
  subnet: process.env.PUBLIC_SUBNET || 'subnet-075add30101401124',
  securityGroup: process.env.SECURITY_GROUP || 'sg-014b7afed65051b0b'
};

export const handler = async (event: SQSEvent) => {
  const batchItemFailures: BatchItemFailure[] = [];
  console.log('Received SQS messages:', JSON.stringify(event, null, 2));

  const processRecord = async (record: SQSRecord) => {
    const messageBody = JSON.parse(record.body) as MessageBody;
    console.log('Processing request for video:', messageBody.videoId);

    const containerEnvironment = [
      { name: 'VIDEO_ID', value: messageBody.videoId },
      { name: 'INPUT_BUCKET', value: messageBody.bucket },
      { name: 'INPUT_KEY', value: messageBody.key },
      { name: 'OUTPUT_PATH', value: messageBody.outputPath }
    ];

    const vpcConfiguration = {
      subnets: [networkConfig.subnet],
      securityGroups: [networkConfig.securityGroup],
      assignPublicIp: 'ENABLED' as const
    };

    const taskParams = {
      taskDefinition: 'video-processing',
      cluster: 'video-processing-cluster',
      launchType: 'FARGATE' as const,
      networkConfiguration: {
        awsvpcConfiguration: vpcConfiguration
      },
      overrides: {
        containerOverrides: [{
          name: 'ffmpeg',
          environment: containerEnvironment
        }]
      }
    };

    try {
      const data = await ecs.runTask(taskParams);
      console.log("Task started:", JSON.stringify(data, null, 2));

      if (!data.tasks || data.tasks.length === 0) {
        throw new Error('Failed to start ECS task');
      }

      console.log(`Task ARN: ${data.tasks[0].taskArn}`);
      return data;
    } catch (error) {
      console.error('Failed to start ECS task:', error);
      throw error;
    }
  };

  for (const record of event.Records) {
    try {
      await processRecord(record);
    } catch (error) {
      console.error('Error processing record:', {
        messageId: record.messageId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      batchItemFailures.push({ itemIdentifier: record.messageId });
    }
  }

  return { batchItemFailures };
};
