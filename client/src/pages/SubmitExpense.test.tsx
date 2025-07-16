// @jest-environment jsdom
import '@testing-library/jest-dom';
import type { MockInstance } from 'jest-mock';
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SubmitExpense, { validateFileTypeAndSize } from './SubmitExpense';
import toast from 'react-hot-toast';
import { api } from '../services/api';

jest.mock('react-hot-toast');
jest.mock('../services/api', () => ({
  api: { post: jest.fn() },
}));

// Mock URL.createObjectURL for JSDOM
beforeAll(() => {
  // @ts-ignore
  global.URL.createObjectURL = jest.fn(() => 'mock-url');
});

// Mock FileReader
class MockFileReader {
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
  readAsDataURL = jest.fn(function (this: any, file: any) {
    // Only call onload for image files
    if (file && file.type && file.type.startsWith('image/')) {
      if (this.onload) {
        this.onload({} as ProgressEvent<FileReader>);
      }
    }
    // Otherwise, do nothing (simulate no load for non-image files)
  });
}

// @ts-ignore
window.FileReader = MockFileReader;

describe('SubmitExpense onDrop', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('handles valid image file drop', async () => {
    // @ts-ignore
    const file = new File(['dummy'], 'receipt.png', { type: 'image/png', size: 123 });
    (api.post as unknown as MockInstance<any, any>).mockResolvedValue({ data: { suggestedAmount: '$42.00' } });
    const { getByText, getByTestId, queryByText } = render(
      <MemoryRouter>
        <SubmitExpense />
      </MemoryRouter>
    );

    // Switch to upload mode (should be default, but ensure)
    act(() => {
      fireEvent.click(getByText('Upload Image'));
    });

    // Find the input and fire drop event
    const input = getByTestId('dropzone-input');
    expect(input).toBeTruthy();

    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });

    // Wait for extractTextFromImage to be called and UI to update
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/expenses/extract-receipt', expect.any(FormData));
      expect(toast.success).toHaveBeenCalledWith('Receipt text extracted successfully!');
      expect(queryByText(/suggested amount/i)).toBeInTheDocument();
    });
  });

  it('shows error for non-image file', async () => {
    // @ts-ignore
    const file = new File(['dummy'], 'file.txt', { type: 'text/plain', size: 123 });
    validateFileTypeAndSize(file);
    expect(toast.error).toHaveBeenCalledWith('Only image files are allowed');
  });

  it('shows error for empty file', async () => {
    // @ts-ignore
    const file = new File([''], 'empty.png', { type: 'image/png', size: 0 });
    validateFileTypeAndSize(file);
    expect(toast.error).toHaveBeenCalledWith('File is empty');
  });

  it('shows error if FileReader fails', async () => {
    // Patch FileReader to trigger onerror
    class ErrorFileReader extends FileReader {
      onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
      onerror: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null;
      readAsDataURL = jest.fn(() => {
        if (this.onerror) {
          this.onerror({} as ProgressEvent<FileReader>);
        }
      });
    }
    // @ts-ignore
    window.FileReader = ErrorFileReader;
    // @ts-ignore
    const file = new File(['dummy'], 'receipt.png', { type: 'image/png', size: 123 });
    const { getByText, getByTestId } = render(
      <MemoryRouter>
        <SubmitExpense />
      </MemoryRouter>
    );
    act(() => {
      fireEvent.click(getByText('Upload Image'));
    });
    const input = getByTestId('dropzone-input');
    await act(async () => {
      fireEvent.change(input, { target: { files: [file] } });
    });
    expect(toast.error).toHaveBeenCalledWith('File is not readable or not reachable');
  });
}); 