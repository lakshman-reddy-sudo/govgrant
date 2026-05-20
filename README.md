<div align="center">

<h1>🔗 ProcureLink</h1>

<p><strong>A Blockchain-Based Local Procurement Platform for Citizen Empowerment</strong></p>

<p><em>Connecting Verified Suppliers with Trusted Buyers</em></p>

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?logo=fastapi)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/Frontend-React-61DAFB?logo=react)](https://react.dev/)
[![Algorand](https://img.shields.io/badge/Blockchain-Algorand-000000?logo=algorand)](https://www.algorand.com/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-4169E1?logo=postgresql)](https://www.postgresql.org/)
[![Docker](https://img.shields.io/badge/DevOps-Docker-2496ED?logo=docker)](https://www.docker.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

## 📖 Overview

**ProcureLink** is a full-stack digital procurement platform that enables citizens, companies, institutions, and government organizations to source products and services directly from **verified local suppliers** — cutting out intermediaries and bringing transparency to every transaction.

Built on **Aadhaar eKYC**, **UPI payments**, and **Algorand smart contracts**, ProcureLink creates a tamper-proof, auditable procurement ecosystem that empowers farmers, artisans, MSMEs, and small businesses to reach trusted buyers at scale.

> Built as an evolution of the **GovGrant** platform — repurposing the same robust architecture for procurement instead of grant distribution.

---

## 🚩 Problem Statement

Procurement in India suffers from opacity, inefficiency, and exclusion:

| Stakeholder | Pain Points |
|---|---|
| **Suppliers** | Dependent on intermediaries, delayed payments, limited visibility |
| **Buyers** | Hard to find verified vendors, poor price transparency, manual workflows |
| **Institutions/Govt** | Vendor verification challenges, fragmented payment tracking, no auditability |
| **Citizens** | Difficulty finding authentic local products, lack of seller trust |

---

## ✅ Solution

ProcureLink creates a trusted digital marketplace where:

- Suppliers **register and verify** their identity via Aadhaar eKYC
- Products and services are **listed, searched, and compared** on a clean marketplace UI
- Orders are **placed, tracked, and settled** with end-to-end transparency
- Payments flow via **UPI** with smart contract escrow
- Every transaction is **recorded immutably** on the Algorand blockchain

---

## 🎯 Key Features

### 🧑‍💼 User & Role Management
- Email / Mobile OTP / Aadhaar eKYC registration
- Four roles: **Supplier**, **Buyer**, **Procurement Officer**, **Admin**
- JWT-based authentication, RBAC, KYC status tracking

### ✅ Supplier Verification
- Aadhaar, PAN/GSTIN, bank/UPI details, business certificates
- Verification states: `Pending → Verified / Rejected`
- Verification hash stored on-chain

### 🛒 Marketplace
- Product listings with title, category, price, images, certifications
- Search, filter by category/price/rating/location, compare suppliers
- Shopping cart, checkout, address & tax handling

### 📦 Order Management
Full order lifecycle: `Pending → Accepted → Packed → Shipped → Delivered → Completed`  
Supports cancellations, disputes, and returns.

### 💳 UPI Payment Integration
- UPI collect request, QR payment, intent-based flow
- Payment statuses: `Pending / Success / Failed / Refunded`
- Smart contract escrow releases funds after delivery confirmation

### ⛓️ Algorand Blockchain Audit Trail
Every critical event is recorded on-chain:
- Supplier verification · Product listing hashes · Orders · Payments · Reviews · Disputes

### 🏢 Bulk Procurement (RFQ Module)
- Request for Quotation (RFQ) creation
- Multi-supplier bidding, bid comparison
- Purchase order generation with approval workflow

### 📊 Analytics Dashboard
- Supplier: Revenue, orders, conversion rate, top products
- Admin: GMV, active suppliers, transaction counts, social impact metrics

### 🤝 Dispute Resolution
- Evidence upload, admin mediation, refund decisions

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│         TypeScript · Tailwind CSS · DaisyUI · Zustand       │
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API
┌──────────────────────────▼──────────────────────────────────┐
│                      Backend (FastAPI)                       │
│            SQLAlchemy · Alembic · Pydantic · JWT            │
└──────────┬───────────────────────────────┬──────────────────┘
           │                               │
┌──────────▼──────────┐       ┌────────────▼────────────────┐
│   PostgreSQL DB     │       │   Algorand Smart Contracts   │
│  Application data   │       │   AlgoKit · Python SDK      │
└─────────────────────┘       └─────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React, TypeScript, Tailwind CSS, DaisyUI, React Query, Zustand |
| **Backend** | Python, FastAPI, SQLAlchemy, Alembic |
| **Blockchain** | Algorand, AlgoKit, Algorand Python Smart Contracts |
| **Database** | PostgreSQL |
| **Storage** | Cloudinary / AWS S3 |
| **DevOps** | Docker, GitHub Actions, Vercel |

---

## 🗃️ Database Schema (Overview)

```
users          → id, full_name, email, phone, role, aadhaar_verified, upi_id, wallet_address
suppliers      → user_id, business_name, gstin, verification_status
products       → id, supplier_id, title, description, category, price, stock
orders         → id, buyer_id, supplier_id, total_amount, status, blockchain_tx_id
order_items    → order_id, product_id, quantity, price
payments       → order_id, amount, upi_reference, status
carts          → id, buyer_id
cart_items     → cart_id, product_id, quantity
reviews        → product_id, buyer_id, rating, comment
disputes       → order_id, reason, status
```

---

## ⛓️ Smart Contract Methods

```python
register_supplier()    # Store verified supplier data on-chain
add_product()          # Store product listing metadata hash
create_order()         # Create blockchain-backed order record
update_order_status()  # Update order state
confirm_delivery()     # Mark delivery as complete
release_payment()      # Trigger payment settlement
raise_dispute()        # Flag a disputed order
submit_review()        # Store review hash
```

---

## 📁 Folder Structure

```
ProcureLink/
├── public/
│   ├── index.html
│   └── robots.txt
├── src/
│   ├── components/              # UI components
│   ├── contracts/               # Algorand client + contract artifacts
│   │   ├── ProcureLink.ts
│   │   └── README.md
│   ├── interfaces/              # Shared TypeScript interfaces
│   ├── styles/                  # Global styles
│   ├── utils/
│   │   ├── network/             # Algorand network helpers
│   │   └── ...
│   ├── App.tsx
│   ├── Home.tsx
│   └── main.tsx
├── index.html
├── package.json
├── vite.config.ts
└── README.md
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+
- Docker & Docker Compose
- AlgoKit CLI

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/procurelink.git
cd procurelink
```

### 2. Environment Variables

```bash
# Backend
cp procurelink-backend/.env.example procurelink-backend/.env
# Fill in: DATABASE_URL, SECRET_KEY, ALGORAND_NODE_URL, UPI_GATEWAY_KEY, etc.
```

### 3. Run with Docker Compose

```bash
docker-compose up --build
```

### 4. Run Manually

```bash
# Backend
cd procurelink-backend
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload

# Frontend
cd procurelink-frontend
npm install
npm run dev

# Smart Contracts
cd procurelink-contracts
algokit bootstrap
algokit deploy
```

---

## 🔌 API Endpoints (Summary)

```
POST   /auth/register          Register a new user
POST   /auth/login             Login and get JWT

GET    /users/me               Get current user profile

GET    /products               List all products
POST   /products               Create a product listing
PUT    /products/{id}          Update a product

POST   /orders                 Place an order
GET    /orders/{id}            Get order details

POST   /payments/initiate      Initiate UPI payment
POST   /payments/webhook       Handle payment status webhook

POST   /reviews                Submit a product review

GET    /admin/dashboard        Admin metrics overview
```

Full API docs available at `http://localhost:8000/docs` (Swagger UI) after running the backend.

---

## 🎬 Demo Scenario

1. 🧑‍🌾 **Ramesh (Farmer)** registers, completes Aadhaar KYC, and lists **organic mangoes**.
2. 🎨 **Priya (Artist)** lists her **handmade paintings**.
3. 🏢 **A local MSME** lists **office stationery**.
4. 🏫 **A school procurement officer** places a bulk order for 100 kg of mangoes via RFQ.
5. 👩‍💻 **A citizen** buys Priya's painting via the marketplace.
6. 💳 Both pay via **UPI** — transactions recorded on **Algorand**.
7. 📦 Suppliers mark orders delivered; payments are auto-released.
8. ⭐ Buyers leave reviews; everything is on the blockchain audit trail.

---

## 🗺️ Development Roadmap

| Week | Milestone |
|---|---|
| 1 | Project setup, monorepo, branding |
| 2 | Auth, JWT, role management |
| 3 | Supplier verification module |
| 4 | Product CRUD, image uploads |
| 5 | Marketplace UI, search & filters |
| 6 | Cart & checkout flow |
| 7 | UPI payment integration (mock) |
| 8 | Algorand smart contract + backend integration |
| 9 | Order tracking, ratings & reviews |
| 10 | Admin dashboard |
| 11 | RFQ / bulk procurement module |
| 12 | Deployment, final demo, presentation |

---

## 🌍 Social Impact

ProcureLink tracks:

- Total suppliers onboarded (incl. rural & women-led)
- Total GMV transacted
- Average supplier income increase
- CO₂ savings from local sourcing

**Government Alignment:** Digital India · Startup India · Vocal for Local · Make in India · PM Vishwakarma · FPOs

---

## 🔮 Future Enhancements

- Real Aadhaar API integration (UIDAI)
- Razorpay / PhonePe live UPI integration
- Logistics & courier API integration
- AI-powered product recommendations
- Demand forecasting & dynamic pricing
- Fraud detection & supplier scoring
- Multilingual UI (Hindi, Telugu, Tamil, etc.)

---

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first to discuss what you'd like to change.

```bash
git checkout -b feature/your-feature
git commit -m "feat: add your feature"
git push origin feature/your-feature
```

---

## 📄 License

---

<div align="center">

**Built with ❤️ to empower local suppliers and transparent procurement across India.**

⭐ Star this repo if you find it useful!

</div>
