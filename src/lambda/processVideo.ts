import { SQSEvent } from 'aws-lambda';
import { VideoTranscoder } from '../services/VideoTranscoder';

export const handler = async (event: SQSEvent) => {
  console.log("Working or what?")
  console.log('SQS Event received in processVideo:', JSON.stringify(event, null, 2));

  try {
    const transcoder = new VideoTranscoder();
    const record = event.Records[0];
    const messageBody = JSON.parse(record.body);
    console.log('Processing message:', JSON.stringify(messageBody, null, 2));

    await transcoder.startTranscoding(
      messageBody.videoId,
      messageBody.bucket,
      messageBody.key,
      messageBody.outputPath
    );
  } catch (error) {
    console.error('Error in processVideo:', error);
    throw error;
  }
};
