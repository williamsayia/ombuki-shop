exports.handler = async (event) => {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' })
      };
    }
  
    try {
      const callbackData = JSON.parse(event.body);
      
      // Validate this is a valid MPESA callback
      if (!callbackData.Body || !callbackData.Body.stkCallback) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Invalid callback format' })
        };
      }
  
      const result = callbackData.Body.stkCallback;
      const merchantRequestID = result.MerchantRequestID;
      const checkoutRequestID = result.CheckoutRequestID;
      const resultCode = result.ResultCode;
      const resultDesc = result.ResultDesc;
      
      // Check if payment was successful
      if (resultCode === '0') {
        const callbackMetadata = result.CallbackMetadata;
        const items = callbackMetadata.Item.reduce((acc, item) => {
          acc[item.Name] = item.Value;
          return acc;
        }, {});
  
        // Payment details
        const paymentData = {
          amount: items.Amount,
          mpesaReceiptNumber: items.MpesaReceiptNumber,
          transactionDate: items.TransactionDate,
          phoneNumber: items.PhoneNumber
        };
  
        // Here you would typically:
        // 1. Verify the payment with your database
        // 2. Update the order status
        // 3. Send confirmation email, etc.
        
        console.log('Successful payment:', paymentData);
        
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            success: true,
            message: 'Payment processed successfully',
            data: paymentData
          })
        };
      } else {
        // Payment failed
        console.error('Payment failed:', resultDesc);
        
        return {
          statusCode: 200, // MPESA expects 200 even for failures
          body: JSON.stringify({
            success: false,
            error: resultDesc
          })
        };
      }
    } catch (error) {
      console.error('Callback processing error:', error);
      
      return {
        statusCode: 500,
        body: JSON.stringify({
          success: false,
          error: 'Callback processing failed'
        })
      };
    }
  };