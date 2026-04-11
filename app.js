const form = document.getElementById('order-form');
const statusEl = document.getElementById('status');

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusEl.textContent = 'Creating checkout session...';
  const formData = new FormData(form);
  const payload = Object.fromEntries(formData.entries());

  try {
    const response = await fetch('/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Checkout session failed');

    if (data.checkoutUrl) {
      window.location.href = data.checkoutUrl;
      return;
    }

    if (data.sessionId && data.publishableKey) {
      const stripe = Stripe(data.publishableKey);
      const result = await stripe.redirectToCheckout({ sessionId: data.sessionId });
      if (result.error) throw result.error;
      return;
    }

    throw new Error('Backend returned no checkout target');
  } catch (error) {
    statusEl.textContent = `Error: ${error.message}`;
  }
});
