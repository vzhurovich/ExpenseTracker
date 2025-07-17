import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Eye, Download, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import Zoom from 'react-medium-image-zoom';
import 'react-medium-image-zoom/dist/styles.css';
import ReceiptImageDialog from '../components/ReceiptImageDialog';

interface Expense {
  id: number;
  amount: number;
  description: string;
  receipt_image: string;
  receipt_date: string;
  category: string;
  status: string;
  submitted_at: string;
  first_name: string;
  last_name: string;
  email: string;
  notes?: string;
}

const AdminDashboard: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [showReceiptDialog, setShowReceiptDialog] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingExpenses();
  }, []);

  const fetchPendingExpenses = async () => {
    try {
      const response = await api.get('/expenses/pending');
      setExpenses(response.data);
    } catch (error) {
      toast.error('Failed to fetch pending expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async (expenseId: number, status: 'approved' | 'rejected', notes?: string) => {
    try {
      await api.patch(`/expenses/${expenseId}/status`, { status, notes });
      toast.success(`Expense ${status} successfully`);
      fetchPendingExpenses();
      setShowModal(false);
      setSelectedExpense(null);
    } catch (error) {
      toast.error(`Failed to ${status} expense`);
    }
  };

  const viewExpense = (expense: Expense) => {
    setSelectedExpense(expense);
    setShowModal(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading pending expenses...</div>
      </div>
    );
  }

  const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-2">
            Pending Expenses ({expenses.length})
          </h2>
        </div>

        {expenses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No pending expenses to review</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employee
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Description
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Submitted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {expense.first_name} {expense.last_name}
                        </div>
                        <div className="text-sm text-gray-500">{expense.email}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        ${expense.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {expense.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(expense.submitted_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => viewExpense(expense)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Eye size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setReceiptImageUrl(`${apiUrl}/uploads/${expense.receipt_image}`);
                            setShowReceiptDialog(true);
                          }}
                          className="text-indigo-600 hover:text-indigo-900"
                          title="Preview Receipt Image"
                          disabled={!expense.receipt_image}
                        >
                          <ImageIcon size={16} />
                        </button>
                        <button
                          onClick={() => handleApproval(expense.id, 'approved')}
                          className="text-green-600 hover:text-green-900"
                        >
                          <CheckCircle size={16} />
                        </button>
                        <button
                          onClick={() => handleApproval(expense.id, 'rejected')}
                          className="text-red-600 hover:text-red-900"
                        >
                          <XCircle size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Expense Detail Modal */}
      {showModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Expense Details</h2>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Employee</label>
                  <p className="text-sm text-gray-900">
                    {selectedExpense.first_name} {selectedExpense.last_name} ({selectedExpense.email})
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <p className="text-lg font-semibold text-gray-900">
                    ${selectedExpense.amount.toFixed(2)}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <p className="text-sm text-gray-900">
                    {selectedExpense.description}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Receipt Date</label>
                  <p className="text-sm text-gray-900">
                    {new Date(selectedExpense.receipt_date).toLocaleDateString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Receipt Image</label>
                  {selectedExpense.receipt_image && (
                    <div className="mt-2">
                      <button
                        className="text-indigo-600 hover:text-indigo-900 underline"
                        onClick={() => {
                          setReceiptImageUrl(`${apiUrl}/uploads/${selectedExpense.receipt_image}`);
                          setShowReceiptDialog(true);
                        }}
                      >
                        Preview Receipt Image
                      </button>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Status</label>
                  <p className={`text-sm font-semibold ${
                    selectedExpense.status === 'approved'
                      ? 'text-green-600'
                      : selectedExpense.status === 'rejected'
                      ? 'text-red-600'
                      : 'text-gray-700'
                  }`}>
                    {selectedExpense.status.charAt(0).toUpperCase() + selectedExpense.status.slice(1)}
                  </p>
                </div>

                {selectedExpense.notes && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <p className="text-sm text-gray-900">
                      {selectedExpense.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <ReceiptImageDialog
        open={showReceiptDialog}
        imageUrl={receiptImageUrl || ''}
        onClose={() => setShowReceiptDialog(false)}
      />
    </div>
  );
};

export default AdminDashboard; 