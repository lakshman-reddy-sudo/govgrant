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

interface SupplierHubProps {
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

const STATUS_NEXT: Record<number, { label: string; code: number }> = {
  1: { label: 'Mark as Packed', code: 2 },
  2: { label: 'Mark as Shipped', code: 3 },
}

interface SupplierOrderCardProps {
  order: StoredOrder
  explorerBase: string
  onViewOrder: (appId: number) => void
}

const SupplierOrderCard: React.FC<SupplierOrderCardProps> = ({ order, explorerBase, onViewOrder }) => {
  const { transactionSigner, activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const { state, refresh } = useProcureLinkState(order.appId)
  const [loading, setLoading] = useState<string | null>(null)
  const [lastTx, setLastTx] = useState<string | null>(null)

  function getClient() {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    return new ProcureLinkClient({ appId: BigInt(order.appId), defaultSender: activeAddress!, algorand })
  }

  async function handleAccept() {
    setLoading('accept')
    try {
      const client = getClient()
      const result = await client.send.acceptOrder({ args: {} })
      setLastTx(result.txIds[0])
      enqueueSnackbar('Order accepted!', { variant: 'success' })
      refresh()
    } catch (e) {
      enqueueSnackbar(`Error: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(null)
    }
  }

  async function handleUpdateStatus(newStatus: number) {
    setLoading(`status_${newStatus}`)
    try {
      const client = getClient()
      const result = await client.send.updateStatus({ args: { newStatus: BigInt(newStatus) } })
      setLastTx(result.txIds[0])
      const labels: Record<number, string> = { 2: 'Packed', 3: 'Shipped' }
      enqueueSnackbar(`Order marked as ${labels[newStatus]}!`, { variant: 'success' })
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

  const statusNum = state ? Number(state.status) : -1
  const statusLabel = statusNum >= 0 ? STATUS_LABELS[statusNum] ?? `Status ${statusNum}` : 'Loading…'
  const statusColor = statusNum >= 0 ? STATUS_COLORS[statusNum] ?? 'bg-gray-100' : 'bg-gray-100'
  const isMine = activeAddress === order.supplier
  const nextStatus = STATUS_NEXT[statusNum]

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-3">
        <div>
          <div className="flex gap-2 mb-2">
            <span className="artisan-chip">Local supplier</span>
            <span className="verified-chip">Ledger linked</span>
          </div>
          <h3 className="font-semibold text-gray-800">{order.productName}</h3>
          <p className="text-xs text-gray-400 font-mono">App #{order.appId}</p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
      </div>

      <div className="grid grid-cols-2 gap-2 text-xs text-gray-500 mb-4">
        <span>{order.amount.toFixed(3)} ALGO escrowed</span>
        <span>{new Date(order.createdAt).toLocaleDateString()}</span>
        <span className="col-span-2 font-mono truncate">Buyer: {order.buyer.slice(0, 20)}…</span>
      </div>

      {!isMine && (
        <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-3">
          Switch to the supplier wallet to manage this order.
        </p>
      )}

      <div className="flex gap-2 flex-wrap">
        <button
          className="btn btn-xs btn-outline border-indigo-200 text-indigo-600"
          onClick={() => onViewOrder(order.appId)}
        >
          View on-chain
        </button>

        {statusNum === 0 && state?.isFunded && isMine && (
          <button
            className="btn btn-xs bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
            onClick={handleAccept}
            disabled={loading !== null}
          >
            {loading === 'accept' ? <span className="loading loading-spinner loading-xs" /> : 'Accept Order'}
          </button>
        )}

        {nextStatus && isMine && (
          <button
            className="btn btn-xs bg-indigo-500 text-white border-indigo-500 hover:bg-indigo-600"
            onClick={() => handleUpdateStatus(nextStatus.code)}
            disabled={loading !== null}
          >
            {loading === `status_${nextStatus.code}` ? <span className="loading loading-spinner loading-xs" /> : nextStatus.label}
          </button>
        )}

        {statusNum >= 1 && statusNum < 5 && statusNum !== 6 && isMine && (
          <button
            className="btn btn-xs bg-red-100 text-red-600 border-red-200 hover:bg-red-200"
            onClick={handleRaiseDispute}
            disabled={loading !== null}
          >
            {loading === 'dispute' ? <span className="loading loading-spinner loading-xs" /> : 'Raise Dispute'}
          </button>
        )}
      </div>

      {lastTx && (
        <div className="mt-3 text-xs text-gray-400">
          Last tx: <TxLink txId={lastTx} explorerBase={explorerBase} />
        </div>
      )}
    </div>
  )
}

const SupplierHub: React.FC<SupplierHubProps> = ({ explorerBase, onViewOrder }) => {
  const { activeAddress } = useWallet()
  const [orders, setOrders] = useState<StoredOrder[]>([])

  useEffect(() => {
    const all: StoredOrder[] = JSON.parse(localStorage.getItem('procurelink_orders') || '[]')
    if (activeAddress) {
      setOrders(all.filter(o => o.supplier === activeAddress))
    } else {
      setOrders(all)
    }
  }, [activeAddress])

  if (!activeAddress) {
    return (
      <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
        <p className="metadata-chip mx-auto mb-3 w-fit">SUPPLIER</p>
        <p>Connect your wallet to manage supplier orders.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Fulfilment desk</p>
        <h2 className="text-2xl font-bold text-gray-900">Supplier Hub</h2>
        <p className="text-sm text-gray-500">{orders.length} orders awaiting your action</p>
      </div>

      {/* Supplier info card */}
      <div className="bg-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center font-bold">SL</div>
          <div>
            <p className="font-bold text-lg">Supplier Dashboard</p>
            <p className="text-xs text-white/70 font-mono">{activeAddress.slice(0, 20)}…</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{orders.length}</p>
            <p className="text-xs text-white/70">Total Orders</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">{orders.filter(o => o.amount > 0).reduce((s, o) => s + o.amount, 0).toFixed(1)}</p>
            <p className="text-xs text-white/70">ALGO Volume</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <p className="text-2xl font-bold">OK</p>
            <p className="text-xs text-white/70">On Algorand</p>
          </div>
        </div>
      </div>

      {/* How to use guide */}
      <div className="bg-teal-50 border border-teal-100 rounded-xl p-4 text-sm text-teal-700">
        <p className="font-semibold mb-2">Supplier Workflow</p>
        <ol className="space-y-1 text-xs list-decimal list-inside">
          <li>Buyer places an order and escrows ALGO on-chain</li>
          <li>You <strong>Accept Order</strong> to confirm you&apos;ll fulfil it</li>
          <li>Update to <strong>Packed</strong> when ready to ship</li>
          <li>Update to <strong>Shipped</strong> when dispatched</li>
          <li>Buyer confirms delivery → ALGO auto-released to your wallet</li>
        </ol>
      </div>

      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
          <p className="metadata-chip mx-auto mb-3 w-fit">NO ORDERS</p>
          <p>No orders assigned to your wallet yet.</p>
          <p className="text-sm mt-1">Buyers need to enter your wallet address when placing an order.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orders.map(order => (
            <SupplierOrderCard key={order.appId} order={order} explorerBase={explorerBase} onViewOrder={onViewOrder} />
          ))}
        </div>
      )}
    </div>
  )
}

export default SupplierHub
