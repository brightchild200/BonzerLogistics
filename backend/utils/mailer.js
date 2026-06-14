const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

const sendMail = async (to, subject, html) => {
  const info = await transporter.sendMail({
    from: `"Bonzer Logistics" <${process.env.GMAIL_USER}>`,
    to,
    subject,
    html
  });
  console.log(`Mail sent: ${info.messageId}`);
  return info;
};

module.exports = { sendMail };
