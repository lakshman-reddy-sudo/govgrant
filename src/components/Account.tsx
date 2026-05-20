import { useWallet } from '@txnlab/use-wallet-react'
import { useMemo } from 'react'
import { ellipseAddress } from '../utils/ellipseAddress'
import { getAlgodConfigFromViteEnvironment } from '../utils/network/getAlgoClientConfigs'

const Account = () => {
  const { activeAddress } = useWallet()
  const algoConfig = getAlgodConfigFromViteEnvironment()

  const networkName = useMemo(() => {
    return algoConfig.network === '' ? 'localnet' : algoConfig.network.toLocaleLowerCase()
  }, [algoConfig.network])

  return (
    <div className="rounded-xl bg-slate-50 border border-slate-200 p-4">
      <p className="eyebrow">Active wallet</p>
      <a className="mono text-sm font-semibold" target="_blank" href={`https://lora.algokit.io/${networkName}/account/${activeAddress}/`}>
        {ellipseAddress(activeAddress)}
      </a>
      <div className="mt-2 text-sm text-slate-500">Network: <span className="font-semibold text-slate-700">{networkName}</span></div>
    </div>
  )
}

export default Account
