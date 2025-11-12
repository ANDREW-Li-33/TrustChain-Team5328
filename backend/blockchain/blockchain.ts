// /utils/blockchain.ts
import { ethers } from 'ethers';

// 1. Use your Alchemy Sepolia URL
const ALCHEMY_URL = "https://eth-sepolia.g.alchemy.com/v2/vmvQIStbmCTqoiMfmATjF";

// 2. Connect to Ethereum through Alchemy
const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);

// 3. Use a test wallet to sign transactions (for testing only!)
const PRIVATE_KEY = "6b875e82eef60af6710a35105ee18dbaf808347d8b48913476acfbe9b17124f0";
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

// 4. Store token hash on chain
export async function recordTokenOnChain(tokenHash: string): Promise<string | null> {
  try {
    const tx = await wallet.sendTransaction({
      to: wallet.address, // send to yourself (no actual money movement)
      value: 0, // 0 ETH
      data: ethers.hexlify(ethers.toUtf8Bytes(tokenHash)), // embed the token hash
    });

    console.log("Blockchain TX sent:", tx.hash);
    await tx.wait();
    console.log("Transaction confirmed!");

    return tx.hash; // you can store this in Supabase
  } catch (err) {
    console.error("Error recording token on chain:", err);
    return null;
  }
}

