# 🌍 Transparent Biodiversity Credit Trading Platform

Welcome to a decentralized platform for trading biodiversity credits on the Stacks blockchain! This project enables transparent, immutable tracking and trading of ecosystem restoration efforts, ensuring trust and accountability in global conservation markets.

## ✨ Features

🌱 **Credit Issuance**: Issue biodiversity credits for verified restoration or conservation projects.  
🔍 **Transparent Verification**: Verify project details and credit authenticity on-chain.  
💸 **Credit Trading**: Trade credits securely between parties with immutable records.  
📊 **Impact Tracking**: Track ecological impact metrics tied to credits.  
🚫 **Fraud Prevention**: Prevent double-spending or duplicate credit issuance.  
🌐 **Global Accessibility**: Enable international participation with standardized credit metadata.  
🔐 **Governance**: Allow community voting on platform policies and project approvals.

## 🛠 How It Works

### For Project Owners
1. Submit a restoration project with details (e.g., location, species, impact metrics).
2. Call `issue-credits` to mint biodiversity credits linked to a verified project.
3. Credits are tied to a unique project hash and stored on-chain.

### For Buyers/Traders
1. Browse available credits using `list-credits`.
2. Purchase credits via `trade-credits`, transferring ownership securely.
3. Verify credit authenticity and project details using `verify-credit`.

### For Verifiers
1. Use `get-project-details` to view project metadata (e.g., impact reports, location).
2. Confirm credit legitimacy with `verify-credit`.

### For Governance
1. Stakeholders with governance tokens can vote on platform rules or project approvals using `vote-on-proposal`.
2. Proposals are executed via `execute-proposal` if approved.

## 📜 Smart Contracts

The platform consists of 8 Clarity smart contracts, each handling specific functionality:

1. **CreditRegistry**: Manages issuance and tracking of biodiversity credits.
2. **ProjectRegistry**: Stores project details and links them to credits.
3. **CreditTrading**: Handles buying, selling, and transferring credits.
4. **Verification**: Enables verification of credit authenticity and project details.
5. **ImpactMetrics**: Tracks and updates ecological impact data for projects.
6. **Governance**: Manages community proposals and voting for platform policies.
7. **Token**: Implements a governance token for voting and incentives.
8. **Escrow**: Secures credit trades with temporary holds during transactions.

### Example Workflow
1. A conservation NGO submits a reforestation project with a unique hash, title, and metrics (e.g., 1000 trees planted, 10 species protected).
2. The `ProjectRegistry` contract stores the project and links it to credits issued by `CreditRegistry`.
3. A corporation buys credits via `CreditTrading`, with funds held in `Escrow` until the transfer is complete.
4. Verifiers check project details and credit authenticity using `Verification`.
5. The community proposes a new rule (e.g., higher verification standards) via `Governance`, and token holders vote.

## 🚀 Getting Started

### Prerequisites
- Stacks blockchain wallet (e.g., Hiro Wallet).
- Clarity development environment (e.g., Clarinet).
- Node.js and npm for local testing.

### Installation
1. Clone the repository:
   ```
   git clone https://github.com/your-repo/biodiversity-credit-trading.git
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Set up Clarinet for local development:
   ```
   clarinet integrate
   ```

### Deploying Contracts
1. Deploy contracts using Clarinet or the Stacks CLI.
2. Configure contract addresses in your frontend or backend.
3. Test contracts locally using Clarinet's devnet.

### Example Usage
- **Register a Project**:
  ```clarity
  (contract-call? .project-registry register-project "project-hash-123" "Amazon Reforestation" "1000 trees, 10 species" "Brazil")
  ```
- **Issue Credits**:
  ```clarity
  (contract-call? .credit-registry issue-credits "project-hash-123" u100)
  ```
- **Trade Credits**:
  ```clarity
  (contract-call? .credit-trading trade-credits "credit-id-001" tx-sender u50)
  ```

## 🧪 Testing
Run unit tests for all contracts:
```
clarinet test
```

## 🌟 Why This Matters
This platform solves real-world problems by:
- **Preventing Greenwashing**: Immutable records ensure credits represent real ecological impact.
- **Enabling Global Participation**: Decentralized access allows small-scale projects to compete internationally.
- **Ensuring Trust**: On-chain verification builds confidence for buyers and regulators.
- **Promoting Accountability**: Governance ensures community-driven standards and transparency.

## 📚 Future Enhancements
- Integration with off-chain oracles for real-time environmental data.
- Support for fractional credit trading.
- API for third-party integrations with carbon markets.

## 🤝 Contributing
We welcome contributions! Fork the repo, submit pull requests, or open issues for bugs and feature requests.

## 📬 Contact
For questions, reach out on the Stacks Discord or open an issue in the repository.