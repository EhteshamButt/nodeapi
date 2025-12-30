const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  const host = process.env.EMAIL_HOST;
  const port = parseInt(process.env.EMAIL_PORT || "587");
  const user = process.env.EMAIL_USERNAME || process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASSWORD;
  const from = process.env.EMAIL_FROM || user;

  console.log(`Attempting to send email to ${to} via ${host}:${port}`);
  console.log(`Using user: ${user}`);
  
  if (!host || !user || !pass) {
    const missing = [];
    if (!host) missing.push("EMAIL_HOST");
    if (!user) missing.push("EMAIL_USERNAME/EMAIL_USER");
    if (!pass) missing.push("EMAIL_PASSWORD");
    throw new Error(`Email environment variables are missing: ${missing.join(", ")}`);
  }

  // Determine if we should use SSL/TLS
  // Port 465 is usually for Secure SSL
  const isSecure = port === 465;

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: isSecure,
    auth: {
      user,
      pass,
    },
    // Add timeout to prevent hanging
    connectionTimeout: 10000, // 10 seconds
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_NAME || 'Support'}" <${from}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("Email sent successfully:", info.messageId);
    return info;
  } catch (error) {
    console.error("Nodemailer Error:", error.message);
    throw error;
  }
};

module.exports = sendEmail;







