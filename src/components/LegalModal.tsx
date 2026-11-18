import { X } from 'lucide-react';

export type LegalDocType = 'terms' | 'privacy' | 'responsible' | 'support' | null;

export function LegalModal({ docType, onClose }: { docType: LegalDocType; onClose: () => void }) {
  if (!docType) return null;

  const content: Record<Exclude<LegalDocType, null>, { title: string; sections: { heading: string; body: string }[] }> = {
    terms: {
      title: 'Terms and Conditions',
      sections: [
        {
          heading: '1. Platform Scope & Solana Devnet',
          body: 'Veri-Fi is a peer-to-peer social challenge platform. Initial testing and demonstrations operate exclusively on Solana Devnet without real-money Mainnet funds.',
        },
        {
          heading: '2. Eligibility & Jurisdiction Compliance',
          body: 'Users must be at least 18 years of age (or the age of majority in their jurisdiction) and reside in an eligible territory. Users are responsible for complying with local laws.',
        },
        {
          heading: '3. Escrow & App Fee (2%)',
          body: 'Challenge stakes are locked in Solana Anchor PDA escrow accounts. Withdrawals from the Veri-Fi App Wallet to a private wallet incur a clearly disclosed 2% App Fee routed to the Veri-Fi Treasury, separate from Solana network fees.',
        },
      ],
    },
    privacy: {
      title: 'Privacy Policy',
      sections: [
        {
          heading: '1. Data Separation',
          body: 'Public profiles display only username, display name, bio, and optional challenge statistics. Email addresses, jurisdiction flags, and private security settings are isolated from public discovery.',
        },
        {
          heading: '2. Location & Media Privacy',
          body: 'Location challenges never broadcast live user coordinates publicly. Uploaded chat media and evidence files are protected by authenticated storage rules.',
        },
        {
          heading: '3. Account Deletion & Record Retention',
          body: 'Upon deletion requests, personal social details are removed while financial, escrow, dispute, and audit records are preserved as required for accounting and fraud prevention.',
        },
      ],
    },
    responsible: {
      title: 'Responsible Use & Safeguards',
      sections: [
        {
          heading: '1. Friendly Challenges & Limits',
          body: 'Configure daily stake limits and self-exclusion periods at any time under Profile > Settings. Never stake funds you cannot afford to lose.',
        },
        {
          heading: '2. Casino & Poker Restrictions',
          body: 'Casino and Poker modules are disabled and labeled Coming Soon in this release. They remain inaccessible on both frontend and backend pending legal, licensing, and security review.',
        },
        {
          heading: '3. Safety in Physical & Truth-or-Dare Challenges',
          body: 'Dangerous, illegal, harassing, or coercive challenges are strictly prohibited and may result in immediate account suspension.',
        },
      ],
    },
    support: {
      title: 'Support & Dispute Mediation',
      sections: [
        {
          heading: '1. Challenge Disputes',
          body: 'If participants disagree on a challenge outcome, either party may raise a dispute from My Bets to hold escrow funds until authorized review.',
        },
        {
          heading: '2. Solana Explorer Verification',
          body: 'Every Devnet deposit, escrow lock, and settlement links directly to Solana Explorer. Contact support@verifi.app for account or transaction assistance.',
        },
      ],
    },
  };

  const doc = content[docType];

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-modal-title"
        className="w-full max-w-xl bg-[#0D101B] border border-white/15 rounded-2xl overflow-hidden shadow-2xl"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <h2 id="legal-modal-title" className="text-lg font-semibold text-white">
            {doc.title}
          </h2>
          <button
            type="button"
            aria-label="Close legal dialog"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {doc.sections.map((sec) => (
            <div key={sec.heading} className="space-y-1.5">
              <h3 className="text-sm font-semibold text-violet-300">{sec.heading}</h3>
              <p className="text-sm text-slate-300 leading-relaxed">{sec.body}</p>
            </div>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-white/10 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
