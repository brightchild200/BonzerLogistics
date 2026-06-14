/**
 * WhatsApp Business API wrapper
 * Apply Day 1 — Meta approval takes 2-5 days
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
const sendWhatsApp = async (to, templateName, components = []) => {
  const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: 'template',
    template: {
      name: templateName,
      language: { code: 'en_US' },
      components
    }
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(`WhatsApp API error: ${JSON.stringify(err)}`);
  }

  return res.json();
};

module.exports = { sendWhatsApp };
