import { getTexifyBaseUrl } from '../src/lib/texify';
import '@/lib/env';

async function main() {
  const baseUrl = getTexifyBaseUrl();
  console.log('Texify Base URL:', baseUrl);
  
  const apiKey = process.env.TEXIFY_API_KEY;
  if (!apiKey) {
    console.error('Error: TEXIFY_API_KEY is not set');
  } else {
    console.log('TEXIFY_API_KEY is set (length: ' + apiKey.length + ')');
  }

  const senderId = process.env.TEXIFY_SENDER_ID;
  if (!senderId) {
    console.error('Error: TEXIFY_SENDER_ID is not set');
  } else {
    console.log('TEXIFY_SENDER_ID:', senderId);
  }
}

main();
