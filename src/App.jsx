import { useState, useEffect } from "react";
import { ethers } from "ethers";
import "./App.css";
import Confetti from "react-confetti";

const contractAddress = "0x9fc930ab59428A2862EF9F4116FFd8129360fF04";

const contractABI = [
	{
		"inputs": [
			{
				"internalType": "string[]",
				"name": "candidateNames",
				"type": "string[]"
			},
			{
				"internalType": "uint256",
				"name": "durationInMinutes",
				"type": "uint256"
			}
		],
		"stateMutability": "nonpayable",
		"type": "constructor"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "voter",
				"type": "address"
			},
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "candidateIndex",
				"type": "uint256"
			}
		],
		"name": "VoteCast",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "address",
				"name": "voter",
				"type": "address"
			}
		],
		"name": "VoterRegistered",
		"type": "event"
	},
	{
		"anonymous": false,
		"inputs": [
			{
				"indexed": false,
				"internalType": "uint256",
				"name": "time",
				"type": "uint256"
			}
		],
		"name": "VotingEnded",
		"type": "event"
	},
	{
		"inputs": [],
		"name": "admin",
		"outputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "candidates",
		"outputs": [
			{
				"internalType": "string",
				"name": "name",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "voteCount",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "endTime",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getCandidatesCount",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "getWinner",
		"outputs": [
			{
				"internalType": "string",
				"name": "winnerName",
				"type": "string"
			},
			{
				"internalType": "uint256",
				"name": "winnerVotes",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "hasVoted",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "",
				"type": "address"
			}
		],
		"name": "isRegistered",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "address",
				"name": "_voter",
				"type": "address"
			}
		],
		"name": "registerVoter",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "startTime",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "candidateIndex",
				"type": "uint256"
			}
		],
		"name": "vote",
		"outputs": [],
		"stateMutability": "nonpayable",
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
      window.ethereum.on("chainChanged", () => window.location.reload());
    }
  }, []);

  async function checkNetwork() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const network = await provider.getNetwork();

    if (network.chainId !== 11155111) {
      setMessage("Please switch to Sepolia network!");

      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0xaa36a7" }],
        });
      } catch (error) {
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

      const correctNetwork = await checkNetwork();
      if (!correctNetwork) {
        setLoading(false);
        return;
      }

      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send("eth_requestAccounts", []);

      setAccount(accounts[0]);
      setMessage("Wallet connected!");

      await fetchCandidates();
      await fetchWinner();
    } catch (error) {
      console.error(error);
      setMessage("Connection failed!");
    } finally {
      setLoading(false);
    }
  }

  function getContract() {
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const signer = provider.getSigner();
    return new ethers.Contract(contractAddress, contractABI, signer);
  }

  async function register() {
    try {
      setLoading(true);
      setMessage("Registering...");

      const contract = getContract();
      const tx = await contract.registerVoter(account);
      await tx.wait();

      setMessage("Registered successfully!");
    } catch (error) {
      console.error(error);
      setMessage("Registration failed!");
    } finally {
      setLoading(false);
    }
  }

  async function vote(index) {
    try {
      setLoading(true);
      setMessage("Voting...");

      const contract = getContract();
      const tx = await contract.vote(index);
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
      const contract = getContract();
      const count = await contract.getCandidatesCount();

      let list = [];

      for (let i = 0; i < count; i++) {
        const c = await contract.candidates(i);
        list.push({
          name: c.name,
          votes: c.voteCount.toString(),
        });
      }

      setCandidates(list);
    } catch (error) {
      console.error(error);
    }
  }

  async function fetchWinner() {
    try {
      const contract = getContract();
      const w = await contract.getWinner();

      if (w.winnerName) {
        setWinner({
          name: w.winnerName,
          votes: w.winnerVotes.toString(),
        });
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
      }
    } catch (error) {
      console.error(error);
    }
  }

 
  return (
    <div className="app-container">
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
              <button className="vote-btn" onClick={() => vote(index)} disabled={!account || loading}>
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
