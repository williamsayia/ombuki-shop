

// Initialize Stripe
const stripe = Stripe('pk_test_your_publishable_key'); // Replace with your key

$(document).ready(function() {
  // Initialize card element
  const elements = stripe.elements();
  const cardElement = elements.create('card', {
    style: {
      base: {
        fontSize: '16px',
        color: '#32325d',
      }
    }
  });
  cardElement.mount('#card-element');

  // MPESA Payment Handling
  $('#mpesa-option').click(function() {
    $('#mpesaModal').modal('show');
  });

  $('#mpesaForm').submit(function(e) {
    e.preventDefault();
    $('#mpesaFeedback').show();
    
    const phone = $('#mpesaPhone').val();
    const amount = $('#mpesaAmount').val();
    const reference = `ST44-${Date.now()}`;
    
    // Call Netlify Function
    $.ajax({
      url: '/.netlify/functions/mpesa-payment',
      method: 'POST',
      contentType: 'application/json',
      data: JSON.stringify({
        phone: phone,
        amount: amount,
        reference: reference
      }),
      success: function(response) {
        $('#mpesaStatus').html(`
          <p>Payment request sent to ${phone}</p>
          <p>Check your phone to complete payment</p>
          <p>Reference: ${reference}</p>
        `);
        
        // Check payment status periodically
        const checkInterval = setInterval(() => {
          checkMpesaPaymentStatus(reference, function(success) {
            if (success) {
              clearInterval(checkInterval);
              window.location.href = "order_confirmation.html?ref=" + reference;
            }
          });
        }, 5000);
      },
      error: function(xhr) {
        const error = xhr.responseJSON?.error || 'Payment failed';
        $('#mpesaStatus').html(`
          <p style="color:red;">Error: ${error}</p>
          <p>Please try again or choose another payment method</p>
        `);
      }
    });
  });

  // Stripe Payment Handling
  $('#stripe-option').click(function() {
    $('#stripeModal').modal('show');
  });

  $('#stripeForm').submit(async function(e) {
    e.preventDefault();
    const submitButton = $('#stripeForm button[type="submit"]');
    submitButton.prop('disabled', true);
    
    const {error, paymentMethod} = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement
    });

    if (error) {
      $('#card-errors').text(error.message);
      submitButton.prop('disabled', false);
    } else {
      try {
        const response = await fetch('/.netlify/functions/stripe-payment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            payment_method_id: paymentMethod.id,
            amount: 1450000, // Amount in cents
            currency: 'kes'
          })
        });
        
        const paymentIntent = await response.json();
        
        if (paymentIntent.error) {
          $('#card-errors').text(paymentIntent.error);
          submitButton.prop('disabled', false);
        } else if (paymentIntent.success) {
          window.location.href = "order_confirmation.html?payment_id=" + paymentIntent.id;
        }
      } catch (err) {
        $('#card-errors').text('Payment failed. Please try again.');
        submitButton.prop('disabled', false);
      }
    }
  });

  // Cash on Delivery Handling
  $('#cash-option').click(function() {
    if (confirm('Confirm cash on delivery for your order?')) {
      $.ajax({
        url: '/.netlify/functions/create-order',
        method: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
          payment_method: 'cash',
          amount: 14500
        }),
        success: function() {
          window.location.href = "order_confirmation.html?payment=cash";
        },
        error: function() {
          alert('Error processing your order. Please try again.');
        }
      });
    }
  });

  // Function to check MPESA payment status (simplified)
  function checkMpesaPaymentStatus(reference, callback) {
    $.ajax({
      url: '/.netlify/functions/check-payment',
      method: 'POST',
      data: JSON.stringify({ reference: reference }),
      success: function(response) {
        callback(response.payment_success);
      },
      error: function() {
        callback(false);
      }
    });
  }
});