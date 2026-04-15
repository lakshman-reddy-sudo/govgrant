import React, { useState } from 'react'
import { useWallet } from '@txnlab/use-wallet-react'
import { useSnackbar } from 'notistack'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { GrantDisbursementClient, GrantDisbursementFactory } from '../contracts/GrantDisbursement'
import { useGrantState } from '../utils/useGrantState'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

interface AdminPanelProps {
  appId: number | null
  explorerBase: string
  onGrantDeployed: (appId: number) => void
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

// ─── Step 0: Deploy a new grant ──────────────────────────────────────────────

interface DeployFormProps {
  explorerBase: string
  onDeployed: (appId: number) => void
}

const DeployForm: React.FC<DeployFormProps> = ({ explorerBase, onDeployed }) => {
  const { transactionSigner, activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const [grantName, setGrantName] = useState('Student Research Grant')
  const [numMilestones, setNumMilestones] = useState<1 | 2>(2)
  const [loading, setLoading] = useState(false)
  const [deployedTx, setDeployedTx] = useState<{ appId: number; txId: string } | null>(null)

  async function handleDeploy() {
    if (!activeAddress) { enqueueSnackbar('Connect wallet first', { variant: 'warning' }); return }
    if (!grantName.trim()) { enqueueSnackbar('Enter a grant name', { variant: 'warning' }); return }

    setLoading(true)
    try {
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const indexerConfig = getIndexerConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
      algorand.setDefaultSigner(transactionSigner)

      const factory = new GrantDisbursementFactory({
        defaultSender: activeAddress,
        algorand,
      })

      const { appClient, result } = await factory.send.create.createGrant({
        args: {
          grantName: grantName.trim(),
          numMilestones: BigInt(numMilestones),
        },
      })

      const appId = Number(appClient.appId)
      const txId = result.txIds[0]
      setDeployedTx({ appId, txId })
      enqueueSnackbar(`Grant deployed! App ID: ${appId}`, { variant: 'success' })
      // Brief pause so user can see success, then auto-advance
      setTimeout(() => onDeployed(appId), 1500)
    } catch (e) {
      enqueueSnackbar(`Deploy failed: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6 border-2 border-teal-200">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 rounded-full bg-teal-500 text-white flex items-center justify-center text-sm font-bold">0</div>
        <div>
          <h3 className="font-semibold text-gray-800">Create New Grant</h3>
          <p className="text-xs text-gray-400">Deploy a new smart contract — your wallet becomes the authority</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Grant Name</label>
          <input
            type="text"
            value={grantName}
            onChange={(e) => setGrantName(e.target.value)}
            className="input input-bordered w-full text-sm"
            placeholder="e.g. Student Research Grant"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Number of Milestones</label>
          <div className="flex gap-3">
            {([1, 2] as const).map((n) => (
              <button
                key={n}
                onClick={() => setNumMilestones(n)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                  numMilestones === n
                    ? 'bg-teal-500 text-white border-teal-500'
                    : 'border-gray-200 text-gray-500 hover:border-teal-300'
                }`}
              >
                {n} Milestone{n === 2 ? 's' : ''} {n === 1 ? '(100%)' : '(50% + 50%)'}
              </button>
            ))}
          </div>
        </div>

        <button
          className="btn bg-teal-500 text-white border-teal-500 hover:bg-teal-600 w-full"
          onClick={handleDeploy}
          disabled={loading || !activeAddress}
        >
          {loading ? <span className="loading loading-spinner loading-sm" /> : 'Deploy Grant Contract'}
        </button>

        {deployedTx && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs">
            <p className="font-medium text-green-700 mb-1">Deployed! App ID: {deployedTx.appId}</p>
            <TxLink txId={deployedTx.txId} explorerBase={explorerBase} />
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Admin Panel ─────────────────────────────────────────────────────────

const AdminPanel: React.FC<AdminPanelProps> = ({ appId, explorerBase, onGrantDeployed }) => {
  const { transactionSigner, activeAddress } = useWallet()
  const { enqueueSnackbar } = useSnackbar()
  const { state, refresh } = useGrantState(appId)

  const [fundAmount, setFundAmount] = useState('2')
  const [beneficiaryAddr, setBeneficiaryAddr] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [lastTx, setLastTx] = useState<{ action: string; txId: string } | null>(null)

  function getClient() {
    const algodConfig = getAlgodConfigFromViteEnvironment()
    const indexerConfig = getIndexerConfigFromViteEnvironment()
    const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })
    algorand.setDefaultSigner(transactionSigner)
    return {
      algorand,
      appClient: new GrantDisbursementClient({
        appId: BigInt(appId!),
        defaultSender: activeAddress!,
        algorand,
      }),
    }
  }

  async function handleFundGrant() {
    if (!activeAddress) { enqueueSnackbar('Connect wallet first', { variant: 'warning' }); return }
    const microAlgos = Math.round(parseFloat(fundAmount) * 1_000_000)
    if (isNaN(microAlgos) || microAlgos <= 0) { enqueueSnackbar('Enter a valid amount', { variant: 'warning' }); return }

    setLoading('fund')
    try {
      const { algorand, appClient } = getClient()

      const payTxn = await algorand.createTransaction.payment({
        sender: activeAddress,
        receiver: appClient.appAddress,
        amount: AlgoAmount.MicroAlgos(microAlgos),
      })

      const result = await appClient.send.fundGrant({ args: { payment: payTxn } })
      setLastTx({ action: 'Fund Grant', txId: result.txIds[0] })
      enqueueSnackbar(`Grant funded with ${fundAmount} ALGO`, { variant: 'success' })
      refresh()
    } catch (e) {
      enqueueSnackbar(`Error: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(null)
    }
  }

  async function handleApproveBeneficiary() {
    if (!activeAddress) { enqueueSnackbar('Connect wallet first', { variant: 'warning' }); return }
    if (!beneficiaryAddr || beneficiaryAddr.length < 50) { enqueueSnackbar('Enter a valid Algorand address', { variant: 'warning' }); return }

    setLoading('approve-beneficiary')
    try {
      const { appClient } = getClient()
      const result = await appClient.send.approveBeneficiary({ args: { beneficiary: beneficiaryAddr } })
      setLastTx({ action: 'Approve Beneficiary', txId: result.txIds[0] })
      enqueueSnackbar('Beneficiary approved!', { variant: 'success' })
      refresh()
    } catch (e) {
      enqueueSnackbar(`Error: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(null)
    }
  }

  async function handleApproveMilestone(num: 1 | 2) {
    if (!activeAddress) { enqueueSnackbar('Connect wallet first', { variant: 'warning' }); return }

    setLoading(`approve-m${num}`)
    try {
      const { appClient } = getClient()
      const result = await appClient.send.approveMilestone({
        args: { milestoneNum: BigInt(num) },
        extraFee: AlgoAmount.MicroAlgos(1000), // covers the inner payment txn fee
      })
      setLastTx({ action: `Approve Milestone ${num}`, txId: result.txIds[0] })
      enqueueSnackbar(`Milestone ${num} approved — funds released!`, { variant: 'success' })
      refresh()
    } catch (e) {
      enqueueSnackbar(`Error: ${e instanceof Error ? e.message : String(e)}`, { variant: 'error' })
    } finally {
      setLoading(null)
    }
  }

  // No grant deployed yet — show deploy form
  if (!appId) {
    return <DeployForm explorerBase={explorerBase} onDeployed={onGrantDeployed} />
  }

  const isAuthority = state && activeAddress && state.authority === activeAddress

  return (
    <div className="space-y-5">
      {/* Role Check Banner */}
      {activeAddress && state && !isAuthority && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-700 text-sm flex gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>
            Your wallet is not the grant authority. Admin actions will be rejected.{' '}
            <button className="underline font-medium" onClick={() => onGrantDeployed(0)}>
              Deploy a new grant with your wallet instead.
            </button>
          </span>
        </div>
      )}

      {/* Fund Grant */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-bold">1</div>
          <div>
            <h3 className="font-semibold text-gray-800">Fund the Grant</h3>
            <p className="text-xs text-gray-400">Lock ALGO into the smart contract escrow</p>
          </div>
          {state?.isFunded && <span className="ml-auto text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Done</span>}
        </div>
        <div className="flex gap-3">
          <input
            type="number"
            min="0.001"
            step="0.001"
            value={fundAmount}
            onChange={(e) => setFundAmount(e.target.value)}
            className="input input-bordered flex-1 text-sm"
            placeholder="Amount in ALGO"
            disabled={state?.isFunded}
          />
          <button
            className="btn bg-blue-500 text-white border-blue-500 hover:bg-blue-600 min-w-[120px]"
            onClick={handleFundGrant}
            disabled={!!state?.isFunded || loading !== null || !activeAddress}
          >
            {loading === 'fund' ? <span className="loading loading-spinner loading-sm" /> : 'Fund Grant'}
          </button>
        </div>
      </div>

      {/* Approve Beneficiary */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center text-sm font-bold">2</div>
          <div>
            <h3 className="font-semibold text-gray-800">Approve Beneficiary</h3>
            <p className="text-xs text-gray-400">Assign and approve the grant recipient</p>
          </div>
          {state?.beneficiaryApproved && <span className="ml-auto text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Done</span>}
        </div>
        {state?.beneficiaryApproved && state.beneficiary ? (
          <p className="text-sm font-mono text-gray-600 bg-gray-50 p-3 rounded-lg break-all">{state.beneficiary}</p>
        ) : (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={beneficiaryAddr}
                onChange={(e) => setBeneficiaryAddr(e.target.value)}
                className="input input-bordered flex-1 text-sm font-mono"
                placeholder="Beneficiary Algorand address"
                disabled={state?.beneficiaryApproved}
              />
              {activeAddress && !state?.beneficiaryApproved && (
                <button
                  className="btn btn-sm btn-outline border-purple-300 text-purple-600 hover:bg-purple-50 whitespace-nowrap self-center h-12"
                  onClick={() => setBeneficiaryAddr(activeAddress)}
                  title="Use your connected wallet as the beneficiary"
                >
                  Use my wallet
                </button>
              )}
            </div>
            <button
              className="btn bg-purple-500 text-white border-purple-500 hover:bg-purple-600 w-full"
              onClick={handleApproveBeneficiary}
              disabled={!!state?.beneficiaryApproved || !state?.isFunded || loading !== null || !activeAddress}
            >
              {loading === 'approve-beneficiary' ? <span className="loading loading-spinner loading-sm" /> : 'Approve Beneficiary'}
            </button>
          </div>
        )}
        {!state?.isFunded && <p className="text-xs text-gray-400 mt-2">Fund the grant first.</p>}
      </div>

      {/* Approve Milestone 1 */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${state?.milestone1Approved ? 'bg-green-100 text-green-600' : 'bg-teal-100 text-teal-600'}`}>3</div>
          <div>
            <h3 className="font-semibold text-gray-800">Approve Milestone 1</h3>
            <p className="text-xs text-gray-400">
              Triggers automatic release of {state?.numMilestones === 1n ? '100%' : '50%'} of funds
            </p>
          </div>
          {state?.milestone1Approved && <span className="ml-auto text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Paid Out</span>}
        </div>
        <button
          className="btn bg-teal-500 text-white border-teal-500 hover:bg-teal-600 w-full"
          onClick={() => handleApproveMilestone(1)}
          disabled={!state?.milestone1Submitted || !!state?.milestone1Approved || loading !== null || !activeAddress}
        >
          {loading === 'approve-m1'
            ? <span className="loading loading-spinner loading-sm" />
            : state?.milestone1Approved ? 'Released'
            : state?.milestone1Submitted ? 'Approve & Release Funds'
            : 'Waiting for Beneficiary Submission'}
        </button>
      </div>

      {/* Approve Milestone 2 */}
      {state?.numMilestones === 2n && (
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${state.milestone2Approved ? 'bg-green-100 text-green-600' : 'bg-teal-100 text-teal-600'}`}>4</div>
            <div>
              <h3 className="font-semibold text-gray-800">Approve Milestone 2</h3>
              <p className="text-xs text-gray-400">Triggers automatic release of remaining 50% of funds</p>
            </div>
            {state.milestone2Approved && <span className="ml-auto text-xs bg-green-100 text-green-600 px-2 py-0.5 rounded-full">Paid Out</span>}
          </div>
          <button
            className="btn bg-teal-500 text-white border-teal-500 hover:bg-teal-600 w-full"
            onClick={() => handleApproveMilestone(2)}
            disabled={!state.milestone2Submitted || !!state.milestone2Approved || loading !== null || !activeAddress}
          >
            {loading === 'approve-m2'
              ? <span className="loading loading-spinner loading-sm" />
              : state.milestone2Approved ? 'Released'
              : state.milestone2Submitted ? 'Approve & Release Final Funds'
              : 'Waiting for Beneficiary Submission'}
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
    </div>
  )
}

export default AdminPanel
