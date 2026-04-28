<p align="center">
  <img src="./public/icon.png" width="150" alt="Fundr Logo">
</p>

<h1 align="center">Fundr</h1>

<p align="center">
  <i>A Decentralized, Transparent, and Secure Crowdfunding Platform built on Stellar Soroban.</i>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" />
  <img src="https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" />
  <img src="https://img.shields.io/badge/Rust-000000?style=for-the-badge&logo=rust&logoColor=white" />
  <img src="https://img.shields.io/badge/Stellar-000000?style=for-the-badge&logo=stellar&logoColor=white" />
</p>

---

### 🟢 Live Production Link: [https://fundr-green.vercel.app](https://fundr-green.vercel.app)

---

## 📖 About the Project

**Fundr** is a next-generation decentralized crowdfunding platform designed to eliminate fraud, guarantee fund delivery, and provide unmatched transparency for charitable causes, startup ideas, and community projects.

By leveraging **Stellar's Soroban Smart Contracts**, Fundr ensures that backers' funds are held safely in a programmatic escrow and are only released to campaign creators if their funding goals are met. If a campaign fails to reach its goal by the deadline, backers can instantly withdraw their pledges, completely eliminating platform exit scams and traditional banking hold-ups.

### 🛡️ Impact, Security, and Transparency
*   **Trustless Escrow:** Funds are never held by an intermediary. They are secured directly within an on-chain smart contract.
*   **Guaranteed Refunds:** If a campaign misses its funding target, smart contract logic guarantees that backers can easily retrieve their XLM. No manual processing or chargebacks required.
*   **Immutable Goal Enforcement:** Campaign creators cannot alter their funding targets or deadlines once the campaign is deployed on-chain.
*   **KYC Identity Verification:** Creators undergo strict admin-approved KYC (Know Your Customer) reviews before they are permitted to deploy campaigns, protecting the platform from anonymous bad actors.
*   **Platform Sustainability:** A built-in 5% maintenance fee is automatically and transparently routed to the platform administrators during a successful withdrawal, aligning platform success with creator success.

---

## 📸 Screenshots

### Web Screens

#### Landing & Public Pages
<img src="./assets/landing.png" alt="Landing Page Web" width="800" />

#### Backer / Funder Experience
<img src="./assets/active campaign.png" alt="Active Campaign Details" width="800" />
<img src="./assets/funder/fund-web.png" alt="Fund Form Web" width="800" />
<img src="./assets/funder/fund sucess.png" alt="Funding Success" width="800" />

#### Creator Dashboard
<img src="./assets/creator/creator dashboard.png" alt="Creator Dashboard" width="800" />
<img src="./assets/creator/create-form.png" alt="Create Campaign Form" width="800" />
<img src="./assets/creator/manage campaign first.png" alt="Manage Campaigns" width="800" />
<img src="./assets/creator/manage campaign- withdrawl.png" alt="Campaign Withdrawal" width="800" />
<img src="./assets/creator/campaign performance.png" alt="Campaign Performance" width="800" />
<img src="./assets/creator/funraised-history.png" alt="Fundraised History" width="800" />
<img src="./assets/creator/profile-settings.png" alt="Profile Settings" width="800" />

#### Admin Panel
<img src="./assets/admin/admin's home.png" alt="Admin Home" width="800" />
<img src="./assets/admin/admin-kyc-review.png" alt="Admin KYC Review" width="800" />
<img src="./assets/admin/campaign moderation.png" alt="Admin Campaign Moderation" width="800" />

### Mobile Screens

<img src="./assets/landing-mob.png" alt="Landing Page Mobile" width="300" />
<img src="./assets/funder/fund-mob.png" alt="Fund Form Mobile" width="300" />

---

## 💻 Tech Stack

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 14 (App Router) | React framework for SSR and optimized routing |
| **Styling** | Tailwind CSS & Vanilla CSS | Modern, responsive, and highly-customizable UI |
| **Backend & Auth** | Supabase | PostgreSQL database, Auth, RLS Policies, and Storage |
| **Smart Contracts** | Rust (Soroban) | Writing secure, fast, and lightweight blockchain logic |
| **Blockchain Integration** | `@stellar/stellar-sdk` & Freighter | Interacting with Horizon/Soroban RPC and signing transactions |
| **Deployment** | Vercel | Global edge network hosting for the frontend application |

---

## 🔗 Smart Contracts Deployed (Stellar Testnet)

The platform utilizes a Factory pattern to dynamically spawn isolated escrow contracts for each campaign.

| Contract Name | Contract ID (Testnet) | Verification Link |
| :--- | :--- | :--- |
| **Crowdfund Factory** | `CBCEVQXYDJXFW6PLP4BDHXBDSR7HPU6YBV6LPSGNKLLX2BKUV35PYTMU` | [Verify on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CBCEVQXYDJXFW6PLP4BDHXBDSR7HPU6YBV6LPSGNKLLX2BKUV35PYTMU) |
| **Campaign Template** (Sample) | `CCJLG4SZUMZGZLOMVWFCPSB4BIPH6A2ZJBGFDEV6VABDWCNXWXNH37A7` | [Verify on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CCJLG4SZUMZGZLOMVWFCPSB4BIPH6A2ZJBGFDEV6VABDWCNXWXNH37A7) |

*You can verify these addresses on [Stellar Expert Testnet](https://stellar.expert/explorer/testnet).*

---

## 📂 Clean File Architecture

```text
Fundr/
├── app/                      # Next.js App Router Pages
│   ├── (auth)/               # Login, Register, Forgot Password
│   ├── (protected)/          # Admin Dashboard, Creator Dashboard, KYC, Manage Campaigns
│   ├── campaigns/            # Public Campaign display pages
│   └── globals.css           # Global Tailwind and Design System Tokens
├── components/               # Reusable React Components
│   ├── admin/                # Admin specific tables and controls
│   ├── campaigns/            # Campaign cards, withdrawal buttons
│   ├── dashboard/            # Stat cards and dashboard tables
│   ├── fund/                 # Interactive funding forms
│   ├── layout/               # Navbars, Footers, and Protected Sidebars
│   └── ui/                   # Reusable base UI (Buttons, Tooltips, Verification tags)
├── contracts/                # Rust Smart Contracts
│   ├── campaign/             # Escrow and logic for individual campaigns
│   └── crowdfund-factory/    # Factory for dynamic campaign deployment
├── hooks/                    # Custom React Hooks
│   └── useSorobanIntegration.ts # Modularized Freighter and smart contract integration logic
├── lib/                      # Utilities and Integrations
│   └── stellar/              # Soroban SDK, Freighter wallet, and RPC wrappers
├── sql/                      # Supabase Database Migrations & RLS Policies
├── scripts/                  # Deployment & E2E Testing scripts
└── types/                    # TypeScript interfaces & Supabase DB Types
```

---

## 🔄 User Workflow & Architecture

### User Workflow
```mermaid
graph TD;
    A[Visitor] -->|Signs Up| B["Account Created"];
    B --> C{User Role};
    C -->|Backer| D["Browse Campaigns"];
    D --> E["Connect Freighter Wallet"];
    E --> F["Pledge XLM via Contract"];
    
    C -->|Creator| G["Submit KYC"];
    G --> H["Admin Reviews KYC"];
    H -->|Approved| I["Create Campaign Draft"];
    I --> J["Admin Publishes to Chain via Factory"];
    J --> K["Campaign is Live"];
    
    K --> L{Deadline Reached?};
    L -->|Goal Met| M["Creator Withdraws XLM (5% Fee)"];
    L -->|Goal Failed| N["Backers Refunded"];
```

### Smart Contract Architecture
```mermaid
graph LR;
    A["Web Client"] -->|Calls Factory| B["CrowdfundFactory Contract"];
    B -->|deploy_v2| C["Campaign Contract (Instance)"];
    A -->|"Calls pledge()"| C;
    A -->|"Calls withdraw()"| C;
    A -->|"Calls refund()"| C;
```

---

## ✨ Platform & Contract Features

| Layer | Feature | Description |
| :--- | :--- | :--- |
| **Frontend** | **Multi-Role Dashboards** | Distinct, secure routing and UI for Backers, Creators, and Admins. |
| **Frontend** | **Real-time Metrics** | Aggregates on-chain contributions and displays dynamic progress bars. |
| **Frontend** | **Modular Hooks** | Extracted Stellar and Freighter integrations into highly reusable React hooks (e.g. `useSorobanIntegration`). |
| **Backend** | **Admin KYC & Moderation** | Immutable KYC application flow with admin approval gates. |
| **Backend** | **Row Level Security (RLS)** | Strict PostgreSQL policies ensuring users can only modify their own data. |
| **Contract** | **Factory Deployment** | Uses `deploy_v2` to spawn isolated contract state for every single campaign. |
| **Contract** | **Trustless Escrow** | Smart contract securely holds XLM without central authority intervention. |
| **Contract** | **Conditional Withdrawals** | Creators can only withdraw if `pledged >= goal` and the deadline has passed. |
| **Contract** | **Platform Fee Routing** | Hardcoded 5% network maintenance fee sent to the admin wallet on withdrawal. |

---

## 🚨 Error Handling

| Scenario | Handled By | User Feedback |
| :--- | :--- | :--- |
| **Wallet Not Installed** | Frontend Guard | "Freighter is not installed. Please install the extension." |
| **User rejects transaction** | Wallet Provider | Graceful catch displaying "Transaction rejected by user." |
| **Funding an expired campaign** | Smart Contract | Contract panics: `"campaign closed"`, bubbled up to UI. |
| **Withdrawing before deadline** | Smart Contract | Contract panics: `"campaign still active"`. |
| **Withdrawing below goal** | Smart Contract | Contract panics: `"goal not met, cannot withdraw"`. |
| **Invalid form inputs** | Server Actions / Zod | Inline red text displaying exact validation errors. |

---

## 🧪 Test Results & Evidence

The platform's critical functionality is thoroughly tested via automated Node E2E scripts and Rust contract unit tests.

### Smart Contract Test Verification
![Contract Tests](./assets/contracts-test.png)
![Contract Tests 2](./assets/contracts-test2.png)

### Frontend E2E Route Verification
![E2E Tests](./assets/e2e%20test.png)

---

## ✅ Submission Verification Checklist

| Level | Criteria | Status |
| :--- | :--- | :---: |
| **Level 1** | Wallet connect / disconnect | ✅ |
| **Level 1** | Balance display | ✅ |
| **Level 1** | Send XLM transaction | ✅ |
| **Level 1** | Transaction feedback | ✅ |
| **Level 1** | 3+ error types handled | ✅ |
| **Level 2** | Smart contracts deployed on Testnet | ✅ |
| **Level 2** | Contract calls working (Factory, Pledging, Withdrawal, Refund) | ✅ |
| **Level 2** | Multi-wallet support (Freighter) | ✅ |
| **Level 2** | Real-time on-chain status | ✅ |
| **Level 3** | Inter-contract calls (Factory → Campaign `deploy_v2`) | ✅ |
| **Level 3** | E2E route & contract tests passing | ✅ |
| **Level 3** | Mobile responsive | ✅ |
| **Level 3** | Application live on Vercel | ✅ |
| **Submission** | Complete README with architecture | ✅ |
| **Submission** | Contract addresses documented with Tx links | ✅ |
| **Submission** | Contracts test done and added | ✅ |

---

## 🛠️ Project Setup Guide

### 1. Database Setup
1. Create a project on [Supabase](https://supabase.com).
2. Navigate to the SQL Editor and run the complete schema script:
   ```bash
   cat sql/full_schema.sql | # Execute this entire file in the Supabase SQL editor
   ```

### 2. Smart Contract Deployment
To build and deploy the contracts locally to Testnet:
```bash
# Compile contracts
soroban contract build

# Run deployment script
node scripts/deploy-contracts.mjs
```
*Note: Make sure to update your `.env.local` with the new Contract IDs.*

### 3. Frontend Setup
1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```
2. Create a `.env.local` file based on `.env.example` and fill in your Supabase and Stellar credentials.
3. Start the development server:
   ```bash
   npm run dev
   ```

---

<p align="center">
  <b>Built with ❤️ for the Stellar Ecosystem.</b><br/>
  Thank you for reviewing the Fundr Project!
</p>
