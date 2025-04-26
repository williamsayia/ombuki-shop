const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const { payment_method_id, amount, currency } = JSON.parse(event.body);
    
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      payment_method: payment_method_id,
      confirm: true,
      return_url: `${process.env.URL}/order-confirmation.html`
    });
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        paymentIntent
      })
    };
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};