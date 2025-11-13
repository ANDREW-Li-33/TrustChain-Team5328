
import { ethers } from 'ethers';

const ALCHEMY_URL = "https://eth-sepolia.g.alchemy.com/v2/vmvQIStbmCTqoiMfmATjF";

const provider = new ethers.JsonRpcProvider(ALCHEMY_URL);

const PRIVATE_KEY = "6b875e82eef60af6710a35105ee18dbaf808347d8b48913476acfbe9b17124f0";
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

export async function recordTokenOnChain(tokenHash: string): Promise<string | null> {
  try {
    const tx = await wallet.sendTransaction({
      to: wallet.address,
      value: 0,
      data: ethers.hexlify(ethers.toUtf8Bytes(tokenHash)),
    });

    console.log("Blockchain TX sent:", tx.hash);
    await tx.wait();
    console.log("Transaction confirmed!");

    return tx.hash;
  } catch (err) {
    console.error("Error recording token on chain:", err);
    return null;
  }
}

