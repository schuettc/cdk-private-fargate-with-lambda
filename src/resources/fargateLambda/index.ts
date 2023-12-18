/* eslint-disable import/no-extraneous-dependencies */
import { Handler } from 'aws-cdk-lib/aws-lambda';
import axios from 'axios';
const FARGATE_ALB_URL = process.env.FARGATE_ALB_URL || '';

export const handler: Handler = async (event: any): Promise<null> => {
  console.info(JSON.stringify(event, null, 2));
  await triggerFargate();
  return null;
};

async function triggerFargate() {
  console.log('Triggering Fargate');
  try {
    const response = await axios.post(
      `http://${FARGATE_ALB_URL}`,
      Date.now().toLocaleString('en-US'),
    );
    console.log('POST request response:', response.data);
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}
