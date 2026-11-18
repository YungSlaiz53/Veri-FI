import React, { useState } from 'react';
import { Bot, Send, ShieldAlert, X } from 'lucide-react';
import { useVeriFi } from '../lib/store';

interface BotTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export function VeriBotDrawer() {
  const { veriBotOpen, setVeriBotOpen, veriBotContextChallenge, activeTab } = useVeriFi();
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<BotTurn[]>([
    {
      id: 'init',
      role: 'assistant',
      text: 'Hello, I am VeriBot. Ask me about Veri-Fi challenge rules, Solana PDA escrow, the 2% App Fee on withdrawals, or how to organize dispute evidence. I never ask for private keys and cannot move funds or decide winners.',
    },
  ]);

  if (!veriBotOpen) return null;

  const askVeriBot = async (questionText: string) => {
    const q = questionText.trim();
    if (!q || loading) return;

    const userTurn: BotTurn = { id: `u_${Date.now()}`, role: 'user', text: q };
    setTurns((prev) => [...prev, userTurn]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/veribot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: q,
          context: {
            activeTab,
            challengeTitle: veriBotContextChallenge?.title,
            challengeCategory: veriBotContextChallenge?.category,
            challengeRules: veriBotContextChallenge?.rules,
            challengeStatus: veriBotContextChallenge?.status,
          },
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setTurns((prev) => [
          ...prev,
          {
            id: `e_${Date.now()}`,
            role: 'assistant',
            text: json.error || 'VeriBot service is currently unavailable.',
          },
        ]);
      } else {
        setTurns((prev) => [
          ...prev,
          { id: `a_${Date.now()}`, role: 'assistant', text: json.reply },
        ]);
      }
    } catch {
      setTurns((prev) => [
        ...prev,
        {
          id: `e_${Date.now()}`,
          role: 'assistant',
          text: 'Network error reaching VeriBot server endpoint.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void askVeriBot(input);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full max-w-md bg-[#0D101B] border-l border-white/15 shadow-2xl flex flex-col">
      <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600/20 border border-violet-500/40 flex items-center justify-center">
            <Bot className="w-4 h-4 text-violet-300" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-white">VeriBot Assistant</h2>
            <p className="text-[11px] text-slate-400">Guidance & Evidence Helper</p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close VeriBot"
          onClick={() => setVeriBotOpen(false)}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="px-5 py-2.5 bg-amber-500/10 border-b border-amber-500/20 flex items-center gap-2 text-[11px] text-amber-200">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
        <span>VeriBot cannot access keys, move SOL, or authorize escrow payouts.</span>
      </div>

      {veriBotContextChallenge && (
        <div className="px-5 py-2.5 bg-[#07080D] border-b border-white/10 text-xs text-slate-300">
          Context: <span className="text-white font-medium">{veriBotContextChallenge.title}</span>
        </div>
      )}

      <div className="flex-1 p-5 space-y-3 overflow-y-auto">
        {turns.map((t) => (
          <div
            key={t.id}
            className={`rounded-2xl px-4 py-3 text-xs leading-relaxed ${
              t.role === 'user'
                ? 'bg-violet-600 text-white ml-8'
                : 'bg-[#121728] border border-white/10 text-slate-200 mr-6'
            }`}
          >
            {t.text}
          </div>
        ))}
        {loading && <p className="text-xs text-slate-400">VeriBot is thinking...</p>}
      </div>

      <div className="px-5 pb-3 flex flex-wrap gap-1.5">
        {[
          'Explain the 2% App Fee',
          'How does Solana PDA escrow work?',
          'How do disputes work?',
        ].map((prompt) => (
          <button
            key={prompt}
            type="button"
            onClick={() => void askVeriBot(prompt)}
            className="px-2.5 py-1 rounded-lg bg-[#07080D] border border-white/10 text-[11px] text-sky-300 hover:border-sky-400/50"
          >
            {prompt}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 flex gap-2">
        <input
          type="text"
          aria-label="Ask VeriBot"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask VeriBot a question..."
          className="flex-1 px-3.5 py-2.5 rounded-xl bg-[#07080D] border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          aria-label="Send question to VeriBot"
          className="px-3.5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white"
        >
          <Send className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
