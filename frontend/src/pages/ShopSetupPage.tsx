import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useMutation } from '@tanstack/react-query';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { apiSetupShop } from '@/api/shop';
import { useShop } from '@/store/ShopContext';

export function ShopSetupPage() {
  const navigate = useNavigate();
  const { refetch } = useShop();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const mutation = useMutation({
    mutationFn: apiSetupShop,
    onSuccess: () => {
      refetch();
      navigate('/dashboard');
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to setup shop');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      setError('Shop name is required');
      return;
    }
    mutation.mutate({ name, description, address, phone });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-bold text-green-600">VypaarLink</h1>
        <h2 className="mt-6 text-center text-2xl font-bold text-gray-900">
          Welcome! Let's set up your shop
        </h2>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 border border-gray-200">
          <form className="space-y-6" onSubmit={handleSubmit}>
            {error && <div className="text-red-500 text-sm bg-red-50 p-3 rounded">{error}</div>}
            
            <Input
              label="Shop Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="e.g. Ramesh Kirana Store"
            />
            
            <Input
              label="Description (Optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What do you sell?"
            />
            
            <Input
              label="Address (Optional)"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Shop address"
            />
            
            <Input
              label="Phone (Optional)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Contact number"
            />

            <div>
              <Button type="submit" className="w-full" loading={mutation.isPending}>
                Complete Setup
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
