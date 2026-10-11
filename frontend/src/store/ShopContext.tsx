import { createContext, useContext, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Shop } from '@/types/shop'
import { apiGetMyShop } from '@/api/shop'

type ShopContextType = {
  shop: Shop | null
  isLoading: boolean
  refetch: () => void
}

const ShopContext = createContext<ShopContextType | undefined>(undefined)

export function ShopProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['shop'],
    queryFn: apiGetMyShop,
  })

  const value = {
    shop: data?.shop ?? null,
    isLoading,
    refetch: () => {
      queryClient.invalidateQueries({ queryKey: ['shop'] })
    },
  }

  return (
    <ShopContext.Provider value={value}>
      {children}
    </ShopContext.Provider>
  )
}

export function useShop() {
  const context = useContext(ShopContext)
  if (context === undefined) {
    throw new Error('useShop must be used within a ShopProvider')
  }
  return context
}
