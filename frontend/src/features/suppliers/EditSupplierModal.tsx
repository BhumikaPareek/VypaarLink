import React, { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { apiUpdateSupplier } from '@/api/suppliers'
import { useToast } from '@/components/ui/Toast'
import type { Supplier } from '@/types/supplier'

type Props = {
  isOpen: boolean
  onClose: () => void
  supplier: Supplier | null
}

export function EditSupplierModal({ isOpen, onClose, supplier }: Props) {
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

  useEffect(() => {
    if (supplier) {
      setName(supplier.name)
      setContactPerson(supplier.contactPerson || '')
      setPhone(supplier.phone || '')
      setEmail(supplier.email || '')
      setAddress(supplier.address || '')
      setGstin(supplier.gstin || '')
      setNotes(supplier.notes || '')
      setError('')
    }
  }, [supplier])

  const mutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof apiUpdateSupplier>[1] }) =>
      apiUpdateSupplier(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] })
      queryClient.invalidateQueries({ queryKey: ['supplier-stats'] })
      queryClient.invalidateQueries({ queryKey: ['supplier', supplier?.id] })
      toast('Supplier updated successfully', 'success')
      onClose()
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to update supplier')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!supplier) return
    if (!name.trim()) {
      setError('Supplier name is required')
      return
    }

    setError('')
    mutation.mutate({
      id: supplier.id,
      data: {
        name: name.trim(),
        contactPerson: contactPerson.trim() || null,
        phone: phone.trim() || null,
        email: email.trim() || null,
        address: address.trim() || null,
        gstin: gstin.trim() || null,
        notes: notes.trim() || null,
      },
    })
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Supplier" maxWidth="max-w-lg">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {error && <div className="text-red-600 text-sm bg-red-50 border border-red-200 p-3 rounded-lg">{error}</div>}

        <Input
          label="Supplier / Business Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          autoFocus
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Contact Person (Optional)"
            value={contactPerson}
            onChange={(e) => setContactPerson(e.target.value)}
          />
          <Input
            label="Phone Number (Optional)"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Email Address (Optional)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            label="GSTIN (Optional)"
            value={gstin}
            onChange={(e) => setGstin(e.target.value)}
          />
        </div>

        <Input
          label="Business Address (Optional)"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
        />

        <Input
          label="Notes / Terms (Optional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="secondary" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" loading={mutation.isPending}>
            Save Changes
          </Button>
        </div>
      </form>
    </Modal>
  )
}
