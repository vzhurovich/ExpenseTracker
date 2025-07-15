import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';
import { getMyExpenses } from '../services/api';
import toast from 'react-hot-toast';

interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  date?: string;
  status: string;
  receiptUrl?: string;
  receipt_date?: string;
  submitted_at?: string;
}

const MyExpenses: React.FC = () => {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    try {
      const data = await getMyExpenses();
      setExpenses(data);
    } catch (error) {
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Loading expenses...</div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Expenses</h1>
        <p className="mt-2 text-gray-600">
          Track all your submitted expenses
        </p>
      </div>

      {expenses.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 text-lg">No expenses found</p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {expenses.map((expense) => {
              // Use receipt_date if available, otherwise fallback to submitted_at, otherwise null
              const dateString = expense.date || expense.receipt_date || expense.submitted_at || null;
              let formattedDate = 'N/A';
              if (dateString) {
                const dateObj = new Date(dateString);
                if (!isNaN(dateObj.getTime())) {
                  formattedDate = format(dateObj, 'MMM dd, yyyy');
                }
              }
              return (
                <li key={expense.id} className="px-6 py-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">
                        {expense.description}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {expense.category} • {formattedDate}
                      </p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <span className="text-lg font-semibold text-gray-900">
                        ${expense.amount.toFixed(2)}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        expense.status === 'approved' ? 'bg-green-100 text-green-800' :
                        expense.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {expense.status}
                      </span>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MyExpenses; 