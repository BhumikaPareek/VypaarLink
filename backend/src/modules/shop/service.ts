import { prisma } from '../../lib/prisma'
import { z } from 'zod'
import { setupShopSchema, updateShopSchema } from './schemas'

export const getShopByOwnerId = async (ownerId: string) => {
  return prisma.shop.findUnique({ where: { ownerId } })
}

export const createShop = async (ownerId: string, data: z.infer<typeof setupShopSchema>) => {
  const existing = await prisma.shop.findUnique({ where: { ownerId } })
  if (existing) {
    throw new Error('Shop already exists for owner')
  }
  return prisma.shop.create({
    data: {
      name: data.name,
      description: data.description || null,
      address: data.address || null,
      phone: data.phone || null,
      ownerId
    }
  })
}

export const updateShop = async (shopId: string, ownerId: string, data: z.infer<typeof updateShopSchema>) => {
  const shop = await prisma.shop.findUnique({ where: { id: shopId } })
  if (!shop) throw new Error('Shop not found')
  if (shop.ownerId !== ownerId) throw new Error('Access denied')
  
  return prisma.shop.update({
    where: { id: shopId },
    data: {
      name: data.name,
      description: data.description === '' ? null : data.description,
      address: data.address === '' ? null : data.address,
      phone: data.phone === '' ? null : data.phone,
    }
  })
}
