import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Dashboard from './components/Dashboard'
import AdminPanel from './components/AdminPanel'
import BeneficiaryPanel from './components/BeneficiaryPanel'

const EXPLORER_BASE = 'https://lora.algokit.io/testnet'

const Home: React.FC = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'admin' | 'beneficiary'>('dashboard')
  // appId is null until the admin deploys a grant from their wallet
  const [appId, setAppId] = useState<number | null>(null)
  const { activeAddress } = useWallet()

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-blue-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-teal-500 flex items-center justify-center text-white font-bold text-lg">G</div>
            <div>
              <h1 className="text-xl font-bold text-gray-800">GovGrant</h1>
              <p className="text-xs text-gray-500">Transparent Grant Disbursement on Algorand</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {activeAddress && (
              <span className="hidden md:block text-xs bg-teal-50 text-teal-700 px-3 py-1 rounded-full border border-teal-200 font-mono">
                {activeAddress.slice(0, 8)}...{activeAddress.slice(-6)}
              </span>
            )}
            <button
              className={`btn btn-sm ${activeAddress ? 'btn-outline' : 'btn-primary bg-teal-500 border-teal-500 hover:bg-teal-600 text-white'}`}
              onClick={() => setOpenWalletModal(true)}
            >
              {activeAddress ? 'Switch Wallet' : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>

      {/* Contract Info Banner */}
      <div className="bg-teal-600 text-white text-xs py-2">
        <div className="max-w-5xl mx-auto px-4 flex flex-wrap gap-4 items-center">
          {appId ? (
            <>
              <span>
                <span className="opacity-75">App ID: </span>
                <a
                  href={`${EXPLORER_BASE}/application/${appId}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-mono underline hover:opacity-80"
                >
                  {appId}
                </a>
              </span>
              <button
                className="opacity-75 hover:opacity-100 underline text-xs"
                onClick={() => { setAppId(null); setActiveTab('admin') }}
              >
                Deploy new grant
              </button>
            </>
          ) : (
            <span className="opacity-75">No grant deployed yet — go to Admin Panel to create one</span>
          )}
          <span className="opacity-75">Network: Algorand TestNet</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {!activeAddress && (
          <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl p-4 mb-6 flex items-center gap-3">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="flex-1 text-sm">Connect your Pera or Defly wallet to interact with the grant contract.</span>
            <button className="btn btn-xs bg-amber-500 text-white border-amber-500 hover:bg-amber-600" onClick={() => setOpenWalletModal(true)}>Connect</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-white shadow-sm rounded-xl p-1 mb-6 w-fit">
          {(['dashboard', 'admin', 'beneficiary'] as const).map((tab) => (
            <button
              key={tab}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab
                  ? 'bg-teal-500 text-white shadow-sm'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'dashboard' ? 'Dashboard' : tab === 'admin' ? 'Admin Panel' : 'Beneficiary Panel'}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === 'dashboard' && (
          appId
            ? <Dashboard appId={appId} explorerBase={EXPLORER_BASE} />
            : <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
                No grant deployed yet.{' '}
                <button className="text-teal-600 underline" onClick={() => setActiveTab('admin')}>Go to Admin Panel</button>
                {' '}to create one.
              </div>
        )}
        {activeTab === 'admin' && (
          <AdminPanel
            appId={appId}
            explorerBase={EXPLORER_BASE}
            onGrantDeployed={(id) => { setAppId(id); setActiveTab('dashboard') }}
          />
        )}
        {activeTab === 'beneficiary' && (
          appId
            ? <BeneficiaryPanel appId={appId} explorerBase={EXPLORER_BASE} />
            : <div className="bg-white rounded-2xl shadow-sm p-10 text-center text-gray-400">
                No grant deployed yet.{' '}
                <button className="text-teal-600 underline" onClick={() => setActiveTab('admin')}>Go to Admin Panel</button>
                {' '}to create one.
              </div>
        )}
      </div>

      <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
    </div>
  )
}

export default Home
