import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  ExternalLink,
  Send,
  ShieldCheck,
  Wallet,
} from 'lucide-react';
import { useVeriFi } from '../lib/store';
import {
  detectInstalledWallets,
  getExplorerTxUrl,
  sendDevnetDepositTx,
  shortenAddress,
} from '../lib/solana';
import { calculateWithdrawalBreakdown, formatSnakeLabel, formatSol } from '../utils/escrowLogic';

export function WalletView() {
  const {
    currentUser,
    wallet,
    ledger,
    users,
    devnetInfo,
    appFeeBps,
    connectPrivateWallet,
    disconnectPrivateWallet,
    verifyPrivateWalletOwnership,
    verifyDevnetDeposit,
    requestWithdrawal,
    sendInternalTransfer,
    pushToast,
  } = useVeriFi();

  const [actionTab, setActionTab] = useState<'deposit' | 'withdraw' | 'send' | 'receive'>('deposit');
  const [depositSol, setDepositSol] = useState('0.5');
  const [depositSig, setDepositSig] = useState('');
  const [withdrawSol, setWithdrawSol] = useState('1.0');
  const [withdrawDest, setWithdrawDest] = useState(currentUser.connectedSolanaPubkey || '');
  const [transferRecipient, setTransferRecipient] = useState('');
  const [transferSol, setTransferSol] = useState('0.25');
  const [transferNote, setTransferNote] = useState('');
  const [busy, setBusy] = useState(false);

  const detectedWallets = detectInstalledWallets();
  const totalLamports = wallet.availableLamports + wallet.lockedLamports + wallet.pendingLamports;

  let withdrawPreview: ReturnType<typeof calculateWithdrawalBreakdown> | null = null;
  try {
    const val = Number(withdrawSol);
    if (Number.isFinite(val) && val > 0) {
      withdrawPreview = calculateWithdrawalBreakdown(val, appFeeBps);
    }
  } catch {
    withdrawPreview = null;
  }

  const handleWalletDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser.connectedSolanaPubkey || !currentUser.walletProvider) {
      pushToast('error', 'Connect Phantom or Solflare first');
      return;
    }
    const amt = Number(depositSol);
    if (!Number.isFinite(amt) || amt <= 0) {
      pushToast('error', 'Enter a positive SOL amount');
      return;
    }
    setBusy(true);
    try {
      const sig = await sendDevnetDepositTx(
        currentUser.walletProvider,
        currentUser.connectedSolanaPubkey,
        devnetInfo.treasuryPubkey,
        amt
      );
      setDepositSig(sig);
      await verifyDevnetDeposit(sig, amt);
    } catch (err) {
      pushToast('error', 'Deposit transaction not sent', err instanceof Error ? err.message : 'Cancelled');
    } finally {
      setBusy(false);
    }
  };

  const handleVerifyExistingSig = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    await verifyDevnetDeposit(depositSig, Number(depositSol));
    setBusy(false);
  };

  const handleWithdraw = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await requestWithdrawal(
      Number(withdrawSol),
      withdrawDest || currentUser.connectedSolanaPubkey || ''
    );
    setBusy(false);
    if (ok) setWithdrawSol('1.0');
  };

  const handleSendTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const ok = await sendInternalTransfer(transferRecipient, Number(transferSol), transferNote);
    setBusy(false);
    if (ok) {
      setTransferNote('');
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">Two-Wallet Financial Center</h1>
        <p className="text-xs text-slate-400 mt-1">
          Veri-Fi strictly separates your in-app App Wallet ledger from your self-custody Private Solana Wallet.
        </p>
      </div>

      {/* Side-by-Side System A & System B */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* SYSTEM A: VERI-FI APP WALLET */}
        <section
          aria-label="Veri-Fi App Wallet"
          className="lg:col-span-7 rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-6"
        >
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs text-violet-300 font-semibold">System A · In-App Ledger Account</p>
              <h2 className="text-xl font-bold text-white mt-0.5">Veri-Fi App Wallet</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono-tabular">
              Solana {devnetInfo.cluster.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
            <div>
              <p className="text-xs text-slate-400">Total Balance</p>
              <p className="text-lg font-bold text-white font-mono-tabular mt-0.5">
                {formatSol(totalLamports, 4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Available</p>
              <p className="text-lg font-bold text-emerald-300 font-mono-tabular mt-0.5">
                {formatSol(wallet.availableLamports, 4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Locked Escrow</p>
              <p className="text-lg font-bold text-violet-300 font-mono-tabular mt-0.5">
                {formatSol(wallet.lockedLamports, 4)}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Pending</p>
              <p className="text-lg font-bold text-amber-300 font-mono-tabular mt-0.5">
                {formatSol(wallet.pendingLamports, 4)}
              </p>
            </div>
          </div>

          {/* Action Tabs */}
          <div className="flex flex-wrap gap-2 border-b border-white/10 pb-3">
            {[
              { id: 'deposit', label: 'Deposit', icon: ArrowDownLeft },
              { id: 'withdraw', label: 'Withdraw', icon: ArrowUpRight },
              { id: 'send', label: 'Send', icon: Send },
              { id: 'receive', label: 'Receive', icon: Copy },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActionTab(tab.id as typeof actionTab)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
                    actionTab === tab.id
                      ? 'bg-violet-600 text-white'
                      : 'bg-[#07080D] border border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {actionTab === 'deposit' && (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 leading-relaxed">
                Deposit Solana Devnet SOL from your connected Phantom or Solflare wallet, or verify an existing Devnet transaction signature directly via Solana RPC. Unconfirmed deposits are never credited.
              </p>

              <form onSubmit={handleWalletDeposit} className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="dep-amount" className="block text-xs text-slate-400 mb-1">
                      Deposit Amount (SOL)
                    </label>
                    <input
                      id="dep-amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={depositSol}
                      onChange={(e) => setDepositSol(e.target.value)}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white font-mono-tabular"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={busy || !currentUser.connectedSolanaPubkey}
                      className="w-full py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-semibold text-white transition-colors"
                    >
                      Approve in Connected Wallet
                    </button>
                  </div>
                </div>
              </form>

              <form onSubmit={handleVerifyExistingSig} className="pt-3 border-t border-white/10 space-y-2.5">
                <label htmlFor="dep-sig" className="block text-xs text-slate-400">
                  Verify On-Chain Devnet Transaction Signature
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="dep-sig"
                    type="text"
                    value={depositSig}
                    onChange={(e) => setDepositSig(e.target.value)}
                    placeholder="Paste Solana Devnet transaction signature..."
                    className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white font-mono-tabular"
                  />
                  <button
                    type="submit"
                    disabled={busy || !depositSig.trim()}
                    className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-semibold text-white whitespace-nowrap"
                  >
                    Verify on Devnet
                  </button>
                </div>
              </form>
            </div>
          )}

          {actionTab === 'withdraw' && (
            <form onSubmit={handleWithdraw} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="wd-amount" className="block text-xs text-slate-400 mb-1">
                    Gross Withdrawal Amount (SOL)
                  </label>
                  <input
                    id="wd-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={withdrawSol}
                    onChange={(e) => setWithdrawSol(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white font-mono-tabular"
                  />
                </div>
                <div>
                  <label htmlFor="wd-dest" className="block text-xs text-slate-400 mb-1">
                    Destination Private Solana Wallet
                  </label>
                  <input
                    id="wd-dest"
                    type="text"
                    required
                    value={withdrawDest}
                    onChange={(e) => setWithdrawDest(e.target.value)}
                    placeholder={currentUser.connectedSolanaPubkey || 'Enter Base58 Solana Devnet address...'}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white font-mono-tabular"
                  />
                </div>
              </div>

              {withdrawPreview && (
                <div className="rounded-xl bg-[#07080D] border border-white/10 p-4 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-300">
                    <span>Withdrawal Request</span>
                    <span className="font-mono-tabular">{withdrawPreview.grossSol.toFixed(4)} SOL</span>
                  </div>
                  <div className="flex justify-between text-amber-300">
                    <span>App Fee ({withdrawPreview.appFeePercent}%) → Admin Treasury</span>
                    <span className="font-mono-tabular">-{withdrawPreview.appFeeSol.toFixed(4)} SOL</span>
                  </div>
                  <div className="flex justify-between text-white font-semibold pt-2 border-t border-white/10">
                    <span>Net Amount Received</span>
                    <span className="font-mono-tabular text-emerald-300">
                      {withdrawPreview.netSol.toFixed(4)} SOL
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 pt-1">
                    App Fee: {withdrawPreview.appFeePercent}% is a platform application fee and is separate from Solana network fees.
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={busy || !withdrawPreview}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-xs font-semibold text-white"
              >
                Confirm Withdrawal
              </button>
            </form>
          )}

          {actionTab === 'send' && (
            <form onSubmit={handleSendTransfer} className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="txf-user" className="block text-xs text-slate-400 mb-1">
                    Recipient Veri-Fi Account
                  </label>
                  <select
                    id="txf-user"
                    required
                    value={transferRecipient}
                    onChange={(e) => setTransferRecipient(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white"
                  >
                    <option value="">Select Veri-Fi user...</option>
                    {users
                      .filter((u) => u.uid !== currentUser.uid)
                      .map((u) => (
                        <option key={u.uid} value={u.uid}>
                          @{u.username} ({u.displayName})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="txf-amount" className="block text-xs text-slate-400 mb-1">
                    Amount (SOL)
                  </label>
                  <input
                    id="txf-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    value={transferSol}
                    onChange={(e) => setTransferSol(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white font-mono-tabular"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="txf-note" className="block text-xs text-slate-400 mb-1">
                  Note (optional)
                </label>
                <input
                  id="txf-note"
                  type="text"
                  value={transferNote}
                  onChange={(e) => setTransferNote(e.target.value)}
                  placeholder="Friendly split or challenge reimbursement"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-sm text-white"
                />
              </div>
              <button
                type="submit"
                disabled={busy}
                className="px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-xs font-semibold text-white"
              >
                Send Internal Transfer (Atomic Ledger)
              </button>
            </form>
          )}

          {actionTab === 'receive' && (
            <div className="rounded-xl bg-[#07080D] border border-white/10 p-4 space-y-2">
              <p className="text-xs text-slate-400">Your Veri-Fi App Wallet Handle</p>
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono-tabular text-sm text-white">@{currentUser.username}</span>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard?.writeText(currentUser.username);
                    pushToast('success', 'App Wallet username copied');
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#121728] border border-white/15 text-xs text-sky-300"
                >
                  Copy Handle
                </button>
              </div>
              <p className="text-xs text-slate-400">
                Other Veri-Fi members can send internal App Wallet SOL directly to @{currentUser.username} with zero App Fee.
              </p>
            </div>
          )}
        </section>

        {/* SYSTEM B: PRIVATE USER WALLET */}
        <section
          aria-label="Private External Wallet"
          className="lg:col-span-5 rounded-2xl bg-[#0D101B] border border-white/10 p-6 space-y-5 flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div>
              <p className="text-xs text-sky-300 font-semibold">System B · Self-Custody External Wallet</p>
              <h2 className="text-xl font-bold text-white mt-0.5 flex items-center gap-2">
                <Wallet className="w-5 h-5 text-sky-400" />
                Private Solana Wallet
              </h2>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Connect Phantom or Solflare on Solana Devnet. Veri-Fi never requests or stores seed phrases or private keys.
              </p>
            </div>

            {currentUser.connectedSolanaPubkey ? (
              <div className="rounded-xl bg-[#07080D] border border-sky-500/30 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-white">
                    {currentUser.walletProvider} Connected
                  </span>
                  <span className="text-xs text-emerald-300">
                    {currentUser.walletVerified ? 'Ownership Verified' : 'Unverified Signature'}
                  </span>
                </div>
                <p className="text-xs font-mono-tabular text-slate-300 break-all">
                  {currentUser.connectedSolanaPubkey}
                </p>
                <div className="flex flex-wrap gap-2">
                  {!currentUser.walletVerified && (
                    <button
                      type="button"
                      onClick={verifyPrivateWalletOwnership}
                      className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-semibold text-white inline-flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Sign Message to Verify
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={disconnectPrivateWallet}
                    className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs text-slate-300"
                  >
                    Disconnect
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={() => connectPrivateWallet('Phantom')}
                  className="w-full py-3 px-4 rounded-xl bg-[#07080D] hover:bg-white/5 border border-white/15 flex items-center justify-between text-sm font-medium text-white"
                >
                  <span>Connect Phantom Wallet</span>
                  <span className="text-xs text-slate-400">
                    {detectedWallets.Phantom ? 'Detected' : 'Extension Required'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => connectPrivateWallet('Solflare')}
                  className="w-full py-3 px-4 rounded-xl bg-[#07080D] hover:bg-white/5 border border-white/15 flex items-center justify-between text-sm font-medium text-white"
                >
                  <span>Connect Solflare Wallet</span>
                  <span className="text-xs text-slate-400">
                    {detectedWallets.Solflare ? 'Detected' : 'Extension Required'}
                  </span>
                </button>
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-white/10 text-xs text-slate-400 space-y-1.5">
            <p>
              Devnet RPC:{' '}
              <span className="font-mono-tabular text-slate-200">
                {devnetInfo.online ? `Live (Slot ${devnetInfo.slot})` : 'Devnet Standby'}
              </span>
            </p>
            <p className="truncate">
              Escrow Program: <span className="font-mono-tabular text-slate-300">{shortenAddress(devnetInfo.programId, 8)}</span>
            </p>
            <a
              href="https://faucet.solana.com"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 pt-1"
            >
              Get Solana Devnet Test SOL (Faucet)
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </section>
      </div>

      {/* Auditable Transaction Ledger */}
      <section className="rounded-2xl bg-[#0D101B] border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between">
          <h2 className="text-base font-semibold text-white">Auditable App Wallet Ledger</h2>
          <span className="text-xs text-slate-400 font-mono-tabular">{ledger.length} entries</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-white/10 text-slate-400">
              <tr>
                <th className="py-3 px-6 font-medium">Type</th>
                <th className="py-3 px-4 font-medium">Details</th>
                <th className="py-3 px-4 font-medium text-right">Gross</th>
                <th className="py-3 px-4 font-medium text-right">App Fee</th>
                <th className="py-3 px-4 font-medium text-right">Net</th>
                <th className="py-3 px-6 font-medium text-right">Explorer / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {ledger.map((item) => (
                <tr key={item.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-6 font-medium text-white capitalize">
                    {formatSnakeLabel(item.type)}
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-xs truncate">
                    {item.note || item.counterparty || item.idempotencyKey}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-slate-300">
                    {formatSol(item.grossLamports, 4)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-amber-300">
                    {formatSol(item.appFeeLamports, 4)}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-tabular text-white font-semibold">
                    {formatSol(item.netLamports, 4)} SOL
                  </td>
                  <td className="py-3 px-6 text-right">
                    {item.txSignature ? (
                      <a
                        href={getExplorerTxUrl(item.txSignature)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300"
                      >
                        Devnet Tx
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-emerald-300 capitalize">{item.status}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
