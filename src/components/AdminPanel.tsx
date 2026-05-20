import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { ProcureLinkClient } from '../contracts/ProcureLink'
import { useProcureLinkState, STATUS_LABELS, STATUS_COLORS } from '../utils/useProcureLinkState'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface AdminPanelProps {
  explorerBase: string
  onViewOrder: (appId: number) => void
}

function TxLink({ txId, explorerBase }: { txId: string; explorerBase: string }) {
  return (
    <a href={`${explorerBase}/transaction/${txId}`} target="_blank" rel="noreferrer" className="text-indigo-500 underline font-mono text-xs break-all">
      {txId.slice(0, 16)}…
    </a>
  )
}

const AdminPanel: React.FC<AdminPanelProps> = ({ explorerBase, onViewOrder }) => {
  const { transactionSigner, activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()

  const [appIdInput, setAppIdInput] = useState('')
  const [appId, setAppId] = useState<number | null>(null)
  const { state, refresh } = useProcureLinkState(appId)
  const [loading, setLoading] = useState<string | null>(null)
  const [lastTx, setLastTx] = useState<{ action: string; txId: string } | null>(null)

  function getClient(id: number) {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    return new ProcureLinkClient({ appId: BigInt(id), defaultSender: activeAddress!, algorand })
  }

  async function handleResolveDispute(refundBuyer: boolean) {
    if (!appId || !activeAddress) return
    setLoading(refundBuyer ? 'refund' : 'release')
    try {
      const client = getClient(appId)
      const result = await client.send.resolveDispute({
        args: { refundBuyer: BigInt(refundBuyer ? 1 : 0) },
        extraFee: AlgoAmount.MicroAlgos(1000),
      })
      setLastTx({ action: refundBuyer ? 'Refund Buyer' : 'Release to Supplier', txId: result.txIds[0] })
      enqueueSnackbar(refundBuyer ? 'Buyer refunded!' : 'Payment released to supplier!', { variant: 'success' })
      refresh()
    } catch (e) {
      enqueueSnackbar(`Error: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(null)
    }
  }

  const statusNum = state ? Number(state.status) : -1
  const statusLabel = statusNum >= 0 ? STATUS_LABELS[statusNum] ?? `Status ${statusNum}` : 'Unknown'
  const statusColor = statusNum >= 0 ? STATUS_COLORS[statusNum] ?? 'bg-gray-100' : 'bg-gray-100'
  const isAdmin = state && activeAddress && state.admin === activeAddress

  return (
    <div className="space-y-5">
      <div>
        <p className="eyebrow">Dispute control room</p>
        <h2 className="text-2xl font-bold text-gray-900">Admin Panel</h2>
        <p className="text-sm text-gray-500">Dispute resolution and order management</p>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-sm text-indigo-700">
        <p className="font-semibold mb-1">Admin = Order Creator (Buyer / Procurement Officer)</p>
        <p className="text-xs text-indigo-500">
          The wallet that deployed the order contract is the admin. Only they can resolve disputes.
        </p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <h3 className="font-semibold text-gray-700 mb-3">Load Order by App ID</h3>
        <div className="flex gap-2">
          <input
            className="input input-bordered flex-1 text-sm"
            placeholder="Enter App ID..."
            value={appIdInput}
            onChange={e => setAppIdInput(e.target.value)}
          />
          <button
            className="btn bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
            onClick={() => { const id = parseInt(appIdInput); if (id > 0) setAppId(id) }}
          >
            Load
          </button>
          {appId && <button className="btn btn-ghost" onClick={() => { setAppId(null); setAppIdInput('') }}>Clear</button>}
        </div>
      </div>

      {appId && state && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3 mb-3">
              <div>
                <div className="flex gap-2 mb-2">
                  <span className="verified-chip">Admin verified</span>
                  <span className="metadata-chip mono">DISPUTE</span>
                </div>
                <h3 className="font-semibold text-gray-800">{state.productName}</h3>
                <p className="text-xs text-gray-400 font-mono">App #{appId}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                <button className="btn btn-xs btn-ghost text-indigo-500" onClick={() => onViewOrder(appId)}>View</button>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-gray-400">Escrowed</p>
                <p className="font-semibold">{(Number(state.orderAmount) / 1e6).toFixed(3)} ALGO</p>
              </div>
              <div>
                <p className="text-gray-400">Funded</p>
                <p className="font-semibold">{state.isFunded ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-gray-400">Dispute</p>
                <p className={`font-semibold ${state.disputeRaised ? 'text-red-600' : 'text-green-600'}`}>
                  {state.disputeRaised ? 'Active' : 'None'}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Your Role</p>
                <p className={`font-semibold ${isAdmin ? 'text-indigo-600' : 'text-gray-400'}`}>
                  {isAdmin ? 'Admin' : 'Viewer'}
                </p>
              </div>
            </div>

            {!isAdmin && activeAddress && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-amber-700 text-xs">
                Your wallet is not the admin for this order. Connect the buyer&apos;s wallet to resolve disputes.
              </div>
            )}
          </div>

          {statusNum === 6 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-red-100 p-5">
              <div className="flex items-center gap-2 mb-4">
                <span className="metadata-chip">ACTION</span>
                <div>
                  <h3 className="font-semibold text-red-700">Dispute Requires Resolution</h3>
                  <p className="text-xs text-gray-400">Review evidence and decide: refund buyer or pay supplier.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-blue-700 mb-1">Buyer</p>
                  <p className="font-mono text-xs text-blue-600 break-all">{state.buyer}</p>
                  <p className="text-xs text-gray-500 mt-2">Refund: {(Number(state.orderAmount) / 1e6).toFixed(3)} ALGO</p>
                </div>
                <div className="bg-teal-50 border border-teal-100 rounded-xl p-4">
                  <p className="text-sm font-semibold text-teal-700 mb-1">Supplier</p>
                  <p className="font-mono text-xs text-teal-600 break-all">{state.supplier}</p>
                  <p className="text-xs text-gray-500 mt-2">Release: {(Number(state.orderAmount) / 1e6).toFixed(3)} ALGO</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  className="btn flex-1 bg-blue-500 text-white border-blue-500 hover:bg-blue-600"
                  onClick={() => handleResolveDispute(true)}
                  disabled={!isAdmin || loading !== null}
                >
                  {loading === 'refund' ? <span className="loading loading-spinner loading-sm" /> : 'Refund Buyer'}
                </button>
                <button
                  className="btn flex-1 bg-teal-500 text-white border-teal-500 hover:bg-teal-600"
                  onClick={() => handleResolveDispute(false)}
                  disabled={!isAdmin || loading !== null}
                >
                  {loading === 'release' ? <span className="loading loading-spinner loading-sm" /> : 'Pay Supplier'}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-center text-gray-400">
              <p>No active dispute on this order.</p>
            </div>
          )}
        </div>
      )}

      {lastTx && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-medium text-green-700 mb-1">Last Transaction — {lastTx.action}</p>
          <TxLink txId={lastTx.txId} explorerBase={explorerBase} />
        </div>
      )}

      <div className="bg-gray-50 rounded-2xl p-5">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">Dispute Resolution Process</h3>
        <ol className="text-sm text-gray-500 space-y-2 list-decimal list-inside">
          <li>Buyer or supplier raises a dispute — order enters Disputed state</li>
          <li>Both parties submit evidence off-chain (email, photos, etc.)</li>
          <li>Admin reviews evidence and decides</li>
          <li>Admin resolves: refund buyer OR release ALGO to supplier</li>
          <li>Decision recorded immutably on Algorand</li>
        </ol>
      </div>
    </div>
  )
}

export default AdminPanel
