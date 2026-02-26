"use client";
import { useState, useEffect } from "react";
import { ethers } from "ethers";

const CONTRACT_ADDRESS = "0x8e6b0c11e3c98fcf40001269759083cf0d3ccbfb"; 

// Added the lastWinningNumbers function to the ABI so we can read it!
const abi = [
  "function buyTicket(uint8[7] memory _numbers) external payable",
  "function lastWinningNumbers(uint256) view returns (uint8)"
];

export default function Home() {
  const [account, setAccount] = useState(null);
  const [ticketNumbers, setTicketNumbers] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const [timeLeft, setTimeLeft] = useState(null);
  const [jackpot, setJackpot] = useState("0.00");
  const [lastWinners, setLastWinners] = useState([]);

  // 1. SYNC WITH EXPRESS SERVER (For Timer)
  useEffect(() => {
    const fetchServerStatus = async () => {
      try {
        const response = await fetch("http://localhost:5000/api/status");
        const data = await response.json();
        setTimeLeft(data.timeLeft);
      } catch (error) { console.error("❌ Could not connect:", error); }
    };
    fetchServerStatus();
    const syncInterval = setInterval(fetchServerStatus, 5000);
    return () => clearInterval(syncInterval);
  }, []);

  // 2. FETCH BLOCKCHAIN DATA (Jackpot & Winning Numbers)
  const fetchBlockchainData = async () => {
    try {
      const provider = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, provider);

      // Get the Jackpot (Contract Balance)
      const balance = await provider.getBalance(CONTRACT_ADDRESS);
      setJackpot(ethers.formatEther(balance));

      // Get the last 7 winning numbers
      let nums = [];
      for(let i = 0; i < 7; i++) {
        try {
          const num = await contract.lastWinningNumbers(i);
          if (num > 0) nums.push(num.toString());
        } catch (e) { break; } // Stops if it fails
      }
      if (nums.length === 7) setLastWinners(nums);

    } catch (error) { console.error("Blockchain fetch error:", error); }
  };

  useEffect(() => {
    fetchBlockchainData();
    // Refresh blockchain data every 15 seconds
    const bcInterval = setInterval(fetchBlockchainData, 15000);
    return () => clearInterval(bcInterval);
  }, []);

  // 3. SMOOTH LOCAL COUNTDOWN
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;
    const tick = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(tick);
  }, [timeLeft]);

  const formatTime = (seconds) => {
    if (seconds === null) return "LOADING...";
    if (seconds <= 0) return "🎉 DRAWING! 🎉";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h}h ${m}m ${s}s`;
  };

  const connectWallet = async () => {
    if (window.ethereum) {
      try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        setAccount(await signer.getAddress());
      } catch (error) { console.error("Connection failed", error); }
    } else { alert("Please install MetaMask!"); }
  };

  const buyTicket = async () => {
    if (!account) return alert("Connect your wallet first!");
    const numbersArray = ticketNumbers.split(",").map((n) => parseInt(n.trim()));
    if (numbersArray.length !== 7) return alert("You must pick exactly 7 numbers!");

    try {
      setIsLoading(true);
      setStatus("🎲 Asking MetaMask...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(CONTRACT_ADDRESS, abi, signer);
      const tx = await contract.buyTicket(numbersArray, { value: ethers.parseEther("0.01") });
      setStatus(`⏳ Waiting for network...`);
      await tx.wait(); 
      setStatus("✨ TICKET PURCHASED! ✨");
      setTicketNumbers("");
      fetchBlockchainData(); // Refresh jackpot immediately!
    } catch (error) {
      console.error(error);
      setStatus("❌ Error: " + (error.reason || error.message));
    } finally { setIsLoading(false); }
  };

  return (
    // LOCKED SCREEN: h-screen, w-screen, overflow-hidden, justify-evenly
    <main className="h-screen w-screen overflow-hidden bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow-300 via-orange-400 to-red-500 flex flex-col items-center justify-evenly p-2 md:p-4 font-sans relative">
      
      {/* Decorative Confetti */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-20">
          <div className="absolute top-10 left-10 w-4 h-4 bg-red-500 rounded-full animate-bounce"></div>
          <div className="absolute top-1/4 right-10 w-6 h-6 bg-blue-500 rounded-full animate-ping"></div>
          <div className="absolute bottom-20 left-1/4 w-5 h-5 bg-green-500 rounded-full animate-pulse"></div>
      </div>

      {/* 🎪 HEADER */}
      <div className="text-center drop-shadow-[0_5px_5px_rgba(0,0,0,0.5)] z-10 relative transform rotate-[-2deg]">
        <h1 className="text-6xl md:text-8xl lg:text-9xl font-black text-yellow-300 tracking-tighter" 
            style={{ textShadow: "4px 4px 0 #ff0000, -2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000" }}>
          WOZA WOZA
        </h1>
        <div className="bg-red-600 text-white font-black px-4 py-1 text-sm md:text-xl lg:text-2xl uppercase tracking-widest border-2 md:border-4 border-yellow-400 shadow-lg inline-block transform rotate-[3deg] mt-1">
          YOUR WEB3 RUNNING ON WEB2
        </div>
      </div>

      {/* 💰 JUMBO BILLBOARD (Jackpot + Timer) */}
      <div className="relative z-10 transform hover:scale-105 transition duration-300">
        <div className="absolute -inset-2 bg-gradient-to-r from-yellow-400 via-red-500 to-blue-500 rounded-3xl blur-md opacity-75 animate-pulse"></div>
        <div className="relative bg-white border-[6px] md:border-[8px] border-yellow-500 rounded-3xl p-3 md:p-5 shadow-[0_10px_20px_rgba(0,0,0,0.3)] text-center w-[90vw] max-w-sm md:max-w-md flex flex-col justify-center items-center">
          
          {/* Jackpot Section */}
          <h3 className="text-red-600 text-xs md:text-sm font-black uppercase tracking-widest mb-0">
            🤑 CURRENT JACKPOT 🤑
          </h3>
          <p className="text-4xl md:text-6xl font-black leading-none text-green-500 mt-1 drop-shadow-sm">
            {jackpot} <span className="text-xl md:text-3xl text-green-700">ETH</span>
          </p>
          
          <hr className="w-full my-2 md:my-3 border-2 border-dashed border-gray-300" />
          
          {/* Timer Section */}
          <h3 className="text-blue-800 text-xs md:text-sm font-black uppercase tracking-widest mb-0">
            ⏳ NEXT DRAW IN
          </h3>
          <p className="text-3xl md:text-4xl font-black leading-none text-blue-900 mt-1">
            {formatTime(timeLeft)}
          </p>
        </div>
      </div>

      {/* 🎟️ THE GAME BOOTH */}
      <div className="relative z-10 w-full max-w-xl bg-yellow-100 border-[8px] md:border-[10px] border-red-500 border-dashed text-black rounded-3xl p-4 md:p-6 shadow-[0_15px_30px_rgba(0,0,0,0.5)] flex flex-col justify-center">
        
        {/* Decorative Lights */}
        <div className="absolute -top-3 md:-top-4 left-1/2 transform -translate-x-1/2 flex space-x-3">
            <div className="w-4 h-4 md:w-6 md:h-6 bg-yellow-300 rounded-full border-2 border-yellow-600 shadow-lg animate-pulse"></div>
            <div className="w-4 h-4 md:w-6 md:h-6 bg-red-400 rounded-full border-2 border-red-600 shadow-lg animate-pulse delay-75"></div>
            <div className="w-4 h-4 md:w-6 md:h-6 bg-blue-300 rounded-full border-2 border-blue-600 shadow-lg animate-pulse delay-150"></div>
        </div>

        {/* Top Bar: Connect Wallet */}
        <div className="flex flex-row justify-between items-center mb-2 md:mb-4">
          <h2 className="text-xl md:text-3xl font-black text-red-600 drop-shadow-md whitespace-nowrap" style={{ textShadow: "1px 1px 0 #fff" }}>
            STEP RIGHT UP!
          </h2>
          {!account ? (
            <button onClick={connectWallet} className="bg-gradient-to-b from-blue-400 to-blue-600 text-white font-black py-2 px-3 md:px-4 rounded-full border-2 border-blue-800 hover:from-blue-500 hover:to-blue-700 transition shadow-lg hover:-translate-y-1 uppercase text-[10px] md:text-sm whitespace-nowrap ml-2">
              🎟️ Connect Wallet
            </button>
          ) : (
            <span className="bg-yellow-300 text-red-800 text-[10px] md:text-sm font-black px-2 py-1 md:px-4 md:py-2 rounded-full border-2 border-red-500 shadow-inner whitespace-nowrap ml-2">
              👤 {account.slice(0,5)}...{account.slice(-4)}
            </span>
          )}
        </div>

        {/* 🔴 LAST WINNING NUMBERS */}
        <div className="mb-3 text-center bg-white/50 p-2 rounded-xl border-2 border-yellow-300">
          <span className="text-[10px] md:text-xs font-black text-red-800 uppercase tracking-wider block mb-1">Previous Winning Balls:</span>
          <div className="flex justify-center gap-1 md:gap-2">
            {lastWinners.length > 0 ? lastWinners.map((num, i) => (
               <div key={i} className="w-6 h-6 md:w-8 md:h-8 flex items-center justify-center bg-red-600 text-white font-black rounded-full border-2 border-yellow-400 shadow-md text-xs md:text-sm">
                 {num}
               </div>
            )) : <span className="text-xs text-gray-500 italic font-bold">Waiting for first draw...</span>}
          </div>
        </div>

        {/* Input Box */}
        <div className="mb-1 md:mb-2 text-center text-xs md:text-sm font-bold text-red-800 uppercase">Pick Your Lucky 7 Numbers (1-49)</div>
        <input 
          type="text" 
          placeholder="e.g. 3, 9, 15, 22, 31, 40, 49"
          className="w-full p-2 md:p-3 mb-3 font-black text-lg md:text-2xl rounded-xl border-4 md:border-6 border-yellow-400 focus:border-red-500 outline-none text-center bg-white shadow-inner text-blue-900"
          value={ticketNumbers}
          onChange={(e) => setTicketNumbers(e.target.value)}
        />
        
        {/* Buy Button */}
        <button 
          onClick={buyTicket}
          disabled={isLoading || !account}
          className={`w-full font-black text-lg md:text-xl py-2 md:py-4 rounded-xl border-b-4 md:border-b-8 transition-all transform shadow-xl uppercase ${
            isLoading || !account 
              ? "bg-gray-400 border-gray-600 text-gray-200 cursor-not-allowed" 
              : "bg-gradient-to-b from-red-500 to-red-700 border-red-900 text-yellow-100 hover:from-red-600 hover:to-red-800 hover:-translate-y-1 active:translate-y-1 active:border-b-0"
          }`}
        >
          {isLoading ? "🎡 SPINNING..." : "👉 BUY TICKET 👈"}
        </button>

        {status && <p className="mt-2 text-center text-xs md:text-sm font-black text-white bg-red-500 border-2 border-yellow-400 p-1 md:p-2 rounded-lg shadow-lg animate-bounce">{status}</p>}
      </div>
    </main>
  );
}