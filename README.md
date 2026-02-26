# 🎡 Woza Woza: Your Web3 Running on Web2

Welcome to **Woza Woza**! This is a fully automated, decentralized sequential lottery built on the Ethereum Sepolia Testnet.

If you've ever wondered how to bridge the gap between traditional backend servers (Node.js) and decentralized smart contracts (Solidity), you're in the right place.

## 🏗️ The Hybrid Architecture

Most decentralized apps (dApps) rely heavily on third-party oracle networks (like Chainlink Automation) to trigger time-based events. I wanted to take a different approach and build a **Hybrid Web2/Web3 architecture**:

* **The Brains (Smart Contract):** Written in Solidity. It securely holds the prize pool, validates tickets, requests random numbers from Chainlink VRF, and automatically distributes payouts based on sequential matches.
* **The Heartbeat (Node.js/Express):** Instead of paying an Oracle network to watch the clock, I built a custom Node.js backend. It runs a continuous loop, calculating the exact time remaining. When the countdown hits zero, this server uses a private key to automatically sign and execute the `performUpkeep` transaction on the blockchain. 
* **The Face (Next.js/React):** A locked-screen, fully responsive frontend that seamlessly polls the Node backend for the live timer and reads the blockchain for the live jackpot and previous winning numbers. No manual refresh buttons. No scrolling. Just pure UI.

## 🛠️ Tech Stack

* **Frontend:** Next.js, React, Tailwind CSS, Ethers.js (v6)
* **Backend:** Node.js, Express, CORS
* **Blockchain:** Solidity, Hardhat, Chainlink VRF (Randomness)
* **Network:** Ethereum Sepolia Testnet

## 🚀 How it Works

1.  Players connect their MetaMask wallets (Sepolia network).
2.  They pick 7 lucky numbers (1-49) and pay `0.01 ETH` for a ticket.
3.  The custom Node.js server counts down to the draw time.
4.  At zero, the server automatically triggers the smart contract.
5.  The contract requests 7 cryptographically secure random numbers from Chainlink VRF.
6.  Prizes are mathematically distributed based on consecutive matches (from left to right).
7.  The timer resets, and the next round begins!

## 💡 Running it Locally

If you want to spin this up on your own machine:

1. Clone the repo: `git clone https://github.com/YOUR_USERNAME/zonke-bonke-hybrid.git`
2. Open two terminal windows.
3. **Terminal 1 (Backend):** * `cd express_server`
   * Create a `.env` file with `PRIVATE_KEY` and `SEPOLIA_RPC_URL`
   * `npm install`
   * `node server.js`
4. **Terminal 2 (Frontend):** * `cd frontend`
   * `npm install`
   * `npm run dev`
5. Open `http://localhost:3000` and step right up!
