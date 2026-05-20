import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { ProcureLinkFactory } from '../contracts/ProcureLink'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'
import { useLocalProducts, Product } from '../utils/useLocalProducts'

interface MarketplaceProps {
  explorerBase: string
  onViewOrder: (appId: number) => void
}

const CATEGORY_ICONS: Record<string, string> = {
  Produce: 'AG',
  Handicraft: 'AR',
  Stationery: 'ST',
  Textiles: 'TX',
  Dairy: 'DY',
  Spices: 'SP',
  Other: 'OT',
}

interface PlaceOrderModalProps {
  product: Product
  onClose: () => void
  explorerBase: string
  onOrderPlaced: (appId: number) => void
}

const PlaceOrderModal: React.FC<PlaceOrderModalProps> = ({ product, onClose, explorerBase, onOrderPlaced }) => {
  const { transactionSigner, activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [quantity, setQuantity] = useState(1)
  const [loading, setLoading] = useState(false)
  const [placedTx, setPlacedTx] = useState<{ appId: number; txId: string } | null>(null)

  const totalAlgo = (product.pricePerUnit * quantity).toFixed(3)

  async function handlePlaceOrder() {
    if (!activeAddress) { enqueueSnackbar('Connect wallet first', { variant: 'warning' }); return }
    if (activeAddress === product.supplierAddress) {
      enqueueSnackbar("You can't buy your own product", { variant: 'warning' })
      return
    }

    setLoading(true)
    try {
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const indexerConfig = getIndexerConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
      algorand.setDefaultSigner(transactionSigner)

      const factory = new ProcureLinkFactory({ defaultSender: activeAddress, algorand })

      const productHash = `${product.id}:${product.name}:${quantity}`

      // Step 1 — deploy the order contract (1 Pera approval)
      const { appClient, result } = await factory.send.create.createOrder({
        args: {
          productName: `${product.name} x${quantity}`,
          productHash,
          supplier: product.supplierAddress,
        },
      })

      const appId = Number(appClient.appId)
      // Extra 100 000 µA covers the contract account's minimum balance.
      // fundOrder() reads the balance and stores (balance − 100 000) as orderAmount.
      const microAlgos = Math.round(parseFloat(totalAlgo) * 1_000_000) + 100_000

      // Step 2 — fund + activate in ONE atomic group (1 Pera approval, 2 txns)
      const fundOrderCall = await appClient.params.fundOrder({
        sender: activeAddress,
        signer: transactionSigner,
        args: [],
      })

      await algorand.newGroup()
        .addPayment({
          sender: activeAddress,
          signer: transactionSigner,
          receiver: appClient.appAddress,
          amount: AlgoAmount.MicroAlgos(microAlgos),
        })
        .addAppCallMethodCall(fundOrderCall)
        .send()

      const txId = result.txIds[0]
      setPlacedTx({ appId, txId })

      const stored = JSON.parse(localStorage.getItem('procurelink_orders') || '[]')
      stored.push({
        appId,
        productName: `${product.name} x${quantity}`,
        productId: product.id,
        buyer: activeAddress,
        supplier: product.supplierAddress,
        amount: parseFloat(totalAlgo),
        createdAt: new Date().toISOString(),
      })
      localStorage.setItem('procurelink_orders', JSON.stringify(stored))

      enqueueSnackbar(`Order placed & funded! App ID: ${appId}`, { variant: 'success' })
      setTimeout(() => { onOrderPlaced(appId); onClose() }, 1500)
    } catch (e) {
      enqueueSnackbar(`Error: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/45 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="eyebrow">Smart-contract escrow</p>
            <h3 className="text-lg font-bold text-gray-900">Place procurement order</h3>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        <div className="bg-indigo-50 rounded-xl p-4 mb-4">
          <div className="flex gap-2 mb-3">
            <span className="verified-chip">Verified supplier</span>
            <span className="artisan-chip">{product.category}</span>
          </div>
          <div className="flex items-center gap-2 mb-1">
            <span className="metadata-chip mono">{CATEGORY_ICONS[product.category] || 'OT'}</span>
            <span className="font-semibold text-gray-800">{product.name}</span>
          </div>
          <p className="text-sm text-gray-500">{product.description}</p>
          <p className="text-xs text-gray-400 mt-1">Supplier: <span className="font-mono">{product.supplierAddress.slice(0, 12)}…</span></p>
        </div>

        <div className="space-y-3 mb-4">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Quantity ({product.unit})</label>
            <div className="flex items-center gap-2">
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
              >−</button>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={e => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="input input-bordered text-center w-20 text-sm"
              />
              <button
                className="btn btn-sm btn-outline"
                onClick={() => setQuantity(quantity + 1)}
              >+</button>
            </div>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Price per {product.unit}</span>
            <span className="font-medium">{product.pricePerUnit} ALGO</span>
          </div>
          <div className="flex justify-between text-base font-bold border-t pt-2">
            <span>Total (ALGO Escrow)</span>
            <span className="text-indigo-600">{totalAlgo} ALGO</span>
          </div>
        </div>

        <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-xs text-teal-700 mb-4">
          <strong>Ledger flow:</strong> A contract is deployed, ALGO is escrowed, the supplier fulfils, and buyer confirmation releases funds.
        </div>

        {placedTx ? (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-sm">
            <p className="font-medium text-green-700">Order placed! App ID: {placedTx.appId}</p>
            <a href={`${explorerBase}/application/${placedTx.appId}`} target="_blank" rel="noreferrer" className="text-teal-600 underline text-xs">View on Lora</a>
          </div>
        ) : (
          <button
            className="btn w-full bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
            onClick={handlePlaceOrder}
            disabled={loading || !activeAddress}
          >
            {loading ? <span className="loading loading-spinner loading-sm" /> : `Place Order & Escrow ${totalAlgo} ALGO`}
          </button>
        )}
      </div>
    </div>
  )
}

const Marketplace: React.FC<MarketplaceProps> = ({ explorerBase, onViewOrder }) => {
  const { products, addProduct } = useLocalProducts()
  const { activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('All')

  const [form, setForm] = useState({
    name: '',
    description: '',
    category: 'Produce',
    pricePerUnit: '',
    unit: 'kg',
    location: '',
  })

  const categories = ['All', 'Produce', 'Handicraft', 'Stationery', 'Textiles', 'Dairy', 'Spices', 'Other']

  const filtered = products.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.description.toLowerCase().includes(search.toLowerCase())
    const matchCat = filterCat === 'All' || p.category === filterCat
    return matchSearch && matchCat
  })

  function handleAddProduct() {
    if (!activeAddress) { enqueueSnackbar('Connect wallet to list a product', { variant: 'warning' }); return }
    if (!form.name || !form.pricePerUnit) { enqueueSnackbar('Fill name and price', { variant: 'warning' }); return }
    addProduct({
      name: form.name,
      description: form.description,
      category: form.category,
      pricePerUnit: parseFloat(form.pricePerUnit),
      unit: form.unit,
      location: form.location,
      supplierAddress: activeAddress,
      supplierName: `${activeAddress.slice(0, 8)}…`,
    })
    enqueueSnackbar('Product listed on marketplace', { variant: 'success' })
    setShowAddForm(false)
    setForm({ name: '', description: '', category: 'Produce', pricePerUnit: '', unit: 'kg', location: '' })
  }

  return (
    <div className="space-y-5">
      {/* Header bar */}
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p className="eyebrow">Supplier marketplace</p>
          <h2 className="text-2xl font-bold text-gray-900">Procurement Marketplace</h2>
          <p className="text-sm text-gray-500">{filtered.length} listings from verified local suppliers</p>
        </div>
        <button
          className="btn bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700 btn-sm"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          + List Product
        </button>
      </div>

      {/* Add Product Form */}
      {showAddForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-indigo-100 p-5">
          <p className="eyebrow">Supplier certification</p>
          <h3 className="font-semibold text-gray-900 mb-4">List a verified local product</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Product Name *</label>
              <input className="input input-bordered w-full text-sm" placeholder="e.g. Organic Mangoes" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Category</label>
              <select className="select select-bordered w-full text-sm" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {categories.filter(c => c !== 'All').map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Price per Unit (ALGO) *</label>
              <input type="number" min="0.001" step="0.001" className="input input-bordered w-full text-sm" placeholder="0.5" value={form.pricePerUnit} onChange={e => setForm(f => ({ ...f, pricePerUnit: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Unit</label>
              <input className="input input-bordered w-full text-sm" placeholder="kg / piece / litre" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Location</label>
              <input className="input input-bordered w-full text-sm" placeholder="e.g. Hyderabad, Telangana" value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Description</label>
              <input className="input input-bordered w-full text-sm" placeholder="Short description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700" onClick={handleAddProduct}>List Product</button>
            <button className="btn btn-ghost" onClick={() => setShowAddForm(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <input
          className="input input-bordered input-sm flex-1 min-w-[200px]"
          placeholder="Search products…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="flex gap-1 flex-wrap">
          {categories.map(c => (
            <button
              key={c}
              className={`btn btn-xs rounded-full ${filterCat === c ? 'bg-indigo-600 text-white border-indigo-600' : 'btn-outline border-gray-200 text-gray-600'}`}
              onClick={() => setFilterCat(c)}
            >
              {c !== 'All' && CATEGORY_ICONS[c]} {c}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <p className="text-4xl mb-3">🛒</p>
          <p className="text-gray-400 font-medium">No products listed yet.</p>
          <p className="text-gray-400 text-sm mt-1">Be the first to list a product as a supplier.</p>
          <button className="btn btn-sm bg-indigo-600 text-white border-indigo-600 mt-4" onClick={() => setShowAddForm(true)}>List a Product</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <div key={product.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-3">
                <div>
                  <div className="flex flex-wrap gap-2 mb-2">
                    <span className="verified-chip">Verified</span>
                    <span className="artisan-chip">{product.category}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900 leading-tight">{product.name}</h3>
                </div>
                <span className="metadata-chip mono">{CATEGORY_ICONS[product.category] || 'OT'}</span>
              </div>

              <p className="text-sm text-gray-500 mb-3 line-clamp-2">{product.description}</p>

              <div className="space-y-1 text-xs text-gray-400 mb-4">
                {product.location && <p>Origin: {product.location}</p>}
                <p className="mono">Supplier: {product.supplierName}</p>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <span className="text-lg font-bold text-indigo-700">{product.pricePerUnit} ALGO</span>
                  <span className="text-xs text-gray-400"> / {product.unit}</span>
                </div>
                {activeAddress === product.supplierAddress ? (
                  <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full border border-green-200">Your listing</span>
                ) : (
                  <button
                    className="btn btn-sm bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
                    onClick={() => setSelectedProduct(product)}
                    disabled={!activeAddress}
                  >
                    Buy
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && (
        <PlaceOrderModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
          explorerBase={explorerBase}
          onOrderPlaced={onViewOrder}
        />
      )}
    </div>
  )
}

export default Marketplace
