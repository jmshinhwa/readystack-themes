// order-mail.js: order receipts and the bounce webhook, still on Twilio SendGrid
const sgMail = require('@sendgrid/mail');
const express = require('express');

const key = process.env.SENDGRID_API_KEY;
sgMail.setApiKey(key);

async function sendReceipt(order) {
  const msg = {
    to: order.email,
    from: 'orders@shop.example',
    subject: `Receipt for order ${order.id}`,
    templateId: 'd-2c214ac919e84170b21855cc129b4a5f',
    sendAt: Math.floor(Date.now() / 1000) + 600,
    asm: { groupId: 21 },
    mailSettings: { sandboxMode: { enable: process.env.NODE_ENV !== 'production' } },
  };
  return sgMail.send(msg);
}

const app = express();
app.post('/hooks/mail', express.json(), (req, res) => {
  for (const e of req.body) {
    if (e.event === 'bounce') suppress(e.email);
  }
  res.sendStatus(200);
});

function suppress(email) { /* add to our own do-not-mail list */ }
module.exports = { sendReceipt, app };
