import { useCallback, useEffect, useState } from 'react'
import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { ProcureLinkClient } from '../contracts/ProcureLink'
import { getAlgodConfigFromViteEnvironment, getIndexerConfigFromViteEnvironment } from './network/getAlgoClientConfigs'

export const STATUS_LABELS: Record<number, string> = {
  0: 'Pending',
  1: 'Accepted',
  2: 'Packed',
  3: 'Shipped',
  5: 'Completed',
  6: 'Disputed',
  7: 'Refunded',
}

export const STATUS_COLORS: Record<number, string> = {
  0: 'metadata-chip',
  1: 'verified-chip',
  2: 'verified-chip',
  3: 'artisan-chip',
  5: 'bg-green-100 text-green-700',
  6: 'bg-red-100 text-red-700',
  7: 'metadata-chip',
}

export interface OrderState {
  productName: string
  productHash: string
  buyer: string
  supplier: string
  admin: string
  orderAmount: bigint
  status: bigint
  isFunded: boolean
  disputeRaised: boolean
  reviewHash: string
}

export function useProcureLinkState(appId: number | null) {
  const [state, setState] = useState<OrderState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchState = useCallback(async () => {
    if (!appId) {
      setLoading(false)
      return
    }
    try {
      setError(null)
      const algodConfig = getAlgodConfigFromViteEnvironment()
      const indexerConfig = getIndexerConfigFromViteEnvironment()
      const algorand = AlgorandClient.fromConfig({ algodConfig, indexerConfig })

      const appClient = new ProcureLinkClient({ appId: BigInt(appId), algorand })
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
        productName: str(raw.productName),
        productHash: str(raw.productHash),
        buyer: str(raw.buyer),
        supplier: str(raw.supplier),
        admin: str(raw.admin),
        orderAmount: uint(raw.orderAmount),
        status: uint(raw.status),
        isFunded: uint(raw.isFunded) === 1n,
        disputeRaised: uint(raw.disputeRaised) === 1n,
        reviewHash: str(raw.reviewHash),
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch order state')
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
