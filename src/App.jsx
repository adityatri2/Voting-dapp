import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";
import Confetti from "react-confetti";

const contractAddress = "0x9fc930ab59428A2862EF9F4116FFd8129360fF04";
const contractABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_voter", "type": "address" }
    ],
    "name": "registerVoter",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string[]", "name": "candidateNames", "type": "string[]" },
      { "internalType": "uint256", "name": "durationInMinutes", "type": "uint256" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "candidateIndex", "type": "uint256" }],
    "name": "vote",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [], "name": "getCandidatesCount",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [], "name": "getWinner",
    "outputs": [
      { "internalType": "string", "name": "winnerName", "type": "string" },
      { "internalType": "uint256", "name": "winnerVotes", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "isRegistered",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "", "type": "address" }],
    "name": "hasVoted",
    "outputs": [{ "internalType": "bool", "name": "", "type": "bool" }],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "name": "candidates",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "uint256", "name": "voteCount", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];

function App() {
  const [account, setAccount] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [winner, setWinner] = useState(null);
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (window.ethereum) {
      const handleChainChange = () => window.location.reload();
      window.ethereum.on("chainChanged", handleChainChange);
      return () => window.ethereum.removeListener("chainChanged", handleChainChange);
    }
  }, []);

  useEffect(() => {
    // Auto fetch every 5 seconds
    const interval = setInterval(() => {
      if (account) {
        fetchCandidates();
        fetchWinner();
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [account]);

  async function checkNetwork() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const network = await provider.getNetwork();
    if (network.chainId !== 11155111n) {
      setMessage("Please switch to Sepolia network!");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }]
        });
        setMessage("Switched to Sepolia!");
      } catch (error) {
        console.error(error);
        setMessage("Network switch failed!");
        return false;
      }
      return false;
    }
    return true;
  }

  async function connectWallet() {
    if (!window.ethereum) {
      setMessage("MetaMask not detected!");
      return;
    }
    try {
      setLoading(true);
      setMessage("Checking network...");
      const correctNetwork = await checkNetwork();
      if (!correctNetwork) {
        setLoading(false);
        return;
      }
      setMessage("Connecting wallet...");
      const provider = new ethers.BrowserProvider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);
      setAccount(accounts[0]);
      setMessage("Wallet connected successfully!");
      await fetchCandidates();
      await fetchWinner();
    } catch (error) {
      console.error(error);
      setMessage("Wallet connection failed!");
    } finally {
      setLoading(false);
    }
  }

  async function getContract() {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return new ethers.Contract(contractAddress, contractABI, signer);
  }

  async function register() {
    try {
      setLoading(true);
      setMessage("Registering voter...");
      const contract = await getContract();
      const alreadyRegistered = await contract.isRegistered(account);
      if (alreadyRegistered) {
        setMessage("You are already registered!");
        setLoading(false);
        return;
      }
      const tx = await contract.registerVoter(account);
      await tx.wait();
      setMessage("Registered successfully!");
      await fetchCandidates();
      await fetchWinner();
    } catch (error) {
      console.error("Registration error:", error);
      setMessage("Transaction failed!");
    } finally {
      setLoading(false);
    }
  }

  async function vote(candidateIndex) {
    try {
      setLoading(true);
      setMessage("Submitting vote...");
      const contract = await getContract();
      const tx = await contract.vote(candidateIndex);
      await tx.wait();
      setMessage("Vote successful!");
      await fetchCandidates();
      await fetchWinner();
    } catch (error) {
      console.error(error);
      setMessage("Vote failed!");
    } finally {
      setLoading(false);
    }
  }

  async function fetchCandidates() {
    try {
      const contract = await getContract();
      const count = await contract.getCandidatesCount();
      const list = [];
      for (let i = 0n; i < count; i++) {
        const c = await contract.candidates(i);
        list.push({ name: c.name, votes: c.voteCount });
      }
      setCandidates(list);
    } catch (error) {
      console.error("Fetching candidates error:", error);
    }
  }

  async function fetchWinner() {
    try {
      const contract = await getContract();
      const w = await contract.getWinner();
      if (w.winnerName) {
        setWinner({ name: w.winnerName, votes: w.winnerVotes });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000); // show 5s
      } else {
        setWinner(null);
      }
    } catch (error) {
      console.error("Fetching winner error:", error);
    }
  }

  return (
    <div className="app-container">
      {showConfetti && <Confetti />}
      <h1>Voting DApp</h1>

      <button className="main-btn" onClick={connectWallet} disabled={loading}>
        {loading ? "Processing..." : "Connect Wallet"}
      </button>

      <button className="main-btn" onClick={register} disabled={!account || loading}>
        Register
      </button>

      <h2>Candidates</h2>
      <div className="candidates-row">
        {candidates.length === 0 ? (
          <p>No candidates found.</p>
        ) : (
          candidates.map((c, index) => (
            <div key={index} className="candidate-card">
              <strong>{c.name}</strong>
              <p>Votes: {c.votes.toString()}</p>
              <button
                className="vote-btn"
                onClick={() => vote(index)}
                disabled={!account || loading}
              >
                Vote
              </button>
            </div>
          ))
        )}
      </div>

      {winner && (
        <div className="winner-card">
          Winner: <strong>{winner.name}</strong> — {winner.votes.toString()} votes
        </div>
      )}

      <p className="message">{message}</p>
      <p>Connected Account: {account}</p>
    </div>
  );
}

export default App;
