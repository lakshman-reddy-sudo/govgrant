import { useState, useEffect } from 'react'

export interface Product {
  id: string
  name: string
  description: string
  category: string
  pricePerUnit: number
  unit: string
  location: string
  supplierAddress: string
  supplierName: string
  listedAt: string
}

const STORAGE_KEY = 'procurelink_products_v2'
const LEGACY_STORAGE_KEY = 'procurelink_products'

function load(): Product[] {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    localStorage.removeItem(LEGACY_STORAGE_KEY)
    return []
  }

  try {
    return JSON.parse(raw)
  } catch (error) {
    console.warn('Failed to read local products.', error)
    localStorage.removeItem(STORAGE_KEY)
    return []
  }
}

function save(products: Product[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(products))
}

export function useLocalProducts() {
  const [products, setProducts] = useState<Product[]>(() => load())

  useEffect(() => {
    save(products)
  }, [products])

  function addProduct(data: Omit<Product, 'id' | 'listedAt'>) {
    const newProduct: Product = {
      ...data,
      id: `p_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      listedAt: new Date().toISOString(),
    }
    setProducts(prev => [newProduct, ...prev])
    return newProduct
  }

  function removeProduct(id: string) {
    setProducts(prev => prev.filter(p => p.id !== id))
  }

  return { products, addProduct, removeProduct }
}
