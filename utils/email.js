const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  const host = process.env.EMAIL_HOST;
  const port = process.env.EMAIL_PORT || 587;
  const user = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const from = process.env.EMAIL_FROM || user;

  if (!host || !user || !pass) {
    throw new Error("Email environment variables are not properly set");
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: false,
    auth: {
      user,
      pass,
    },
  });

  const mailOptions = {
    from,
    to,
    subject,
    html,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;


