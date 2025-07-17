import express from 'express';
import multer from 'multer';
import path from 'path';
import { createWorker } from 'tesseract.js';
import { body, validationResult } from 'express-validator';
import { db } from '../database/init';
import { AuthRequest, requireRole } from '../middleware/auth';
import fs from 'fs';

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads/');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Submit expense
router.post('/submit', upload.single('receipt'), [
  body('amount').isFloat({ min: 0.01 }),
  body('description').notEmpty(),
  body('receiptDate').optional().isISO8601()
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { amount, description, receiptDate, category } = req.body;
    const receiptImage = req.file ? req.file.filename : null;

    db.run(`
      INSERT INTO expenses (user_id, amount, description, receipt_image, receipt_date, category, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [req.user!.id, amount, description, receiptImage, receiptDate, category, 'pending'], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      // Notify admins via WebSocket
      const io = req.app.get('io');
      io.to('admins').emit('new-expense', {
        id: this.lastID,
        userId: req.user!.id,
        amount,
        description,
        status: 'pending'
      });

      // Send notification email to all admins
      console.log('Preparing to send admin notification email...');
      const nodemailer = require('nodemailer');
      // Configure transporter (use environment variables in production)
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      // Get all admin emails
      db.all('SELECT email FROM users WHERE role = ?', ['admin'], (err, admins) => {
        if (!err && admins && admins.length > 0) {
          const adminEmails = admins.map((a: any) => a.email);
          const mailOptions = {
            from: process.env.EMAIL_USER,
            to: adminEmails,
            subject: 'New Expense Submitted',
            text: `A new expense has been submitted.\n\nAmount: $${amount}\nDescription: ${description}\nSubmitted by User ID: ${req.user!.id}\nExpense ID: ${this.lastID}`
          };
          console.log('Sending email to admins:', adminEmails);
          transporter.sendMail(mailOptions, (error: any, info: any) => {
            if (error) {
              console.error('Failed to send admin notification email:', error);
            } else {
              console.log('Admin notification email sent:', info.response);
            }
          });
        } else {
          console.log('No admin emails found or error occurred:', err);
        }
      });
      console.log('Admin notification email logic executed.');

      res.status(201).json({
        id: this.lastID,
        message: 'Expense submitted successfully'
      });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get expenses for user
router.get('/my-expenses', async (req: AuthRequest, res) => {
  try {
    db.all(`
      SELECT * FROM expenses 
      WHERE user_id = ? 
      ORDER BY submitted_at DESC
    `, [req.user!.id], (err, expenses) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(expenses);
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all pending expenses (admin only)
router.get('/pending', requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    db.all(`
      SELECT e.*, u.first_name, u.last_name, u.email
      FROM expenses e
      JOIN users u ON e.user_id = u.id
      WHERE e.status = 'pending'
      ORDER BY e.submitted_at ASC
    `, (err, expenses) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(expenses);
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all expenses (admin only, with optional status filter)
router.get('/all', requireRole('admin'), async (req: AuthRequest, res) => {
  try {
    const { status } = req.query;
    let query = `
      SELECT e.*, u.first_name, u.last_name, u.email
      FROM expenses e
      JOIN users u ON e.user_id = u.id
    `;
    const params: any[] = [];
    if (status && ['pending', 'approved', 'rejected'].includes(status as string)) {
      query += ' WHERE e.status = ?';
      params.push(status);
    }
    query += ' ORDER BY e.submitted_at DESC';
    db.all(query, params, (err, expenses) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(expenses);
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Approve/reject expense (admin only)
router.patch('/:id/status', requireRole('admin'), [
  body('status').isIn(['approved', 'rejected']),
  body('notes').optional()
], async (req: AuthRequest, res: express.Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { id } = req.params;
    const { status, notes } = req.body;

    db.run(`
      UPDATE expenses 
      SET status = ?, approved_at = ?, approved_by = ?, notes = ?
      WHERE id = ?
    `, [status, new Date().toISOString(), req.user!.id, notes, id], function(err) {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Expense not found' });
      }

      // Notify user via WebSocket
      const io = req.app.get('io');
      db.get('SELECT user_id FROM expenses WHERE id = ?', [id], (err, expense: any) => {
        if (!err && expense) {
          io.to(`user-${expense.user_id}`).emit('expense-updated', {
            id: parseInt(id),
            status,
            notes
          });
        }
      });

      res.json({ message: 'Expense status updated successfully' });
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Extract text from receipt image
router.post('/extract-receipt', upload.single('receipt'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const worker = await createWorker('eng');
    const { data: { text } } = await worker.recognize(req.file.path);
    await worker.terminate();

    // Simple regex to find amount (looks for currency patterns)
    const amountRegex = /\$?\d+\.\d{2}/g;
    const amounts = text.match(amountRegex);
    const totalAmount = amounts ? amounts[amounts.length - 1] : null;

    res.json({
      extractedText: text,
      suggestedAmount: totalAmount,
      message: 'Text extracted successfully'
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to extract text from image' });
  }
});

export default router; 