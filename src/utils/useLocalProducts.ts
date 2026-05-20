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

const STORAGE_KEY = 'procurelink_products'
const DEMO_SUPPLIERS = [
  '3NOAUZJDJZ7WJIE3CD3XFG2F5LKGIBX6DCBXBHRIP6X7QSJDAW5MNYU4EU',
  'PFWHY3FFLU7F4IOOZ7S7PAHZMHHZVHTGRPGLG3D2CWJSKJTVXYYUB3BWJI',
  'EOTXZGI7HDCMV56IXTX6N2JD5RNAEAWCBLDK4EZN7O76BZCVZ7QPY6LQ6A',
]

const DEMO_PRODUCTS: Product[] = [
  {
    id: 'demo_telangana_mango',
    name: 'Banganapalli Mango Crates',
    description: 'Grade A seasonal mangoes packed for institutional kitchens and retail distribution.',
    category: 'Produce',
    pricePerUnit: 0.42,
    unit: 'crate',
    location: 'Nizamabad, Telangana',
    supplierAddress: DEMO_SUPPLIERS[0],
    supplierName: 'Telangana Farmer Collective',
    listedAt: '2026-05-20T00:00:00.000Z',
  },
  {
    id: 'demo_kutch_textiles',
    name: 'Handwoven Cotton Yardage',
    description: 'Small-batch artisan textile lots with batch traceability and procurement-ready packaging.',
    category: 'Textiles',
    pricePerUnit: 0.18,
    unit: 'meter',
    location: 'Bhuj, Gujarat',
    supplierAddress: DEMO_SUPPLIERS[1],
    supplierName: 'Kutch Loom Guild',
    listedAt: '2026-05-20T00:00:00.000Z',
  },
  {
    id: 'demo_coorg_spice',
    name: 'Organic Black Pepper',
    description: 'Sorted whole peppercorns from a verified grower cluster for canteens and processors.',
    category: 'Spices',
    pricePerUnit: 0.065,
    unit: 'kg',
    location: 'Kodagu, Karnataka',
    supplierAddress: DEMO_SUPPLIERS[2],
    supplierName: 'Coorg Spice Cooperative',
    listedAt: '2026-05-20T00:00:00.000Z',
  },
]

function load(): Product[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return DEMO_PRODUCTS
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
