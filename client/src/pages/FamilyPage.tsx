import { useEffect, useState } from 'react';
import { authFetch } from '../lib/authFetch';

const COLORS = {
  bg: '#F7F8FA', card: '#FFFFFF', primary: '#2563EB', primaryLight: '#EFF6FF',
  accent: '#10B981', accentLight: '#ECFDF5', danger: '#EF4444', dangerLight: '#FEF2F2',
  warning: '#F59E0B', warningLight: '#FFFBEB', text: '#0F172A', muted: '#64748B',
  border: '#E2E8F0',
};

type FamilyLink = {
  id: string;
  familyId: string;
  memberUserId?: string;
  role: string;
  status: string;
};

type Props = { role: 'owner' | 'viewer'; userName: string };

function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const initials = name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: size * 0.38, flexShrink: 0 }}>
      {initials}
    </div>
  );
}

export function FamilyPage({ role, userName }: Props) {
  const [members, setMembers] = useState<FamilyLink[]>([]);
  const [myMembership, setMyMembership] = useState<FamilyLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteResult, setInviteResult] = useState<{ success: boolean; msg: string } | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  async function load() {
    try {
      const data = await authFetch<{ asOwner: FamilyLink[]; asMember: FamilyLink[] }>('/api/family/mine');
      setMembers(data.asOwner);
      setMyMembership(data.asMember[0] ?? null);
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  async function sendInvite(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    setInviteResult(null);
    try {
      const res = await authFetch<{ invite: { pendingEmail: string | null } }>('/api/family/invite', {
        method: 'POST',
        body: JSON.stringify({ email: inviteEmail.trim(), role: 'viewer' }),
      });
      const email = inviteEmail.trim();
      const isPending = res.invite.pendingEmail !== null;
      const msg = isPending
        ? `✓ Invite saved for ${email}. When they register with this email, they'll be automatically linked to your family.`
        : `✓ ${email} is already registered — they can now accept the invite from their Family tab.`;
      setInviteResult({ success: true, msg });
      setInviteEmail('');
      void load();
    } catch (err) {
      setInviteResult({ success: false, msg: err instanceof Error ? err.message : 'Invite failed' });
    } finally {
      setInviting(false);
    }
  }

  async function removeMember(memberUserId: string) {
    setRemoving(memberUserId);
    try {
      await authFetch(`/api/family/member/${memberUserId}`, { method: 'DELETE' });
      setMembers((prev) => prev.filter((m) => m.memberUserId !== memberUserId));
    } catch { /* ignore */ } finally {
      setRemoving(null);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Header */}
      <div>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: COLORS.text, fontFamily: 'Georgia, serif' }}>
          Family
        </h1>
        <p style={{ margin: '4px 0 0', color: COLORS.muted, fontSize: 14 }}>
          {role === 'owner' ? 'Manage who can see your health data' : 'Your family connection'}
        </p>
      </div>

      {loading ? (
        <div style={{ color: COLORS.muted, fontSize: 14 }}>Loading family data…</div>
      ) : (
        <>
          {/* Owner: my family panel */}
          {role === 'owner' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

              {/* Current members */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 16 }}>
                  Family Members
                </div>

                {/* You (owner) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                  <Avatar name={userName} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.text }}>{userName}</div>
                    <div style={{ fontSize: 12, color: COLORS.muted }}>You · Owner</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: COLORS.primary, background: COLORS.primaryLight, border: `1px solid ${COLORS.primary}33`, borderRadius: 6, padding: '3px 10px' }}>
                    Owner
                  </span>
                </div>

                {members.length === 0 ? (
                  <div style={{ padding: '20px 0', textAlign: 'center', color: COLORS.muted, fontSize: 13 }}>
                    No family members invited yet.
                  </div>
                ) : (
                  members.map((m) => (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: `1px solid ${COLORS.border}` }}>
                      <Avatar name={m.memberUserId ?? '?'} size={40} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, color: COLORS.text }}>{m.memberUserId}</div>
                        <div style={{ fontSize: 12, color: COLORS.muted }}>
                          {m.role === 'owner' ? 'Owner' : 'Viewer'} ·{' '}
                          <span style={{ color: m.status === 'accepted' ? COLORS.accent : COLORS.warning, fontWeight: 600 }}>
                            {m.status === 'accepted' ? 'Active' : 'Pending invite'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => m.memberUserId && void removeMember(m.memberUserId)}
                        disabled={removing === m.memberUserId}
                        style={{ background: 'none', border: `1px solid ${COLORS.dangerLight}`, borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: COLORS.danger, cursor: 'pointer' }}>
                        {removing === m.memberUserId ? '…' : 'Remove'}
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Invite form */}
              <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 22 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 4 }}>
                  Invite a Family Member
                </div>
                <div style={{ fontSize: 13, color: COLORS.muted, marginBottom: 16 }}>
                  They'll be able to view your glucose, insulin, and meal logs in real-time.
                </div>
                <form onSubmit={(e) => void sendInvite(e)} style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <input
                    type="email"
                    placeholder="Enter their email address"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    required
                    style={{ flex: '1 1 220px', padding: '10px 14px', borderRadius: 8, border: `1.5px solid ${COLORS.border}`, fontSize: 14, color: COLORS.text, background: '#fff', outline: 'none' }}
                  />
                  <button
                    type="submit"
                    disabled={inviting || !inviteEmail.trim()}
                    style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: COLORS.primary, color: '#fff', fontWeight: 700, fontSize: 14, cursor: inviting ? 'not-allowed' : 'pointer', opacity: inviting || !inviteEmail.trim() ? 0.7 : 1 }}>
                    {inviting ? 'Sending…' : 'Send Invite'}
                  </button>
                </form>

                {inviteResult && (
                  <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 8, background: inviteResult.success ? COLORS.accentLight : COLORS.dangerLight, border: `1px solid ${inviteResult.success ? COLORS.accent : COLORS.danger}33`, fontSize: 13, color: inviteResult.success ? COLORS.accent : COLORS.danger, lineHeight: 1.5 }}>
                    {inviteResult.msg}
                  </div>
                )}
              </div>

              {/* How it works */}
              <div style={{ background: COLORS.primaryLight, border: `1px solid ${COLORS.primary}22`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.primary, marginBottom: 10 }}>How family sharing works</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    ['📧', 'Invite by email — tell them to register with the same address; they auto-link instantly'],
                    ['👁️', 'Viewers can see your glucose, insulin, and meal logs'],
                    ['🔔', 'They receive critical glucose alerts in real-time'],
                    ['🔒', 'Viewers cannot log on your behalf or edit any data'],
                    ['🏠', "They can view and add dishes to Mom's Kitchen"],
                  ].map(([icon, text]) => (
                    <div key={text} style={{ display: 'flex', gap: 10, fontSize: 13, color: COLORS.text }}>
                      <span>{icon}</span><span>{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Viewer: my connection panel */}
          {role === 'viewer' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {myMembership ? (
                <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 22 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text, marginBottom: 16 }}>My Family Connection</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: COLORS.accentLight, border: `2px solid ${COLORS.accent}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>
                      👨‍👩‍👦
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 15, color: COLORS.text }}>Connected to a family</div>
                      <div style={{ fontSize: 13, color: COLORS.muted, marginTop: 3 }}>
                        Role: <strong>Viewer</strong> ·{' '}
                        Status:{' '}
                        <span style={{ color: myMembership.status === 'accepted' ? COLORS.accent : COLORS.warning, fontWeight: 600 }}>
                          {myMembership.status === 'accepted' ? 'Active' : 'Pending acceptance'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {myMembership.status === 'invited' && (
                    <AcceptInviteButton inviteId={myMembership.id} onAccepted={load} />
                  )}
                </div>
              ) : (
                <div style={{ background: COLORS.card, border: `1px solid ${COLORS.border}`, borderRadius: 16, padding: 40, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                  <div style={{ fontWeight: 700, color: COLORS.text, fontSize: 16 }}>Not connected to any family</div>
                  <div style={{ color: COLORS.muted, fontSize: 13, marginTop: 6 }}>
                    Ask the family owner to invite you using your email address.
                  </div>
                </div>
              )}

              <div style={{ background: COLORS.accentLight, border: `1px solid ${COLORS.accent}22`, borderRadius: 16, padding: 20 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: COLORS.accent, marginBottom: 10 }}>As a viewer you can</div>
                {[
                  ['🩸', 'See real-time glucose readings'],
                  ['💉', 'See insulin doses logged'],
                  ['🍛', 'View meal history and nutrition'],
                  ['🔔', 'Receive critical alerts'],
                  ['🏠', "Browse and add to Mom's Kitchen"],
                ].map(([icon, text]) => (
                  <div key={text} style={{ display: 'flex', gap: 10, fontSize: 13, color: COLORS.text, marginBottom: 6 }}>
                    <span>{icon}</span><span>{text}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AcceptInviteButton({ inviteId, onAccepted }: { inviteId: string; onAccepted: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function accept() {
    setLoading(true);
    try {
      await authFetch(`/api/family/accept/${inviteId}`, { method: 'POST' });
      setDone(true);
      onAccepted();
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }

  if (done) return (
    <div style={{ marginTop: 16, padding: '10px 14px', borderRadius: 8, background: COLORS.accentLight, color: COLORS.accent, fontWeight: 600, fontSize: 13 }}>
      ✓ Invite accepted! You now have viewer access.
    </div>
  );

  return (
    <button onClick={() => void accept()} disabled={loading}
      style={{ marginTop: 16, padding: '10px 20px', borderRadius: 8, border: 'none', background: COLORS.accent, color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}>
      {loading ? 'Accepting…' : 'Accept Invite'}
    </button>
  );
}
