import { z } from 'zod'

export const createSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(200),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email('Invalid email address').max(100).optional().nullable().or(z.literal('')),
  address: z.string().trim().max(500).optional().nullable(),
  gstin: z.string().trim().max(25).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
})

export const updateSupplierSchema = z.object({
  name: z.string().trim().min(1, 'Supplier name is required').max(200).optional(),
  contactPerson: z.string().trim().max(100).optional().nullable(),
  phone: z.string().trim().max(20).optional().nullable(),
  email: z.string().trim().email('Invalid email address').max(100).optional().nullable().or(z.literal('')),
  address: z.string().trim().max(500).optional().nullable(),
  gstin: z.string().trim().max(25).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
})
