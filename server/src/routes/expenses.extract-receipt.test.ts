import request from 'supertest';
import express from 'express';
import router from './expenses';

jest.mock('tesseract.js', () => ({
  createWorker: jest.fn(() => ({
    recognize: jest.fn(() => Promise.resolve({ data: { text: 'Total: $12.34' } })),
    terminate: jest.fn(() => Promise.resolve()),
  })),
}));

describe('POST /extract-receipt', () => {
  const app = express();
  app.use(express.json());
  app.use('/', router);

  it('should return 400 if no file is provided', async () => {
    const res = await request(app).post('/extract-receipt');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'No image provided');
  });

  it('should return 200 and extracted text/suggested amount for valid image', async () => {
    const dummyImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]); // JPEG header
    const res = await request(app)
      .post('/extract-receipt')
      .attach('receipt', dummyImage, 'test.jpg');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('extractedText', 'Total: $12.34');
    expect(res.body).toHaveProperty('suggestedAmount', '$12.34');
    expect(res.body).toHaveProperty('message', 'Text extracted successfully');
  });

  it('should return 500 if OCR fails', async () => {
    const { createWorker } = require('tesseract.js');
    createWorker.mockImplementationOnce(() => ({
      recognize: jest.fn(() => { throw new Error('OCR error'); }),
      terminate: jest.fn(() => Promise.resolve()),
    }));
    const dummyImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const res = await request(app)
      .post('/extract-receipt')
      .attach('receipt', dummyImage, 'test.jpg');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error', 'Failed to extract text from image');
  });

  it('should process a real file upload and extract text', async () => {
    // Simulate FormData upload as in the frontend
    // Use a Buffer as the file content, with filename and mimetype
    const dummyImage = Buffer.from([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const res = await request(app)
      .post('/extract-receipt')
      .attach('receipt', dummyImage, {
        filename: 'receipt.jpg',
        contentType: 'image/jpeg',
      });
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('extractedText', 'Total: $12.34');
    expect(res.body).toHaveProperty('suggestedAmount', '$12.34');
    expect(res.body).toHaveProperty('message', 'Text extracted successfully');
  });
}); 