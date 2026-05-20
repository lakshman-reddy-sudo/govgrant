import React, { useState } from 'react'
import { useProcureLinkState, STATUS_LABELS, STATUS_COLORS } from '../utils/useProcureLinkState'

interface OrderDashboardProps {
  appId: number | null
  explorerBase: string
  onChangeAppId: (id: number | null) => void
}

function shortenAddr(addr: string) {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`
}

function microAlgoToAlgo(micro: bigint): string {
  return (Number(micro) / 1_000_000).toFixed(6)
}

const STEPS = [
  { status: 0, label: 'Tender', icon: '01' },
  { status: 1, label: 'Bid', icon: '02' },
  { status: 2, label: 'Contract', icon: '03' },
  { status: 3, label: 'Dispatch', icon: '04' },
  { status: 5, label: 'Payment', icon: '05' },
]

const OrderDashboard: React.FC<OrderDashboardProps> = ({ appId, explorerBase, onChangeAppId }) => {
  const [inputId, setInputId] = useState(appId ? String(appId) : '')
  const { state, loading, error, refresh } = useProcureLinkState(appId)

  const statusNum = state ? Number(state.status) : -1
  const statusLabel = statusNum >= 0 ? STATUS_LABELS[statusNum] ?? `Status ${statusNum}` : 'Unknown'
  const statusColor = statusNum >= 0 ? STATUS_COLORS[statusNum] ?? 'bg-gray-100 text-gray-500' : 'bg-gray-100 text-gray-400'

  function getStepState(stepStatus: number) {
    if (statusNum === 6 || statusNum === 7) {
      if (stepStatus === 0) return 'done'
      return 'inactive'
    }
    if (stepStatus < statusNum) return 'done'
    if (stepStatus === statusNum) return 'current'
    return 'inactive'
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div>
          <p className="eyebrow">On-chain proof</p>
          <h2 className="text-2xl font-bold text-gray-900">Order Status</h2>
          <p className="text-sm text-gray-500">Real-time on-chain order state</p>
        </div>
        {appId && (
          <button className="btn btn-xs btn-ghost text-teal-600 ml-auto" onClick={refresh}>
            ↻ Refresh
          </button>
        )}
      </div>

      {/* App ID input */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        <p className="text-sm font-medium text-gray-600 mb-2">Enter Order App ID</p>
        <div className="flex gap-2">
          <input
            className="input input-bordered flex-1 text-sm"
            placeholder="e.g. 1234"
            value={inputId}
            onChange={e => setInputId(e.target.value)}
          />
          <button
            className="btn bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700"
            onClick={() => {
              const id = parseInt(inputId)
              if (id > 0) onChangeAppId(id)
            }}
          >
            Load
          </button>
          {appId && (
            <button className="btn btn-ghost" onClick={() => { onChangeAppId(null); setInputId('') }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {!appId && (
        <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
          <p className="metadata-chip mx-auto mb-3 w-fit">APP ID</p>
          <p>Enter an Order App ID above to view its real-time blockchain state.</p>
        </div>
      )}

      {appId && loading && !state && (
        <div className="flex items-center justify-center py-16">
          <span className="loading loading-spinner loading-lg text-indigo-500" />
        </div>
      )}

      {appId && error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
          <p className="font-medium">Failed to load order state</p>
          <p className="text-sm mt-1">{error}</p>
          <button className="btn btn-sm btn-outline btn-error mt-3" onClick={refresh}>Retry</button>
        </div>
      )}

      {appId && state && (
        <>
          {/* Overview card */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-bold text-gray-800">{state.productName}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusColor}`}>{statusLabel}</span>
                  {state.disputeRaised && (
                    <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Dispute Active</span>
                  )}
                </div>
              </div>
              <a
                href={`${explorerBase}/application/${appId}`}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-indigo-500 underline whitespace-nowrap"
              >
                View on Lora →
              </a>
            </div>

            {/* Financial summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              <div className="bg-indigo-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Escrowed</p>
                <p className="text-lg font-bold text-indigo-700">{microAlgoToAlgo(state.orderAmount)}</p>
                <p className="text-xs text-gray-400">ALGO</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">Funded</p>
                <p className="text-lg font-bold text-teal-700">{state.isFunded ? 'Yes' : 'No'}</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">App ID</p>
                <p className="text-lg font-bold text-gray-700">#{appId}</p>
              </div>
            </div>

            {/* Progress tracker */}
            {statusNum !== 6 && statusNum !== 7 ? (
              <div className="mb-5">
                <p className="text-xs font-medium text-gray-500 mb-3">Order Progress</p>
                <div className="flex items-center gap-0">
                  {STEPS.map((step, i) => {
                    const s = getStepState(step.status)
                    return (
                      <React.Fragment key={step.status}>
                        <div className="flex flex-col items-center flex-1">
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-base transition-all ${
                            s === 'done' ? 'bg-green-500 text-white' :
                            s === 'current' ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' :
                            'bg-gray-100 text-gray-300'
                          }`}>
                            {s === 'done' ? 'OK' : step.icon}
                          </div>
                          <p className={`text-xs mt-1 text-center leading-tight ${s === 'current' ? 'text-indigo-600 font-semibold' : 'text-gray-400'}`}>
                            {step.label}
                          </p>
                        </div>
                        {i < STEPS.length - 1 && (
                          <div className={`h-0.5 flex-1 mx-1 ${getStepState(STEPS[i + 1].status) !== 'inactive' || s === 'done' ? 'bg-green-400' : 'bg-gray-200'}`} />
                        )}
                      </React.Fragment>
                    )
                  })}
                </div>
              </div>
            ) : (
              <div className={`rounded-xl p-4 mb-5 ${statusNum === 6 ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-gray-50 border border-gray-200 text-gray-600'}`}>
                <p className="font-medium">{statusNum === 6 ? 'Dispute in Progress' : 'Order Refunded'}</p>
                <p className="text-sm mt-1">
                  {statusNum === 6
                    ? 'A dispute has been raised. The admin will resolve this order.'
                    : 'This order was disputed and the buyer was refunded.'}
                </p>
              </div>
            )}

            {/* Review */}
            {state.reviewHash && (
              <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-3 text-sm">
                <p className="text-xs text-yellow-700 font-medium mb-1">Review Submitted On-Chain</p>
                <p className="font-mono text-xs text-yellow-600 break-all">{state.reviewHash}</p>
              </div>
            )}
          </div>

          {/* Participants */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Participants & On-Chain Links</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Buyer', value: state.buyer },
                { label: 'Supplier', value: state.supplier },
                { label: 'Admin', value: state.admin },
              ].map(({ label, value }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="w-20 text-gray-400 shrink-0">{label}</span>
                  {value && value !== 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ? (
                    <a
                      href={`${explorerBase}/account/${value}`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-indigo-500 underline hover:opacity-80 truncate"
                    >
                      {shortenAddr(value)}
                    </a>
                  ) : (
                    <span className="text-gray-400 italic">Not set</span>
                  )}
                </div>
              ))}
              <div className="flex items-center gap-3">
                <span className="w-20 text-gray-400 shrink-0">Contract</span>
                <a
                  href={`${explorerBase}/application/${appId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-indigo-500 underline"
                >
                  App #{appId} on Lora
                </a>
              </div>
            </div>
          </div>

          {/* Product hash */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h3 className="font-semibold text-gray-700 mb-2">On-Chain Audit Data</h3>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-gray-400">Product Hash: </span>
                <span className="font-mono text-gray-600 break-all">{state.productHash || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-400">Review Hash: </span>
                <span className="font-mono text-gray-600 break-all">{state.reviewHash || 'Not yet submitted'}</span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default OrderDashboard
