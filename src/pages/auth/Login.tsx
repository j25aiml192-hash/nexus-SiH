import { FormEvent, useState } from 'react';
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNexusStore } from '@/store/nexusStore';
import { ROLES } from '@/lib/constants';

const demos = [
  ['I4C National', 'i4c@demo.nexus', ROLES.I4C_NATIONAL, 'National Intelligence'],
  ['State LEA', 'lea@demo.nexus', ROLES.STATE_LEA, 'Jharkhand Operations'],
  ['Bank Officer', 'bank@demo.nexus', ROLES.BANK_OFFICER, 'SBI Fraud Desk'],
  ['Field Officer', 'field@demo.nexus', ROLES.FIELD_OFFICER, 'Deoghar Response Unit'],
];

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();
  const setUser = useNexusStore((s) => s.setUser);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signIn(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Access denied. Use a quick login profile to enter the command center.');
    } finally {
      setLoading(false);
    }
  };

  const quick = (item: typeof demos[number]) => {
    setUser({
      id: `demo-${item[2]}`,
      email: item[1],
      name: item[0],
      role: item[2],
      state: item[2] === ROLES.STATE_LEA || item[2] === ROLES.FIELD_OFFICER ? 'Jharkhand' : null,
      district: item[2] === ROLES.FIELD_OFFICER ? 'Deoghar' : null,
      bank: item[2] === ROLES.BANK_OFFICER ? 'SBI' : null,
      phone: null,
    });
    navigate('/');
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F4F6F9] p-4">
      <div className="w-full max-w-[420px]">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-[#1A2035] font-mono text-2xl font-extrabold text-white shadow-sm">
            NX
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0F1B2D]">NEXUS</h1>
          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-[#64748B]">Predictive intelligence platform</p>
        </div>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-8 shadow-[0_4px_6px_rgba(0,0,0,0.05),0_10px_15px_rgba(0,0,0,0.03)]">
          <form onSubmit={submit} className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#374151]">Operator email</span>
              <input
                className="nexus-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="operator@agency.gov.in"
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-[#374151]">Access key</span>
              <input
                className="nexus-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
              />
            </label>
            {error && <p className="rounded-lg bg-[#FEF2F2] p-3 text-xs text-[#DC2626] border border-[#FECACA]">{error}</p>}
            <button disabled={loading} className="nexus-btn flex w-full items-center justify-center gap-2 py-2.5">
              {loading ? 'Authenticating…' : 'Access system'}
              <ArrowRight size={16} />
            </button>
          </form>

          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-[#E2E8F0]" />
            <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Quick access</span>
            <div className="h-px flex-1 bg-[#E2E8F0]" />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {demos.map((item) => (
              <button
                key={item[2]}
                onClick={() => quick(item)}
                className="rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] p-3 text-left transition hover:bg-[#E2E8F0]"
              >
                <p className="text-xs font-semibold text-[#0F1B2D]">{item[0]}</p>
                <p className="mt-0.5 text-[11px] text-[#64748B]">{item[3]}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-xs text-[#94A3B8]">
          <LockKeyhole size={13} />
          <span>Secured by I4C</span>
          <span>|</span>
          <ShieldCheck size={13} />
          <span>Ministry of Home Affairs</span>
        </div>
      </div>
    </main>
  );
}
