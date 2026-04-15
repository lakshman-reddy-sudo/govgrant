import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { GrantDisbursementClient } from '../contracts/GrantDisbursement'
import { useGrantState } from '../utils/useGrantState'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface BeneficiaryPanelProps {
  appId: number
  explorerBase: string
}

function TxLink({ txId, explorerBase }: { txId: string; explorerBase: string }) {
  return (
    <a
      href={`${explorerBase}/transaction/${txId}`}
      target="_blank"
      rel="noreferrer"
      className="text-teal-600 underline font-mono text-xs break-all"
    >
      {txId.slice(0, 16)}…
    </a>
  )
}

const BeneficiaryPanel: React.FC<BeneficiaryPanelProps> = ({ appId, explorerBase }) => {
  const { transactionSigner, activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const { state, refresh } = useGrantState(appId)

  const [loading, setLoading] = useState<string | null>(null)
  const [lastTx, setLastTx] = useState<{ action: string; txId: string } | null>(null)

  function getClient() {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    return new GrantDisbursementClient({
      appId: BigInt(appId),
      defaultSender: activeAddress!,
      algorand,
    })
  }

  async function handleSubmitMilestone(num: 1 | 2) {
    if (!activeAddress) { enqueueSnackbar('Connect wallet first', { variant: 'warning' }); return }

    setLoading(`submit-m${num}`)
    try {
      const appClient = getClient()
      const result = await appClient.send.submitMilestone({
        args: { milestoneNum: BigInt(num) },
      })

      setLastTx({ action: `Submit Milestone ${num}`, txId: result.txIds[0] })
      enqueueSnackbar(`Milestone ${num} submitted!`, { variant: 'success' })
      refresh()
    } catch (e) {
      enqueueSnackbar(`Error: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(null)
    }
  }

  const isBeneficiary = state && activeAddress && state.beneficiary === activeAddress

  return (
    <div className="space-y-5">
      {/* Status Info */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h3 className="font-semibold text-gray-800 mb-3">Your Status</h3>
        <div className="space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${state?.beneficiaryApproved ? 'bg-green-500' : 'bg-gray-300'}`} />
            <span className="text-gray-600">Beneficiary Approved: <strong>{state?.beneficiaryApproved ? 'Yes' : 'No'}</strong></span>
          </div>
          {activeAddress && (
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isBeneficiary ? 'bg-green-500' : 'bg-yellow-400'}`} />
              <span className="text-gray-600">
                Your wallet: {isBeneficiary ? <strong className="text-green-600">Approved Beneficiary</strong> : <span className="text-yellow-600">Not the approved beneficiary</span>}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Role warning — show exactly which wallet is needed */}
      {activeAddress && state?.beneficiaryApproved && !isBeneficiary && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm space-y-2">
          <div className="flex gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Wrong wallet connected. To submit milestones you must connect the approved beneficiary wallet.</span>
          </div>
          {state.beneficiary && (
            <div className="ml-7">
              <p className="text-xs text-amber-600 mb-1">Approved beneficiary address:</p>
              <p className="font-mono text-xs bg-amber-100 rounded px-2 py-1 break-all select-all">{state.beneficiary}</p>
              <p className="text-xs text-amber-500 mt-1">Switch to this wallet in Pera/Defly, then come back.</p>
            </div>
          )}
        </div>
      )}

      {/* Not yet approved */}
      {!state?.beneficiaryApproved && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm flex gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>The admin must approve a beneficiary before milestones can be submitted. Ask the grant authority to add your wallet address.</span>
        </div>
      )}

      {/* Submit Milestone 1 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${state?.milestone1Approved ? 'bg-green-100 text-green-600' : state?.milestone1Submitted ? 'bg-yellow-100 text-yellow-600' : 'bg-teal-100 text-teal-600'}`}>
            M1
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">Milestone 1</h3>
            <p className="text-xs text-gray-400">
              Submit to trigger admin review. Approved → {state?.numMilestones === 1n ? '100%' : '50%'} of funds released automatically.
            </p>
          </div>
          {state?.milestone1Approved
            ? <span className="ml-auto text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Paid Out</span>
            : state?.milestone1Submitted
            ? <span className="ml-auto text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">Under Review</span>
            : null
          }
        </div>

        <button
          className="btn bg-teal-500 text-white border-teal-500 hover:bg-teal-600 w-full"
          onClick={() => handleSubmitMilestone(1)}
          disabled={!state?.beneficiaryApproved || !!state?.milestone1Submitted || loading !== null || !activeAddress}
        >
          {loading === 'submit-m1'
            ? <span className="loading loading-spinner loading-sm" />
            : state?.milestone1Approved ? 'Approved & Paid'
            : state?.milestone1Submitted ? 'Submitted — Awaiting Admin Approval'
            : 'Submit Milestone 1'}
        </button>
      </div>

      {/* Submit Milestone 2 */}
      {state?.numMilestones === 2n && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${state.milestone2Approved ? 'bg-green-100 text-green-600' : state.milestone2Submitted ? 'bg-yellow-100 text-yellow-600' : 'bg-teal-100 text-teal-600'}`}>
              M2
            </div>
            <div>
              <h3 className="font-semibold text-gray-800">Milestone 2</h3>
              <p className="text-xs text-gray-400">
                Requires Milestone 1 to be approved first. Approved → remaining 50% released automatically.
              </p>
            </div>
            {state.milestone2Approved
              ? <span className="ml-auto text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Paid Out</span>
              : state.milestone2Submitted
              ? <span className="ml-auto text-xs bg-yellow-100 text-yellow-600 px-2 py-0.5 rounded-full">Under Review</span>
              : null
            }
          </div>

          <button
            className="btn bg-teal-500 text-white border-teal-500 hover:bg-teal-600 w-full"
            onClick={() => handleSubmitMilestone(2)}
            disabled={!state.milestone1Approved || !!state.milestone2Submitted || loading !== null || !activeAddress}
          >
            {loading === 'submit-m2'
              ? <span className="loading loading-spinner loading-sm" />
              : state.milestone2Approved ? 'Approved & Paid'
              : state.milestone2Submitted ? 'Submitted — Awaiting Admin Approval'
              : !state.milestone1Approved ? 'Complete Milestone 1 First'
              : 'Submit Milestone 2'}
          </button>
        </div>
      )}

      {/* Last Transaction */}
      {lastTx && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs font-medium text-green-700 mb-1">Last Transaction — {lastTx.action}</p>
          <TxLink txId={lastTx.txId} explorerBase={explorerBase} />
          <span className="text-green-600 text-xs ml-1">← View on Lora</span>
        </div>
      )}

      {/* How it works */}
      <div className="bg-gray-50 rounded-2xl p-6">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">How it works</h3>
        <ol className="text-sm text-gray-500 space-y-2 list-decimal list-inside">
          <li>Ask the grant authority to add your wallet address as beneficiary</li>
          <li>Once approved, submit Milestone 1 when your deliverable is ready</li>
          <li>Admin reviews and approves — funds auto-release to your wallet</li>
          {state?.numMilestones === 2n && <li>Submit Milestone 2 after M1 is approved for the remaining 50%</li>}
          <li>All transactions are public on Algorand TestNet</li>
        </ol>
      </div>
    </div>
  )
}

export default BeneficiaryPanel
