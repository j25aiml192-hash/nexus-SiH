import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface SentinelScore {
  id: string;
  account_hash: string;
  bank: string;
  state: string;
  surge_score: number;
  trigger_reason: string;
  status: string;
  last_updated: string;
}

export default function SentinelPanel() {
  const [scores, setScores] = useState<SentinelScore[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchScores = async () => {
      const { data } = await supabase
        .from('sentinel_scores')
        .select('*')
        .order('surge_score', { ascending: false })
        .limit(8);
      setScores(data || []);
      setLoading(false);
    };

    fetchScores();

    const channel = supabase
      .channel('sentinel')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'sentinel_scores'
      }, () => fetchScores())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const scoreColor = (score: number) => {
    if (score >= 80) return '#FF4444';
    if (score >= 50) return '#FF9900';
    return '#00C48C';
  };

  const scoreLabel = (score: number) => {
    if (score >= 80) return 'SURGE';
    if (score >= 50) return 'ELEVATED';
    return 'NORMAL';
  };

  return (
    <div style={{
      background: '#0D1533',
      border: '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '16px',
      height: '100%'
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <div>
          <div style={{
            color: '#FFFFFF',
            fontSize: '14px',
            fontWeight: 600
          }}>
            🛡️ SENTINEL
          </div>
          <div style={{
            color: '#8A9BB5',
            fontSize: '11px',
            marginTop: '2px'
          }}>
            Behavioral surge monitoring · updates every 3 min
          </div>
        </div>
        <div style={{
          background: scores.some(s => s.surge_score >= 80) 
            ? '#FF444420' : '#00C48C20',
          border: `1px solid ${scores.some(s => s.surge_score >= 80) 
            ? '#FF4444' : '#00C48C'}`,
          borderRadius: '6px',
          padding: '4px 10px',
          fontSize: '11px',
          fontWeight: 700,
          color: scores.some(s => s.surge_score >= 80) 
            ? '#FF4444' : '#00C48C'
        }}>
          {scores.filter(s => s.surge_score >= 80).length} SURGE
        </div>
      </div>

      {loading ? (
        <div style={{ color: '#8A9BB5', fontSize: '13px', 
                      textAlign: 'center', padding: '20px' }}>
          Scanning accounts...
        </div>
      ) : scores.length === 0 ? (
        <div style={{ color: '#8A9BB5', fontSize: '13px',
                      textAlign: 'center', padding: '20px' }}>
          No accounts in monitoring yet.
          Engine populates this as complaints are processed.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {scores.map(score => (
            <div key={score.id} style={{
              background: '#060B1A',
              borderRadius: '8px',
              padding: '12px',
              borderLeft: `3px solid ${scoreColor(score.surge_score)}`
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '6px'
              }}>
                <div style={{
                  color: '#FFFFFF',
                  fontSize: '12px',
                  fontFamily: 'monospace'
                }}>
                  {score.account_hash?.slice(0, 12)}...
                </div>
                <div style={{
                  color: scoreColor(score.surge_score),
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {scoreLabel(score.surge_score)}
                </div>
              </div>

              <div style={{
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '4px',
                height: '6px',
                marginBottom: '6px',
                overflow: 'hidden'
              }}>
                <div style={{
                  background: scoreColor(score.surge_score),
                  height: '100%',
                  width: `${score.surge_score}%`,
                  borderRadius: '4px',
                  transition: 'width 0.5s ease'
                }} />
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'space-between'
              }}>
                <div style={{ color: '#8A9BB5', fontSize: '10px' }}>
                  {score.bank} · {score.state}
                </div>
                <div style={{
                  color: scoreColor(score.surge_score),
                  fontSize: '11px',
                  fontWeight: 700
                }}>
                  {score.surge_score}/100
                </div>
              </div>

              <div style={{
                color: '#8A9BB5',
                fontSize: '10px',
                marginTop: '4px',
                fontStyle: 'italic'
              }}>
                {score.trigger_reason}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
