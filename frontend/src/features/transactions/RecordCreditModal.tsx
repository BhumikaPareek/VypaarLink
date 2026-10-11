import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { apiCreateCredit } from '@/api/transactions';
import { apiGetCustomers } from '@/api/customers';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedCustomerId?: string;
};

export function RecordCreditModal({ isOpen, onClose, onSuccess, preselectedCustomerId }: Props) {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: apiGetCustomers,
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: apiCreateCredit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setAmount('');
      setNote('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setDueDate('');
      if (!preselectedCustomerId) setCustomerId('');
      setError('');
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to record credit');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !amount || Number(amount) <= 0) {
      setError('Please select a customer and enter a valid amount.');
      return;
    }
    
    // Create ISO string dates if provided
    const txDateIso = transactionDate ? new Date(transactionDate).toISOString() : undefined;
    const dueDateIso = dueDate ? new Date(dueDate).toISOString() : undefined;

    mutation.mutate({ 
      customerId, 
      amount: Number(amount), 
      note,
      transactionDate: txDateIso,
      dueDate: dueDateIso
    });
  };

  const customerOptions = customersData?.customers.map(c => ({
    value: c.customerId,
    label: `${c.name} (${c.phone})`
  })) || [];

  const selectedCustomer = customersData?.customers.find(c => c.customerId === customerId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Credit">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
        
        {preselectedCustomerId ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800 font-medium">
              {selectedCustomer ? `${selectedCustomer.name} (${selectedCustomer.phone})` : 'Loading...'}
            </div>
          </div>
        ) : (
          <Select
            label="Customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            options={customerOptions}
            required
          />
        )}
        
        <Input 
          label="Amount (₹)" 
          type="number"
          step="0.01"
          min="0.01"
          value={amount} 
          onChange={(e) => setAmount(e.target.value)} 
          required 
          placeholder="0.00"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input 
            label="Transaction Date" 
            type="date"
            value={transactionDate} 
            onChange={(e) => setTransactionDate(e.target.value)} 
            required
          />
          <Input 
            label="Payment Due Date (Optional)" 
            type="date"
            value={dueDate} 
            onChange={(e) => setDueDate(e.target.value)} 
          />
        </div>
        
        <Input 
          label="Purchase Description (Optional)" 
          value={note} 
          onChange={(e) => setNote(e.target.value)} 
          placeholder="e.g. Rice, sugar and cooking oil"
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Record Credit</Button>
        </div>
      </form>
    </Modal>
  );
}
