import express from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

const app = express();
app.use(cors());

// --- CONFIGURATION ---
const PORT = process.env.PORT || 5000;
const CONTRACT_ADDRESS = "0x8e6b0c11e3c98fcf40001269759083cf0d3ccbfb"; 

// We only need the ABI for the timer and the trigger functions
const abi = [
  "function lastDrawTimestamp() view returns (uint256)",
  "function interval() view returns (uint256)",
  "function performUpkeep(bytes calldata)",
  "function checkUpkeep(bytes calldata) view returns (bool, bytes)"
];

// Connect to the blockchain using your Private Key!
const provider = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, wallet);

// ==========================================
// 1. THE API (For your Next.js Frontend)
// ==========================================
app.get('/api/status', async (req, res) => {
    try {
        const lastDraw = await contract.lastDrawTimestamp();
        const interval = await contract.interval();
        const now = Math.floor(Date.now() / 1000);
        
        const timePassed = now - Number(lastDraw);
        const timeLeft = Number(interval) - timePassed;

        // Send the live countdown data to the frontend
        res.json({ 
            timeLeft: timeLeft > 0 ? timeLeft : 0,
            isDrawing: timeLeft <= 0
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// 2. THE AUTOMATION ROBOT (setInterval)
// ==========================================
// This loop runs every 60 seconds to check if it's time to draw
setInterval(async () => {
    console.log("🤖 Checking if it's time to draw...");
    try {
        // We use your contract's built-in checker!
        const [upkeepNeeded] = await contract.checkUpkeep("0x");
        
        if (upkeepNeeded) {
            console.log("⏰ TIME IS UP! Server is pulling the trigger...");
            
            // The server uses your private key to execute the draw
            const tx = await contract.performUpkeep("0x");
            console.log("🚀 Transaction sent! Hash:", tx.hash);
            
            await tx.wait();
            console.log("✅ Draw triggered successfully! Timer reset.");
        } else {
            console.log("⏳ Not time yet, or no tickets sold.");
        }
    } catch (error) {
        console.error("❌ Error checking/triggering upkeep:", error.message);
    }
}, 60000); // 60,000 milliseconds = 1 minute

// Start the server
app.listen(PORT, () => {
    console.log(`🎯 Zonke Bonke Express Server running on http://localhost:${PORT}`);
});