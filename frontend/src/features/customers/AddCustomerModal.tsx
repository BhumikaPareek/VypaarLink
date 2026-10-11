import { useState, type FormEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { apiAddCustomer } from '@/api/customers'

type Props = {
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddCustomerModal({ isOpen, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: apiAddCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customers'] })
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      setName('')
      setPhone('')
      setError('')
      onSuccess?.()
      onClose()
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : 'Failed to add customer'
      setError((err as { message?: string })?.message ?? message)
    },
  })

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim() || phone.length !== 10) {
      setError('Please provide a valid name and a 10-digit phone number.')
      return
    }
    setError('')
    mutation.mutate({ name: name.trim(), phone })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Customer">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        <Input
          label="Customer name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="e.g. Ramesh Kumar"
          autoFocus
        />
        <Input
          label="Phone number"
          type="tel"
          inputMode="numeric"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          required
          placeholder="10-digit mobile number"
          hint="This is used as the customer's unique identifier"
          maxLength={10}
        />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Add Customer
          </Button>
        </div>
      </form>
    </Modal>
  )
}
