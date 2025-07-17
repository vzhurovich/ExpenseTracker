import React from 'react';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';

interface ReceiptImageDialogProps {
  open: boolean;
  imageUrl: string;
  onClose: () => void;
}

const ReceiptImageDialog: React.FC<ReceiptImageDialogProps> = ({ open, imageUrl, onClose }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto relative">
        <button
          onClick={onClose}
          className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 text-2xl font-bold"
          aria-label="Close"
        >
          &times;
        </button>
        <div className="p-6 flex flex-col items-center">
          <h2 className="text-xl font-bold mb-4">Receipt Image</h2>
          <Zoom>
            <img
              src={imageUrl}
              alt="Receipt"
              className="w-full max-w-md mx-auto rounded-lg shadow-md cursor-zoom-in"
            />
          </Zoom>
        </div>
      </div>
    </div>
  );
};

export default ReceiptImageDialog; 