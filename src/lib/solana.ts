import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
} from '@solana/web3.js';
import bs58 from 'bs58';

export type WalletProviderName = 'Phantom' | 'Solflare';

interface InjectedSolanaProvider {
  isPhantom?: boolean;
  isSolflare?: boolean;
  publicKey?: { toBase58(): string; toBytes(): Uint8Array };
  connect: (opts?: { onlyIfTrusted?: boolean }) => Promise<{ publicKey: { toBase58(): string } }>;
  disconnect: () => Promise<void>;
  signMessage: (message: Uint8Array, display?: string) => Promise<{ signature: Uint8Array } | Uint8Array>;
  signAndSendTransaction?: (tx: Transaction) => Promise<{ signature: string }>;
  signTransaction?: (tx: Transaction) => Promise<Transaction>;
}

declare global {
  interface Window {
    phantom?: { solana?: InjectedSolanaProvider };
    solflare?: InjectedSolanaProvider;
    solana?: InjectedSolanaProvider;
  }
}

export const DEVNET_RPC_URL = 'https://api.devnet.solana.com';

export function getWalletProvider(name: WalletProviderName): InjectedSolanaProvider | null {
  if (typeof window === 'undefined') return null;
  if (name === 'Phantom') {
    if (window.phantom?.solana?.isPhantom) return window.phantom.solana;
    if (window.solana?.isPhantom) return window.solana;
    return null;
  }
  if (name === 'Solflare') {
    if (window.solflare?.isSolflare) return window.solflare;
    return null;
  }
  return null;
}

export function detectInstalledWallets(): Record<WalletProviderName, boolean> {
  return {
    Phantom: Boolean(getWalletProvider('Phantom')),
    Solflare: Boolean(getWalletProvider('Solflare')),
  };
}

export async function connectExternalWallet(name: WalletProviderName): Promise<{
  pubkey: string;
  provider: WalletProviderName;
}> {
  const provider = getWalletProvider(name);
  if (!provider) {
    throw new Error(
      `${name} browser extension was not detected. Install ${name} and switch to Solana Devnet to connect your private wallet.`
    );
  }
  const resp = await provider.connect();
  const pubkey = resp?.publicKey?.toBase58?.() || provider.publicKey?.toBase58?.();
  if (!pubkey) {
    throw new Error(`${name} did not return a public key.`);
  }
  return { pubkey, provider: name };
}

export async function disconnectExternalWallet(name: WalletProviderName): Promise<void> {
  const provider = getWalletProvider(name);
  if (provider) {
    await provider.disconnect();
  }
}

export async function signOwnershipMessage(
  name: WalletProviderName,
  pubkey: string
): Promise<{ message: string; signatureBase58: string }> {
  const provider = getWalletProvider(name);
  if (!provider) {
    throw new Error(`${name} wallet is not connected.`);
  }
  const nonce = Math.random().toString(36).slice(2, 10);
  const message = `Veri-Fi Wallet Ownership Verification\nWallet: ${pubkey}\nCluster: Solana Devnet\nNonce: ${nonce}`;
  const encoded = new TextEncoder().encode(message);
  const signed = await provider.signMessage(encoded, 'utf8');
  const sigBytes = signed instanceof Uint8Array ? signed : signed.signature;
  return {
    message,
    signatureBase58: bs58.encode(sigBytes),
  };
}

export async function sendDevnetDepositTx(
  name: WalletProviderName,
  fromPubkeyStr: string,
  toTreasuryPubkeyStr: string,
  amountSol: number
): Promise<string> {
  const provider = getWalletProvider(name);
  if (!provider) {
    throw new Error(`${name} wallet extension is not connected.`);
  }
  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const fromPubkey = new PublicKey(fromPubkeyStr);
  const toPubkey = new PublicKey(toTreasuryPubkeyStr);
  const lamports = Math.round(amountSol * LAMPORTS_PER_SOL);

  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  const tx = new Transaction({
    recentBlockhash: blockhash,
    feePayer: fromPubkey,
  }).add(
    SystemProgram.transfer({
      fromPubkey,
      toPubkey,
      lamports,
    })
  );

  if (provider.signAndSendTransaction) {
    const res = await provider.signAndSendTransaction(tx);
    return res.signature;
  }
  if (provider.signTransaction) {
    const signedTx = await provider.signTransaction(tx);
    const serialized = await signedTx.serialize();
    return await connection.sendRawTransaction(serialized);
  }
  throw new Error(`${name} provider does not support transaction signing.`);
}

export function getExplorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=devnet`;
}

export function getExplorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=devnet`;
}

export function shortenAddress(addr?: string, chars = 4): string {
  if (!addr) return '';
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}
