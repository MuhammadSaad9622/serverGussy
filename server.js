require('dotenv').config();
const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

const app = express();
const PORT = process.env.PORT || 3001;

// =======================
// 1. SECURITY MIDDLEWARE
// =======================
app.use(helmet()); // Security headers
app.disable('x-powered-by'); // Hide server tech

// Rate limiting (100 requests per 15 mins)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests. Please try again later.'
});
app.use('/contact', limiter);

// CORS (Configure allowed origins)
const allowedOrigins = [
  '*', // Production domain
     // Alternate domain
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['POST'], // Only allow POST
  allowedHeaders: ['Content-Type']
}));

// =======================
// 2. EMAIL CONFIGURATION
// =======================
const transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: true // Verify SSL certs
  }
});

// =======================
// 3. VALIDATION CHAIN
// =======================
const contactValidation = [
  body('name').trim().isLength({ min: 2, max: 100 }).escape(),
  body('email').isEmail().normalizeEmail(),
  body('subject').trim().isLength({ max: 200 }).escape(),
  body('message').trim().isLength({ max: 2000 }).escape()
];

// =======================
// 4. PRODUCTION ENDPOINT
// =======================
app.post(
  '/contact',
  express.json({ limit: '10kb' }), // Prevent large payloads
  contactValidation,
  async (req, res) => {
    // Validate inputs
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { name, email, subject, message } = req.body;

    try {
      // Send email
      await transporter.sendMail({
        from: `"Gussy Contact" <${process.env.EMAIL_USER}>`,
        to: 'saadnadeem962@gmail.com',
        replyTo: email,
        subject: `New Contact: ${subject}`,
        html: `
          <div style="font-family: Arial, sans-serif;">
            <h2>Contact Form Submission</h2>
            <p><strong>From:</strong> ${name} (${email})</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <div style="margin-top: 20px; padding: 10px; border: 1px solid #eee;">
              ${message.replace(/\n/g, '<br>')}
            </div>
            <p style="color: #666; margin-top: 20px;">
              Sent via Gussy Contact Form at ${new Date().toLocaleString()}
            </p>
          </div>
        `,
        headers: {
          'X-Priority': '1',
          'X-Mailer': 'Gussy Contact Server'
        }
      });

      res.status(200).json({ 
        success: true,
        message: 'Your message has been sent successfully!' 
      });

    } catch (error) {
      console.error('Email send error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Message failed to send. Please try again later.' 
      });
    }
  }
);

// =======================
// 5. HEALTH CHECK
// =======================
app.get('/', (req, res) => {
  res.status(200).json({ 
    status: 'healthy',
    service: 'Gussy Contact API',
    timestamp: new Date().toISOString() 
  });
});

// =======================
// 6. ERROR HANDLING
// =======================
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    error: 'Internal Server Error' 
  });
});

app.listen(PORT, () => {
  console.log(`Production server running on port ${PORT}`);
});
