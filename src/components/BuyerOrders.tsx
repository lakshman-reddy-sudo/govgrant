import React, { useState, useEffect } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { ProcureLinkClient } from '../contracts/ProcureLink'
import { STATUS_LABELS, STATUS_COLORS, useProcureLinkState } from '../utils/useProcureLinkState'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface StoredOrder {
  appId: number
  productName: string
  buyer: string
  supplier: string
  amount: number
  createdAt: string
}

interface BuyerOrdersProps {
  explorerBase: string
  onViewOrder: (appId: number) => void
}

function TxLink({ txId, explorerBase }: { txId: string; explorerBase: string }) {
  return (
    <a href={`${explorerBase}/transaction/${txId}`} target="_blank" rel="noreferrer" className="text-indigo-500 underline font-mono text-xs">
      {txId.slice(0, 12)}…
    </a>
  )
}

interface OrderCardProps {
  order: StoredOrder
  explorerBase: string
  onViewOrder: (appId: number) => void
}

const OrderCard: React.FC<OrderCardProps> = ({ order, explorerBase, onViewOrder }) => {
  const { transactionSigner, activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const { state, refresh } = useProcureLinkState(order.appId)
  const [loading, setLoading] = useState<string | null>(null)
  const [lastTx, setLastTx] = useState<string | null>(null)

  const [reviewText, setReviewText] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)

  function getClient() {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    return new ProcureLinkClient({ appId: BigInt(order.appId), defaultSender: activeAddress!, algorand })
  }

  async function handleConfirmDelivery() {
    setLoading('confirm')
    try {
      const client = getClient()
      const result = await client.send.confirmDelivery({
        args: {},
        extraFee: AlgoAmount.MicroAlgos(1000),
      })
      setLastTx(result.txIds[0])
      enqueueSnackbar('Delivery confirmed! Payment released to supplier.', { variant: 'success' })
      refresh()
    } catch (e) {
      enqueueSnackbar(`Error: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(null)
    }
  }

  async function handleRaiseDispute() {
    setLoading('dispute')
    try {
      const client = getClient()
      const result = await client.send.raiseDispute({ args: {} })
      setLastTx(result.txIds[0])
      enqueueSnackbar('Dispute raised. Admin will review.', { variant: 'warning' })
      refresh()
    } catch (e) {
      enqueueSnackbar(`Error: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(null)
    }
  }

  async function handleSubmitReview() {
    if (!reviewText.trim()) { enqueueSnackbar('Write a review first', { variant: 'warning' }); return }
    setLoading('review')
    try {
      const client = getClient()
      const hash = btoa(reviewText.trim()).slice(0, 32)
      const result = await client.send.submitReview({ args: { reviewHash: hash } })
      setLastTx(result.txIds[0])
      enqueueSnackbar('Review submitted on-chain!', { variant: 'success' })
      setShowReviewForm(false)
      refresh()
    } catch (e) {
      enqueueSnackbar(`Error: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(null)
    }
  }

  const statusNum = state ? Number(state.status) : -1
  const statusLabel = statusNum >= 0 ? STATUS_LABELS[statusNum] ?? `Status ${statusNum}` : 'Loading…'
  const statusColor = statusNum >= 0 ? STATUS_COLORS[statusNum] ?? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-3">
        <div>
          <div className="flex gap-2 mb-2">
            <span className="verified-chip">Escrow verified</span>
            <span className="metadata-chip mono">BUYER</span>
          </div>
          <h3 className="font-semibold text-gray-800">{order.productName}</h3>
          <p className="text-xs text-gray-400 font-mono">App #{order.appId}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
        <span>{order.amount.toFixed(3)} ALGO</span>
        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
        <span className="col-span-2 font-mono truncate">Supplier: {order.supplier.slice(0, 20)}…</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button
          className="btn btn-xs btn-outline border-indigo-200 text-indigo-600"
          onClick={() => onViewOrder(order.appId)}
        >
          View on-chain
        </button>

        {statusNum === 3 && activeAddress === order.buyer && (
          <>
            <button
              className="btn btn-xs bg-green-500 text-white border-green-500 hover:bg-green-600"
              onClick={handleConfirmDelivery}
              disabled={loading !== null}
            >
              {loading === 'confirm' ? <span className="loading loading-spinner loading-xs" /> : 'Confirm Delivery'}
            </button>
            <button
              className="btn btn-xs bg-red-100 text-red-600 border-red-200 hover:bg-red-200"
              onClick={handleRaiseDispute}
              disabled={loading !== null}
            >
              {loading === 'dispute' ? <span className="loading loading-spinner loading-xs" /> : 'Raise Dispute'}
            </button>
          </>
        )}

        {statusNum === 5 && activeAddress === order.buyer && !state?.reviewHash && (
          <button
            className="btn btn-xs bg-teal-500 text-white border-teal-500"
            onClick={() => setShowReviewForm(!showReviewForm)}
          >
            ⭐ Leave Review
          </button>
        )}
      </div>

      {showReviewForm && (
        <div className="mt-3 space-y-2">
          <textarea
            className="textarea textarea-bordered w-full text-sm"
            rows={2}
            placeholder="Write your review…"
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
          />
          <button
            className="btn btn-sm bg-teal-500 text-white border-teal-500"
            onClick={handleSubmitReview}
            disabled={loading === 'review'}
          >
            {loading === 'review' ? <span className="loading loading-spinner loading-sm" /> : 'Submit Review On-Chain'}
          </button>
        </div>
      )}

      {lastTx && (
        <div className="mt-3 text-xs text-gray-400">
          Last tx: <TxLink txId={lastTx} explorerBase={explorerBase} />
        </div>
      )}
    </div>
  )
}

const BuyerOrders: React.FC<BuyerOrdersProps> = ({ explorerBase, onViewOrder }) => {
  const { activeAddress } = useWallet()
  const [orders, setOrders] = useState<StoredOrder[]>([])
  const [manualAppId, setManualAppId] = useState('')

  useEffect(() => {
    const all: StoredOrder[] = JSON.parse(localStorage.getItem('procurelink_orders') || '[]')
    if (activeAddress) {
      setOrders(all.filter(o => o.buyer === activeAddress))
    } else {
      setOrders(all)
    }
  }, [activeAddress])

  if (!activeAddress) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
        <p className="metadata-chip mx-auto mb-3 w-fit">WALLET</p>
        <p>Connect your wallet to see your orders.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="eyebrow">Buyer ledger</p>
          <h2 className="text-2xl font-bold text-gray-900">My Orders</h2>
          <p className="text-sm text-gray-500">{orders.length} orders as buyer</p>
        </div>
      </div>

      {/* Lookup by App ID */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p className="text-sm font-medium text-gray-600 mb-2">Look up any order by App ID</p>
        <div className="flex gap-2">
          <input
            className="input input-bordered input-sm flex-1"
            placeholder="Enter App ID…"
            value={manualAppId}
            onChange={e => setManualAppId(e.target.value)}
          />
          <button
            className="btn btn-sm bg-indigo-600 text-white border-indigo-600"
            onClick={() => {
              const id = parseInt(manualAppId)
              if (id > 0) onViewOrder(id)
            }}
          >
            View
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
          <p className="metadata-chip mx-auto mb-3 w-fit">EMPTY LEDGER</p>
          <p>No orders yet. Go to the Marketplace to place your first order.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map(order => (
            <OrderCard key={order.appId} order={order} explorerBase={explorerBase} onViewOrder={onViewOrder} />
          ))}
        </div>
      )}
    </div>
  )
}

export default BuyerOrders
