import { ethers } from 'ethers';
import { Indexer, ZgFile } from '@0glabs/0g-ts-sdk';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

// Cấu hình mạng
const config = {
  RPC_URL: 'https://evmrpc-testnet.0g.ai/',
  INDEXER_RPC: 'https://indexer-storage-testnet-turbo.0g.ai',
  PRIVATE_KEY: process.env.PRIVATE_KEY,
};

async function initStorage() {
  const provider = new ethers.JsonRpcProvider(config.RPC_URL);
  console.log("Provider: ", provider);
  const signer = new ethers.Wallet(config.PRIVATE_KEY as string, provider);
  console.log("Signer: ", signer);
  const indexer = new Indexer(config.INDEXER_RPC);
  console.log("Indexer: ", indexer);
  return { signer, indexer };
}

export async function uploadFile(filePath: string) {
  const { signer, indexer } = await initStorage();

  // Tạo ZgFile từ đường dẫn tệp
  const zgFile = await ZgFile.fromFilePath(filePath);
  console.log("ZgFile: ", zgFile);

  // Tạo Merkle Tree
  const [tree, treeErr] = await zgFile.merkleTree();
  if (treeErr) {
    throw new Error(`Failed to create Merkle Tree: ${treeErr}`);
  }
  console.log("Merkle Tree: ", tree);

  // Tải lên tệp
  console.log("Uploading file...");
  const [tx, uploadErr] = await indexer.upload(zgFile, config.RPC_URL, signer);
  console.log("Upload err: ", uploadErr);
  if (uploadErr) {
    try {
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error(`Failed to delete temp file ${filePath}:`, err);
    }

    throw new Error(`Upload failed: ${uploadErr}`);
  }
  console.log("Transaction: ", tx);

  // Lấy root hash và transaction hash
  const rootHash = tree?.rootHash();
  console.log("Root Hash: ", rootHash);
  await zgFile.close();

  // Xóa tệp tạm
  try {
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error(`Failed to delete temp file ${filePath}:`, err);
  }

  return { transactionHash: tx, rootHash };
}

export async function downloadFile(rootHash: string, outputPath: string) {
  const { indexer } = await initStorage();
  const downloadErr = await indexer.download(rootHash, outputPath, false);
  if (downloadErr) {
    throw new Error(`Download failed: ${downloadErr}`);
  }
  return { outputPath };
}
