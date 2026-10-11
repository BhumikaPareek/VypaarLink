import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { apiCreatePayment } from '@/api/transactions';
import { apiGetCustomers } from '@/api/customers';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedCustomerId?: string;
};

export function RecordPaymentModal({ isOpen, onClose, onSuccess, preselectedCustomerId }: Props) {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [reference, setReference] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: apiGetCustomers,
    enabled: isOpen,
  });

  const mutation = useMutation({
    mutationFn: apiCreatePayment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setAmount('');
      setNote('');
      setTransactionDate(new Date().toISOString().split('T')[0]);
      setPaymentMethod('Cash');
      setReference('');
      if (!preselectedCustomerId) setCustomerId('');
      setError('');
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to record payment');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId || !amount || Number(amount) <= 0) {
      setError('Please select a customer and enter a valid amount.');
      return;
    }
    
    const txDateIso = transactionDate ? new Date(transactionDate).toISOString() : undefined;

    mutation.mutate({ 
      customerId, 
      amount: Number(amount), 
      note,
      transactionDate: txDateIso,
      paymentMethod,
      reference
    });
  };

  const customerOptions = customersData?.customers.map(c => ({
    value: c.customerId,
    label: `${c.name} (Bal: ₹${c.outstandingBalance})`
  })) || [];

  const selectedCustomer = customersData?.customers.find(c => c.customerId === customerId);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Record Payment">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-red-500 text-sm bg-red-50 p-2 rounded">{error}</div>}
        
        {preselectedCustomerId ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded text-sm text-gray-800 font-medium flex justify-between">
              <span>{selectedCustomer ? `${selectedCustomer.name}` : 'Loading...'}</span>
              {selectedCustomer && (
                <span className="text-gray-500">Bal: ₹{selectedCustomer.outstandingBalance}</span>
              )}
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
            label="Payment Date" 
            type="date"
            value={transactionDate} 
            onChange={(e) => setTransactionDate(e.target.value)} 
            required
          />
          <Select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            options={[
              { value: 'Cash', label: 'Cash' },
              { value: 'UPI', label: 'UPI' },
              { value: 'Bank Transfer', label: 'Bank Transfer' },
              { value: 'Other', label: 'Other' },
            ]}
          />
        </div>
        
        <Input 
          label="Transaction Reference (Optional)" 
          value={reference} 
          onChange={(e) => setReference(e.target.value)} 
          placeholder="e.g. UPI Ref Number"
        />

        <Input 
          label="Note (Optional)" 
          value={note} 
          onChange={(e) => setNote(e.target.value)} 
          placeholder="e.g. Cleared monthly balance"
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" loading={mutation.isPending}>Record Payment</Button>
        </div>
      </form>
    </Modal>
  );
}
