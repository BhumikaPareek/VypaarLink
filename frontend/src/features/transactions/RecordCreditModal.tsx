import React, { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { apiCreateCredit } from '@/api/transactions';
import { apiGetCustomers } from '@/api/customers';
import { apiGetProducts } from '@/api/inventory';
import { formatCurrency } from '@/utils/format';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  preselectedCustomerId?: string;
};

interface SelectedItem {
  productId: string;
  name: string;
  price: number;
  unit: string;
  maxStock: number;
  quantity: number;
}

export function RecordCreditModal({ isOpen, onClose, onSuccess, preselectedCustomerId }: Props) {
  const queryClient = useQueryClient();
  const [customerId, setCustomerId] = useState(preselectedCustomerId || '');
  const [entryMode, setEntryMode] = useState<'manual' | 'products'>('manual');
  const [amount, setAmount] = useState('');
  const [transactionDate, setTransactionDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  // Selected products state
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const { data: customersData } = useQuery({
    queryKey: ['customers'],
    queryFn: apiGetCustomers,
    enabled: isOpen,
  });

  const { data: productsData } = useQuery({
    queryKey: ['inventory', 'for-credit-modal'],
    queryFn: () => apiGetProducts(),
    enabled: isOpen && entryMode === 'products',
  });

  const mutation = useMutation({
    mutationFn: apiCreateCredit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
      handleReset();
      onSuccess?.();
      onClose();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to record credit');
    }
  });

  const handleReset = () => {
    setAmount('');
    setNote('');
    setTransactionDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    if (!preselectedCustomerId) setCustomerId('');
    setSelectedItems([]);
    setEntryMode('manual');
    setError('');
  };

  const handleAddProduct = (productId: string) => {
    if (!productId) return;
    const prod = productsData?.products.find(p => p.id === productId);
    if (!prod) return;

    if (prod.quantity <= 0) {
      setError(`Cannot add "${prod.name}" - out of stock.`);
      return;
    }

    const existing = selectedItems.find(item => item.productId === productId);
    if (existing) {
      if (existing.quantity >= prod.quantity) {
        setError(`Only ${prod.quantity} ${prod.unit} available for "${prod.name}".`);
        return;
      }
      setSelectedItems(selectedItems.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setSelectedItems([
        ...selectedItems,
        {
          productId: prod.id,
          name: prod.name,
          price: parseFloat(prod.price),
          unit: prod.unit,
          maxStock: prod.quantity,
          quantity: 1,
        }
      ]);
    }
    setError('');
  };

  const handleUpdateItemQuantity = (productId: string, qty: number) => {
    if (qty <= 0) {
      handleRemoveItem(productId);
      return;
    }
    const item = selectedItems.find(i => i.productId === productId);
    if (item && qty > item.maxStock) {
      setError(`Only ${item.maxStock} ${item.unit} available for "${item.name}".`);
      return;
    }
    setError('');
    setSelectedItems(selectedItems.map(i =>
      i.productId === productId ? { ...i, quantity: qty } : i
    ));
  };

  const handleRemoveItem = (productId: string) => {
    setSelectedItems(selectedItems.filter(i => i.productId !== productId));
  };

  // Calculate product total
  const calculatedTotal = selectedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerId) {
      setError('Please select a customer.');
      return;
    }

    let finalAmount = 0;
    let itemsPayload: Array<{ productId: string; quantity: number }> | undefined = undefined;
    let finalNote = note.trim();

    if (entryMode === 'products') {
      if (selectedItems.length === 0) {
        setError('Please select at least one product.');
        return;
      }
      finalAmount = Math.round(calculatedTotal * 100) / 100;
      itemsPayload = selectedItems.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
      }));
      const itemSummary = selectedItems.map(i => `${i.name} (${i.quantity} ${i.unit})`).join(', ');
      finalNote = finalNote ? `${finalNote} — [Items: ${itemSummary}]` : `Items: ${itemSummary}`;
    } else {
      finalAmount = Number(amount);
      if (!finalAmount || finalAmount <= 0) {
        setError('Please enter a valid amount.');
        return;
      }
    }

    const txDateIso = transactionDate ? new Date(transactionDate).toISOString() : undefined;
    const dueDateIso = dueDate ? new Date(dueDate).toISOString() : undefined;

    mutation.mutate({
      customerId,
      amount: finalAmount,
      note: finalNote || undefined,
      transactionDate: txDateIso,
      dueDate: dueDateIso,
      items: itemsPayload,
    });
  };

  const customerOptions = customersData?.customers.map(c => ({
    value: c.customerId,
    label: `${c.name} (${c.phone})`
  })) || [];

  const selectedCustomer = customersData?.customers.find(c => c.customerId === customerId);

  // Available products not yet added or with remaining stock
  const availableProducts = (productsData?.products || []).filter(p => p.isActive);

  return (
    <Modal isOpen={isOpen} onClose={() => { handleReset(); onClose(); }} title="Record Credit" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-red-500 text-sm bg-red-50 p-2.5 rounded-lg border border-red-200">{error}</div>}

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

        {/* Mode switcher: Manual Entry vs Select Products */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => setEntryMode('manual')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              entryMode === 'manual'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Manual Amount Entry
          </button>
          <button
            type="button"
            onClick={() => setEntryMode('products')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              entryMode === 'products'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-500 hover:text-gray-900'
            }`}
          >
            Select from Inventory
          </button>
        </div>

        {entryMode === 'manual' ? (
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
        ) : (
          <div className="flex flex-col gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Add Product from Inventory</label>
              <select
                value=""
                onChange={(e) => {
                  handleAddProduct(e.target.value);
                  e.target.value = '';
                }}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-green-600"
              >
                <option value="">Choose a product to add...</option>
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                    {p.name} — {formatCurrency(p.price)} (Stock: {p.quantity} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            {selectedItems.length > 0 ? (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex flex-col gap-2 max-h-48 overflow-y-auto">
                {selectedItems.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-2 text-sm bg-white p-2 rounded border border-gray-100">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-gray-900 truncate">{item.name}</div>
                      <div className="text-xs text-gray-500">{formatCurrency(item.price)} each • Max {item.maxStock}</div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="1"
                        max={item.maxStock}
                        value={item.quantity}
                        onChange={(e) => handleUpdateItemQuantity(item.productId, parseInt(e.target.value) || 0)}
                        className="w-16 text-center border rounded px-1.5 py-1 text-sm font-medium"
                      />
                      <span className="text-xs text-gray-500">{item.unit}</span>
                      <div className="w-16 text-right font-semibold text-gray-800 text-sm">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(item.productId)}
                        className="text-red-500 hover:text-red-700 p-1 text-xs"
                        aria-label="Remove item"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 mt-1 font-semibold text-sm">
                  <span>Calculated Total:</span>
                  <span className="text-primary text-base">{formatCurrency(calculatedTotal)}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded-lg text-center border border-dashed border-gray-300">
                No products selected yet. Pick products from the dropdown above.
              </div>
            )}
          </div>
        )}

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
          label="Purchase Description / Note (Optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={entryMode === 'products' ? 'Additional note (optional)' : 'e.g. Rice, sugar and cooking oil'}
        />

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="secondary" type="button" onClick={() => { handleReset(); onClose(); }}>Cancel</Button>
          <Button
            type="submit"
            loading={mutation.isPending}
            disabled={entryMode === 'products' && selectedItems.length === 0}
          >
            {entryMode === 'products' ? `Record Credit (${formatCurrency(calculatedTotal)})` : 'Record Credit'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
