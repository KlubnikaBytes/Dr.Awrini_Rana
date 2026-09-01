const nodemailer = require('nodemailer');

exports.sendEmail = async (req, res) => {
  try {
    const { to, subject, html } = req.body;
    const file = req.file;

    if (!to || !subject || !file) {
      return res.status(400).json({ message: 'Missing required fields (to, subject, or file)' });
    }

    // Configure Nodemailer for Hostinger
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.hostinger.com',
      port: process.env.SMTP_PORT || 465,
      secure: true, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const mailOptions = {
      from: `"Mediplix" <${process.env.SMTP_USER}>`,
      to,
      bcc: process.env.SMTP_USER, // Add BCC so a copy goes to the sender's inbox for record-keeping
      subject,
      html: html || `<p>Please find your requested document attached.</p>`,
      attachments: [
        {
          filename: file.originalname || 'document.pdf',
          content: file.buffer,
          contentType: 'application/pdf',
        },
      ],
    };

    await transporter.sendMail(mailOptions);
    res.json({ message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email', error: error.message });
  }
};
