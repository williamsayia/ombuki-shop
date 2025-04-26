const axios = require('axios');
const crypto = require('crypto');

// Generate timestamp in YYYYMMDDHHmmss format
function getTimestamp() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0')
  ].join('');
}

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { phone, amount, reference } = JSON.parse(event.body);
    
    // Validate input
    if (!phone || !amount || !reference) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    // Format phone number (ensure it starts with 254)
    const formattedPhone = phone.startsWith('254') ? phone : 
                         phone.startsWith('0') ? `254${phone.substring(1)}` : 
                         phone.startsWith('+254') ? phone.substring(1) : 
                         `254${phone}`;

    // 1. Get OAuth Token
    const authResponse = await axios.get(
      `${process.env.MPESA_AUTH_URL}/oauth/v1/generate?grant_type=client_credentials`,
      {
        headers: {
          'Authorization': `Basic ${Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64')}`
        }
      }
    );

    const accessToken = authResponse.data.access_token;
    const timestamp = getTimestamp();

    // 2. Prepare STK Push request
    const password = Buffer.from(
      `${process.env.MPESA_BUSINESS_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`
    ).toString('base64');

    const stkPayload = {
      BusinessShortCode: process.env.MPESA_BUSINESS_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: amount,
      PartyA: formattedPhone,
      PartyB: process.env.MPESA_BUSINESS_SHORTCODE,
      PhoneNumber: formattedPhone,
      CallBackURL: `${process.env.URL}/.netlify/functions/mpesa-callback`,
      AccountReference: reference.substring(0, 12), // Max 12 chars
      TransactionDesc: 'Online Payment'
    };

    // 3. Initiate STK Push
    const stkResponse = await axios.post(
      `${process.env.MPESA_API_URL}/mpesa/stkpush/v1/processrequest`,
      stkPayload,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: 'Payment request initiated',
        data: {
          merchantRequestID: stkResponse.data.MerchantRequestID,
          checkoutRequestID: stkResponse.data.CheckoutRequestID,
          responseCode: stkResponse.data.ResponseCode,
          responseDescription: stkResponse.data.ResponseDescription,
          customerMessage: stkResponse.data.CustomerMessage
        }
      })
    };

  } catch (error) {
    console.error('MPESA Payment Error:', error);
    
    let errorMessage = 'Payment processing failed';
    if (error.response) {
      // Handle API response errors
      errorMessage = error.response.data.errorMessage || 
                    error.response.data.error_description ||
                    JSON.stringify(error.response.data);
    } else if (error.request) {
      errorMessage = 'No response received from MPESA API';
    }

    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        success: false,
        error: errorMessage,
        details: error.message
      })
    };
  }
};