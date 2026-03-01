type TexifySendPayload = {
  recipients: string[];
  message: string;
  sender_id: string;
};

type TexifySendResponse = {
  id?: string;
  status?: string;
  [key: string]: unknown;
};

export function getTexifyBaseUrl() {
  const raw =
    process.env.TEXIFY_BASE_URL ||
    process.env.TEXIFY_SMS_URL ||
    'https://api.texify.org/api/v1';
  const trimmed = raw.trim().replace(/\/+$/, '');
  
  // Normalize to ensure /api/v1 structure if it looks like the standard API
  if (trimmed === 'https://api.texify.org/v1') {
    return 'https://api.texify.org/api/v1';
  }
  
  // If user provides a custom URL that ends in /v1 but not /api/v1, warn but keep it?
  // Or maybe we should be smarter.
  // The issue is specifically that the old default was .../v1 but correct is .../api/v1
  
  return trimmed;
}

export async function sendBulkSms(
  recipients: string[],
  message: string
): Promise<TexifySendResponse> {
  const apiKey = process.env.TEXIFY_API_KEY;
  const senderId = process.env.TEXIFY_SENDER_ID;

  if (!apiKey || !senderId) {
    throw new Error('Texify configuration is missing');
  }

  const baseUrl = getTexifyBaseUrl();

  const payload: TexifySendPayload = {
    recipients,
    message,
    sender_id: senderId,
  };

  // Correct endpoint is /messages/send
  // Base URL should include /api/v1
  // Use X-API-Key as primary auth method, similar to balance check
  const response = await fetch(`${baseUrl}/messages/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Texify request failed: ${text || response.statusText}`);
  }

  const data = (await response.json()) as TexifySendResponse;
  return data;
}

export type TexifyBalanceResponse = {
  balance?: number;
  currency?: string;
  data?: {
    credits: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export async function getTexifyBalance(): Promise<TexifyBalanceResponse> {
  const apiKey = process.env.TEXIFY_API_KEY;

  if (!apiKey) {
    throw new Error('Texify configuration is missing');
  }

  const baseUrl = getTexifyBaseUrl();
  const explicitBalanceUrl = process.env.TEXIFY_BALANCE_URL;

  // The documentation says GET /balance but often APIs prefix with /api
  // We found via probing that https://api.texify.org/api/v1/balance works
  let url = explicitBalanceUrl;
  
  if (!url) {
    // Probe found: https://api.texify.org/api/v1/balance
    // Current baseUrl: https://api.texify.org/api/v1 (updated default)
    // We need to ensure we don't double the /api part if it's already there
    
    // Remove trailing slash if present
    const cleanBase = baseUrl.replace(/\/$/, '');
    
    if (cleanBase.endsWith('/api/v1')) {
       url = `${cleanBase}/balance`;
    } else if (cleanBase.endsWith('/v1')) {
       // Old default fallback
       url = cleanBase.replace(/\/v1$/, '/api/v1/balance');
    } else {
       // Fallback for custom domains without version path
       url = `${cleanBase}/api/v1/balance`;
    }
  }

  // Debug: log the URL and headers we're trying to use
  console.log(`[Texify] Fetching balance from: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey, // Updated per documentation
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const json = await response.json();
      // Map the response structure to our internal type
      // Doc response: { status: "success", data: { credits: 5000, ... } }
      if (json.data && typeof json.data.credits === 'number') {
        return {
          balance: json.data.credits,
          currency: 'Credits',
          ...json,
        };
      }
      return json as TexifyBalanceResponse;
    }

    // If X-API-Key fails, try Bearer as a fallback (some endpoints mix them)
    // NOTE: Probe showed Bearer auth returned 404 for the same URL, so X-API-Key is likely the only correct one.
    // But we keep this fallback just in case.
    const fallbackResponse = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
      },
    });

    if (fallbackResponse.ok) {
      return (await fallbackResponse.json()) as TexifyBalanceResponse;
    }

    if (response.status === 404 && fallbackResponse.status === 404) {
      console.warn(
        'Texify balance endpoint not found (404). Skipping balance check.'
      );
      return {};
    }

    const text = await response.text();
    throw new Error(
      `Texify balance request failed: ${text || response.statusText}`
    );
  } catch (error) {
    console.error('Texify balance check error:', error);
    return {};
  }
}
