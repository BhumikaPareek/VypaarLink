import React, { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { apiCreateSupplier } from '@/api/suppliers'
import { useToast } from '@/components/ui/Toast'

type Props = {
  isOpen: boolean
  onClose: () => void
}

export function AddSupplierModal({ isOpen, onClose }: Props) {
  const queryClient = useQueryClient()
  const { toast } = useToast()

  const [name, setName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [address, setAddress] = useState('')
  const [gstin, setGstin] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: apiCreateSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      toast('Supplier added successfully', 'success')
      handleClose()
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to add supplier')
    },
  })

  const handleClose = () => {
    setName('')
    setContactPerson('')
    setPhone('')
    setEmail('')
    setAddress('')
    setGstin('')
    setNotes('')
    setError('')
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Supplier name is required')
      return
    }

    setError('')
    mutation.mutate({
      name: name.trim(),
      contactPerson: contactPerson.trim() || undefined,
      phone: phone.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      gstin: gstin.trim() || undefined,
      notes: notes.trim() || undefined,
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add New Supplier" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}

        <Input
          label="Supplier / Business Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. ABC Wholesalers Pvt Ltd"
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Contact Person (Optional)"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
            placeholder="e.g. Ramesh Kumar"
          />
          <Input
            label="Phone Number (Optional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 9876543210"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email Address (Optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g. contact@abcwholesale.in"
          />
          <Input
            label="GSTIN (Optional)"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
            placeholder="e.g. 29ABCDE1234F1Z5"
          />
        </div>

        <Input
          label="Business Address (Optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="e.g. APMC Yard, Shop #14, Market Road"
        />

        <Input
          label="Notes / Terms (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Credit period 15 days, delivers on Tuesdays"
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Add Supplier
          </Button>
        </div>
      </form>
    </Modal>
  )
}
