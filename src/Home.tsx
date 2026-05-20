import { useWallet } from '@txnlab/use-wallet-react'
import React, { useState } from 'react'
import ConnectWallet from './components/ConnectWallet'
import Marketplace from './components/Marketplace'
import SupplierHub from './components/SupplierHub'
import BuyerOrders from './components/BuyerOrders'
import OrderDashboard from './components/OrderDashboard'
import AdminPanel from './components/AdminPanel'

const EXPLORER_BASE = 'https://lora.algokit.io/testnet'

type Tab = 'marketplace' | 'buyer' | 'supplier' | 'admin' | 'dashboard'

const NAV: { id: Tab; label: string; kicker: string }[] = [
  { id: 'marketplace', label: 'Marketplace', kicker: 'Source locally' },
  { id: 'buyer', label: 'My Orders', kicker: 'Buyer ledger' },
  { id: 'supplier', label: 'Supplier Hub', kicker: 'Fulfilment desk' },
  { id: 'admin', label: 'Admin', kicker: 'Dispute control' },
  { id: 'dashboard', label: 'Order Status', kicker: 'On-chain proof' },
]

const Home: React.FC = () => {
  const [openWalletModal, setOpenWalletModal] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('marketplace')
  const [inspectAppId, setInspectAppId] = useState<number | null>(null)
  const { activeAddress } = useWallet()

  const goToOrderDashboard = (appId: number) => {
    setInspectAppId(appId)
    setActiveTab('dashboard')
  }

  return (
    <div className="app-shell min-h-screen">
      <header className="ledger-header sticky top-0 z-40">
        <div className="brand-container flex flex-col gap-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="brand-mark">PL</div>
            <div>
              <p className="eyebrow">Blockchain-backed procurement</p>
              <h1 className="brand-title">ProcureLink</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeAddress && (
              <span className="verified-chip mono">
                <span className="status-dot" />
                {activeAddress.slice(0, 8)}...{activeAddress.slice(-6)}
              </span>
            )}
            <button
              className={activeAddress ? 'btn btn-outline' : 'btn btn-primary'}
              onClick={() => setOpenWalletModal(true)}
            >
              {activeAddress ? 'Switch Wallet' : 'Connect Wallet'}
            </button>
          </div>
        </div>

        <div className="trust-strip">
          <div className="brand-container flex flex-wrap items-center gap-x-5 gap-y-2">
            <span>Algorand TestNet</span>
            <span>Smart-contract escrow</span>
            <span>Verified supplier flows</span>
            {inspectAppId && (
              <a
                href={`${EXPLORER_BASE}/application/${inspectAppId}`}
                target="_blank"
                rel="noreferrer"
                className="mono underline"
              >
                Viewing App #{inspectAppId}
              </a>
            )}
          </div>
        </div>
      </header>

      <main className="brand-container py-6 lg:py-8">
        <section className="ledger-hero mb-6">
          <div>
            <p className="eyebrow">Digital India local procurement ledger</p>
            <h2>Transparent sourcing from rural producers to institutional buyers.</h2>
            <p>
              List goods, escrow payments, track fulfilment, and verify every order state on Algorand with a clear administrative workflow.
            </p>
          </div>
          <div className="hero-stats" aria-label="Platform trust metrics">
            <div>
              <span>128-bit</span>
              <small>Address proof</small>
            </div>
            <div>
              <span>5-step</span>
              <small>Order lifecycle</small>
            </div>
            <div>
              <span>100%</span>
              <small>Escrow auditable</small>
            </div>
          </div>
        </section>

        {!activeAddress && (
          <div className="institution-callout mb-6">
            <div>
              <p className="font-semibold">Wallet required for ledger actions</p>
              <p className="text-sm text-slate-600">
                Connect KMD, Pera, Defly, or Exodus to place orders, list products, or resolve procurement disputes.
              </p>
            </div>
            <button className="btn btn-accent" onClick={() => setOpenWalletModal(true)}>Connect</button>
          </div>
        )}

        <nav className="nav-ledger mb-6" aria-label="ProcureLink workspaces">
          {NAV.map((tab) => (
            <button
              key={tab.id}
              className={activeTab === tab.id ? 'active' : ''}
              onClick={() => setActiveTab(tab.id)}
            >
              <span>{tab.label}</span>
              <small>{tab.kicker}</small>
            </button>
          ))}
        </nav>

        {activeTab === 'marketplace' && (
          <Marketplace explorerBase={EXPLORER_BASE} onViewOrder={goToOrderDashboard} />
        )}
        {activeTab === 'buyer' && (
          <BuyerOrders explorerBase={EXPLORER_BASE} onViewOrder={goToOrderDashboard} />
        )}
        {activeTab === 'supplier' && (
          <SupplierHub explorerBase={EXPLORER_BASE} onViewOrder={goToOrderDashboard} />
        )}
        {activeTab === 'admin' && (
          <AdminPanel explorerBase={EXPLORER_BASE} onViewOrder={goToOrderDashboard} />
        )}
        {activeTab === 'dashboard' && (
          <OrderDashboard
            appId={inspectAppId}
            explorerBase={EXPLORER_BASE}
            onChangeAppId={setInspectAppId}
          />
        )}
      </main>

      <ConnectWallet openModal={openWalletModal} closeModal={() => setOpenWalletModal(false)} />
    </div>
  )
}

export default Home
