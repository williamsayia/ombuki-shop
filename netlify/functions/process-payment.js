const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const axios = require('axios');

exports.handler = async (event) => {
  try {
    const data = JSON.parse(event.body);
    let result;

    switch(data.paymentMethod) {
      case 'stripe':
        result = await handleStripePayment(data);
        break;
      case 'mpesa':
        result = await handleMpesaPayment(data);
        break;
      case 'cash':
        result = await handleCashPayment(data);
        break;
      default:
        throw new Error('Invalid payment method');
    }

    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: error.message })
    };
  }
};

async function handleStripePayment(data) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: data.amount * 100, // Convert to cents
    currency: 'kes',
    payment_method: data.paymentMethodId,
    confirm: true,
    metadata: {
      order_id: data.orderId
    }
  });
  
  return {
    success: true,
    paymentId: paymentIntent.id,
    orderId: data.orderId
  };
}

async function handleMpesaPayment(data) {
  // Get MPESA token
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const tokenResponse = await axios.get(
    `${process.env.MPESA_AUTH_URL}/oauth/v1/generate?grant_type=client_credentials`,
    { headers: { Authorization: `Basic ${auth}` } }
  );

  // Initiate STK push
  const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
  const password = Buffer.from(`${process.env.MPESA_SHORTCODE}${process.env.MPESA_PASSKEY}${timestamp}`).toString('base64');

  const stkResponse = await axios.post(
    `${process.env.MPESA_API_URL}/stkpush/v1/processrequest`,
    {
      BusinessShortCode: process.env.MPESA_SHORTCODE,
      Password: password,
      Timestamp: timestamp,
      TransactionType: 'CustomerPayBillOnline',
      Amount: data.amount,
      PartyA: data.phone,
      PartyB: process.env.MPESA_SHORTCODE,
      PhoneNumber: data.phone,
      CallBackURL: `${process.env.URL}/.netlify/functions/payment-callback`,
      AccountReference: `ORDER-${data.orderId}`,
      TransactionDesc: 'Online Purchase'
    },
    {
      headers: { Authorization: `Bearer ${tokenResponse.data.access_token}` }
    }
  );

  return {
    success: true,
    requestId: stkResponse.data.MerchantRequestID,
    orderId: data.orderId,
    phone: data.phone
  };
}

async function handleCashPayment(data) {
  // In a real implementation, you would save this to your database
  return {
    success: true,
    orderId: data.orderId,
    paymentMethod: 'cash'
  };
}