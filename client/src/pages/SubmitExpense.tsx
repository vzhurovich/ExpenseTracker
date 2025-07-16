import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useDropzone } from 'react-dropzone';
import Webcam from 'react-webcam';
import { Camera, Upload, FileText, DollarSign, Calendar, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

interface ExpenseForm {
  amount: number;
  description: string;
  receiptDate: string;
  category: string;
}

// Helper for file validation
export function validateFileTypeAndSize(file: File): boolean {
  if (!file.type.startsWith('image/')) {
    toast.error('Only image files are allowed');
    return false;
  }
  if (file.size === 0) {
    toast.error('File is empty');
    return false;
  }
  return true;
}

const SubmitExpense: React.FC = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [captureMode, setCaptureMode] = useState<'upload' | 'camera'>('upload');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [extractedAmount, setExtractedAmount] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm<ExpenseForm>();

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (!validateFileTypeAndSize(file)) {
        return;
      }
      // Check if file is readable
      const reader = new FileReader();
      reader.onload = () => {
        setSelectedImage(file);
        console.log('File to upload from Folder:', file, file.type, file.size);
        extractTextFromImage(file);
      };
      reader.onerror = () => {
        toast.error('File is not readable or not reachable');
      };
      reader.readAsDataURL(file);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif']
    },
    multiple: false,
    noClick: true, // Prevent default click-to-open
  });

  const capturePhoto = () => {
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        // Convert base64 to file
        fetch(imageSrc)
          .then(res => res.blob())
          .then(blob => {
            const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
            // Validate file size
            if (file.size === 0) {
              toast.error('Captured image is empty');
              return;
            }
            setSelectedImage(file);
            console.log('File to upload:', file, file.type, file.size);
            extractTextFromImage(file);
          });
      }
    }
  };

  const extractTextFromImage = async (file: File) => {
    setIsExtracting(true);
    const formData = new FormData();
    formData.append('receipt', file);

    try {
      const response = await api.post('/expenses/extract-receipt', formData);
      console.log('Extract receipt response:', response);
      const { suggestedAmount } = response.data;
      if (suggestedAmount) {
        setExtractedAmount(suggestedAmount.replace('$', ''));
        setValue('amount', parseFloat(suggestedAmount.replace('$', '')));
        toast.success('Receipt text extracted successfully!');
      } else {
        toast.error('No amount found in receipt.');
      }
    } catch (error) {
      console.error('Extract receipt error:', error);
      toast.error('Failed to extract text from receipt');
    } finally {
      setIsExtracting(false);
    }
  };

  const onSubmit = async (data: ExpenseForm) => {
    if (!selectedImage) {
      toast.error('Please select a receipt image');
      return;
    }

    setIsLoading(true);
    const formData = new FormData();
    formData.append('amount', data.amount.toString());
    formData.append('description', data.description);
    formData.append('receiptDate', data.receiptDate);
    formData.append('category', data.category);
    formData.append('receipt', selectedImage);

    try {
      await api.post('/expenses/submit', formData);
      toast.success('Expense submitted successfully!');
      navigate('/my-expenses');
    } catch (error) {
      toast.error('Failed to submit expense');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Submit Expense</h1>

        {/* Capture Mode Toggle */}
        <div className="flex space-x-4 mb-6">
          <button
            type="button"
            onClick={() => {
              setCaptureMode('upload');
              open(); // Open file dialog
            }}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              captureMode === 'upload'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Upload size={20} />
            <span>Upload Image</span>
          </button>
          <button
            type="button"
            onClick={() => setCaptureMode('camera')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg ${
              captureMode === 'camera'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700'
            }`}
          >
            <Camera size={20} />
            <span>Take Photo</span>
          </button>
        </div>

        {/* Image Capture/Upload */}
        {captureMode === 'upload' ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <input {...getInputProps()} data-testid="dropzone-input" />
            <Upload size={48} className="mx-auto text-gray-400 mb-4" />
            {isDragActive ? (
              <p className="text-blue-500">Drop the receipt image here...</p>
            ) : (
              <div>
                <p className="text-gray-600 mb-2">Drag & drop a receipt image here, or click to select</p>
                <p className="text-sm text-gray-500">Supports: JPG, PNG, GIF</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="relative">
              <Webcam
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                className="w-full rounded-lg"
              />
            </div>
            <button
              type="button"
              onClick={capturePhoto}
              className="w-full bg-blue-500 text-white py-2 px-4 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Capture Photo
            </button>
          </div>
        )}

        {/* Selected Image Preview */}
        {selectedImage && (
          <div className="mt-4">
            <img
              src={URL.createObjectURL(selectedImage)}
              alt="Receipt preview"
              className="w-full max-w-md mx-auto rounded-lg shadow-md"
            />
            {isExtracting && (
              <div className="text-center mt-2">
                <p className="text-blue-500">Extracting text from receipt...</p>
              </div>
            )}
          </div>
        )}

        {/* Expense Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <DollarSign size={16} className="inline mr-1" />
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              {...register('amount', { required: 'Amount is required', min: 0.01 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0.00"
            />
            {errors.amount && (
              <p className="text-red-500 text-sm mt-1">{errors.amount.message}</p>
            )}
            {extractedAmount && (
              <p className="text-green-500 text-sm mt-1">
                Suggested amount: ${extractedAmount}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <FileText size={16} className="inline mr-1" />
              Description
            </label>
            <input
              type="text"
              {...register('description', { required: 'Description is required' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="What was this expense for?"
            />
            {errors.description && (
              <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Calendar size={16} className="inline mr-1" />
              Receipt Date
            </label>
            <input
              type="date"
              {...register('receiptDate')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Tag size={16} className="inline mr-1" />
              Category
            </label>
            <select
              {...register('category')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Select a category</option>
              <option value="office">Office Supplies</option>
              <option value="travel">Travel</option>
              <option value="meals">Meals</option>
              <option value="equipment">Equipment</option>
              <option value="utilities">Utilities</option>
              <option value="other">Other</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isLoading || !selectedImage}
            className="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? 'Submitting...' : 'Submit Expense'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SubmitExpense; 