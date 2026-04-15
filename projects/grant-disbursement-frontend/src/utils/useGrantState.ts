import { useEffect, useState, useCallback } from 'react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from './network/getAlgoClientConfigs'
import { GrantDisbursementClient } from '../contracts/GrantDisbursement'

export interface GrantState {
  grantName: string
  authority: string
  beneficiary: string
  totalAmount: bigint
  numMilestones: bigint
  isFunded: boolean
  beneficiaryApproved: boolean
  milestone1Submitted: boolean
  milestone1Approved: boolean
  milestone2Submitted: boolean
  milestone2Approved: boolean
}

export function useGrantState(appId: number | null) {
  const [state, setState] = useState<GrantState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchState = useCallback(async () => {
    if (!appId) { setLoading(false); return }
    try {
      setError(null)

      const algodConfig = getAlgodConfigFromViteEnvironment()
      const indexerConfig = getIndexerConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })

      const appClient = new GrantDisbursementClient({
        appId: BigInt(appId!),
        algorand,
      })

      const raw = await appClient.state.global.getAll()

      const uint = (v: unknown): bigint => {
        if (typeof v === 'bigint') return v
        if (typeof v === 'number') return BigInt(v)
        return 0n
      }
      const str = (v: unknown): string => {
        if (typeof v === 'string') return v
        if (v instanceof Uint8Array) return new TextDecoder().decode(v)
        return ''
      }

      setState({
        grantName: str(raw.grantName),
        authority: str(raw.authority),
        beneficiary: str(raw.beneficiary),
        totalAmount: uint(raw.totalAmount),
        numMilestones: uint(raw.numMilestones),
        isFunded: uint(raw.isFunded) === 1n,
        beneficiaryApproved: uint(raw.beneficiaryApproved) === 1n,
        milestone1Submitted: uint(raw.milestone1Submitted) === 1n,
        milestone1Approved: uint(raw.milestone1Approved) === 1n,
        milestone2Submitted: uint(raw.milestone2Submitted) === 1n,
        milestone2Approved: uint(raw.milestone2Approved) === 1n,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch grant state')
    } finally {
      setLoading(false)
    }
  }, [appId])

  useEffect(() => {
    fetchState()
    const interval = setInterval(fetchState, 5000)
    return () => clearInterval(interval)
  }, [fetchState])

  return { state, loading, error, refresh: fetchState }
}
