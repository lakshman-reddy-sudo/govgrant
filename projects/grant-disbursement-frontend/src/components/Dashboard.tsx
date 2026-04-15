import React from 'react'
import { useGrantState } from '../utils/useGrantState'

interface DashboardProps {
  appId: number
  explorerBase: string
}

function shortenAddr(addr: string) {
  if (!addr || addr.length < 12) return addr
  return `${addr.slice(0, 8)}...${addr.slice(-6)}`
}

function microAlgoToAlgo(micro: bigint): string {
  return (Number(micro) / 1_000_000).toFixed(6)
}

function getProgress(state: ReturnType<typeof useGrantState>['state']): { percent: number; label: string } {
  if (!state) return { percent: 0, label: 'Loading...' }
  if (!state.isFunded) return { percent: 5, label: 'Grant Created' }
  if (!state.beneficiaryApproved) return { percent: 20, label: 'Funded — Awaiting Beneficiary Approval' }
  if (!state.milestone1Submitted) return { percent: 35, label: 'Beneficiary Approved — Awaiting Milestone 1 Submission' }
  if (!state.milestone1Approved) return { percent: 55, label: 'Milestone 1 Submitted — Awaiting Approval' }
  if (state.numMilestones === 1n) return { percent: 100, label: 'Complete — All Funds Released' }
  if (!state.milestone2Submitted) return { percent: 70, label: 'Milestone 1 Approved (50% Released) — Awaiting Milestone 2' }
  if (!state.milestone2Approved) return { percent: 85, label: 'Milestone 2 Submitted — Awaiting Final Approval' }
  return { percent: 100, label: 'Complete — All Funds Released' }
}

const StatusBadge: React.FC<{ done: boolean; label: string }> = ({ done, label }) => (
  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${done ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
    <span className={`w-2 h-2 rounded-full ${done ? 'bg-green-500' : 'bg-gray-300'}`} />
    {label}
  </span>
)

const Dashboard: React.FC<DashboardProps> = ({ appId, explorerBase }) => {
  const { state, loading, error, refresh } = useGrantState(appId)
  const { percent, label } = getProgress(state)

  if (loading && !state) {
    return (
      <div className="flex items-center justify-center py-16">
        <span className="loading loading-spinner loading-lg text-teal-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-red-700">
        <p className="font-medium">Failed to load grant state</p>
        <p className="text-sm mt-1">{error}</p>
        <button className="btn btn-sm btn-outline btn-error mt-3" onClick={refresh}>Retry</button>
      </div>
    )
  }

  if (!state) return null

  const paidOut1 = state.milestone1Approved ? (
    state.numMilestones === 1n ? state.totalAmount : state.totalAmount / 2n
  ) : 0n
  const paidOut2 = state.milestone2Approved ? state.totalAmount / 2n : 0n
  const totalPaid = paidOut1 + paidOut2

  return (
    <div className="space-y-5">
      {/* Grant Overview Card */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{state.grantName || 'Grant'}</h2>
            <p className="text-gray-500 text-sm mt-1">
              {String(state.numMilestones)} milestone{state.numMilestones !== 1n ? 's' : ''} · Algorand TestNet
            </p>
          </div>
          <button className="btn btn-xs btn-ghost text-teal-600" onClick={refresh}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refresh
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{label}</span>
            <span>{percent}%</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className="bg-teal-500 h-3 rounded-full transition-all duration-500"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-4 mt-5">
          <div className="bg-blue-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Locked</p>
            <p className="text-xl font-bold text-blue-700">{microAlgoToAlgo(state.totalAmount)}</p>
            <p className="text-xs text-gray-400">ALGO</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Released</p>
            <p className="text-xl font-bold text-green-700">{microAlgoToAlgo(totalPaid)}</p>
            <p className="text-xs text-gray-400">ALGO</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Remaining</p>
            <p className="text-xl font-bold text-gray-700">{microAlgoToAlgo(state.totalAmount - totalPaid)}</p>
            <p className="text-xs text-gray-400">ALGO</p>
          </div>
        </div>
      </div>

      {/* Milestone Progress */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Milestone Progress</h3>
        <div className="space-y-4">
          {/* Milestone 1 */}
          <div className="flex items-start gap-4">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${state.milestone1Approved ? 'bg-green-100 text-green-600' : state.milestone1Submitted ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
              1
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-gray-700">Milestone 1</span>
                {state.milestone1Approved
                  ? <StatusBadge done label="Approved & Paid" />
                  : state.milestone1Submitted
                  ? <StatusBadge done={false} label="Submitted — Awaiting Approval" />
                  : <StatusBadge done={false} label="Not Submitted" />
                }
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Payout: {microAlgoToAlgo(state.numMilestones === 1n ? state.totalAmount : state.totalAmount / 2n)} ALGO
              </p>
            </div>
          </div>

          {/* Milestone 2 (if applicable) */}
          {state.numMilestones === 2n && (
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${state.milestone2Approved ? 'bg-green-100 text-green-600' : state.milestone2Submitted ? 'bg-yellow-100 text-yellow-600' : 'bg-gray-100 text-gray-400'}`}>
                2
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-gray-700">Milestone 2</span>
                  {state.milestone2Approved
                    ? <StatusBadge done label="Approved & Paid" />
                    : state.milestone2Submitted
                    ? <StatusBadge done={false} label="Submitted — Awaiting Approval" />
                    : <StatusBadge done={false} label="Not Submitted" />
                  }
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Payout: {microAlgoToAlgo(state.totalAmount / 2n)} ALGO
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Participants & Transparency */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Participants & On-Chain Links</h3>
        <div className="space-y-3 text-sm">
          <div className="flex items-center gap-3">
            <span className="w-24 text-gray-400 shrink-0">Authority</span>
            <a
              href={`${explorerBase}/account/${state.authority}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-teal-600 underline hover:opacity-80 truncate"
            >
              {shortenAddr(state.authority)}
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-gray-400 shrink-0">Beneficiary</span>
            {state.beneficiary && state.beneficiary !== 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA' ? (
              <a
                href={`${explorerBase}/account/${state.beneficiary}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-teal-600 underline hover:opacity-80 truncate"
              >
                {shortenAddr(state.beneficiary)}
              </a>
            ) : (
              <span className="text-gray-400 italic">Not yet assigned</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="w-24 text-gray-400 shrink-0">Contract</span>
            <a
              href={`${explorerBase}/application/${appId}`}
              target="_blank"
              rel="noreferrer"
              className="text-teal-600 underline hover:opacity-80"
            >
              View on Lora (App #{appId})
            </a>
          </div>
        </div>
      </div>

      {/* Status Checklist */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-700 mb-4">Status Checklist</h3>
        <div className="flex flex-wrap gap-2">
          <StatusBadge done={state.isFunded} label="Grant Funded" />
          <StatusBadge done={state.beneficiaryApproved} label="Beneficiary Approved" />
          <StatusBadge done={state.milestone1Submitted} label="M1 Submitted" />
          <StatusBadge done={state.milestone1Approved} label="M1 Approved" />
          {state.numMilestones === 2n && <StatusBadge done={state.milestone2Submitted} label="M2 Submitted" />}
          {state.numMilestones === 2n && <StatusBadge done={state.milestone2Approved} label="M2 Approved" />}
        </div>
      </div>
    </div>
  )
}

export default Dashboard
