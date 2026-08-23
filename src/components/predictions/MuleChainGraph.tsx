import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

interface MuleNode {
  node_index: number;
  bank: string;
  state: string;
  transaction_velocity: number;
  is_flagged: boolean;
  kyc_lat: number;
  kyc_lng: number;
}

interface Props {
  complaintId?: string;
}

export default function MuleChainGraph({ complaintId }: Props) {
  const [nodes, setNodes] = useState<MuleNode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!complaintId) {
      setLoading(false);
      return;
    }
    
    const fetchNodes = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('mule_chain_nodes')
          .select('*')
          .eq('complaint_id', complaintId)
          .order('node_index', { ascending: true });
        
        if (error) throw error;
        setNodes(data || []);
      } catch (err) {
        console.error('Mule chain fetch error:', err);
        setNodes([]);
      } finally {
        setLoading(false);
      }
    };

    fetchNodes();
  }, [complaintId]);

  if (loading) {
    return (
      <div style={{
        background: '#0A0F2C',
        borderRadius: '12px',
        padding: '20px',
        textAlign: 'center',
        color: '#8A9BB5',
        fontSize: '13px'
      }}>
        Loading chain data...
      </div>
    );
  }

  // Build display nodes: victim + mule nodes + cash-out
  const displayNodes = [
    { label: 'VICTIM', type: 'victim', bank: 'Origin Account', 
      state: 'Unknown', velocity: 0, flagged: false },
    ...nodes.map(n => ({
      label: `MULE ${n.node_index}`,
      type: 'mule',
      bank: n.bank || 'Unknown Bank',
      state: n.state || 'Unknown',
      velocity: n.transaction_velocity || 0,
      flagged: n.is_flagged || false
    })),
    { label: 'CASH-OUT', type: 'cashout', bank: 'ATM Withdrawal', 
      state: 'Predicted Zone', velocity: 0, flagged: true }
  ];

  const nodeColor = (type: string) => {
    if (type === 'victim') return '#3B82F6';
    if (type === 'cashout') return '#FF4444';
    return '#FF9900';
  };

  if (nodes.length === 0) {
    return (
      <div style={{
        background: '#0A0F2C',
        borderRadius: '12px',
        padding: '16px'
      }}>
        <div style={{ 
          color: '#8A9BB5', fontSize: '11px', 
          textTransform: 'uppercase', letterSpacing: '0.1em',
          marginBottom: '12px'
        }}>
          MULE CHAIN TRACE
        </div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          {['VICTIM', 'MULE →', 'MULE →', 'CASH-OUT'].map((label, i) => (
            <React.Fragment key={i}>
              <div style={{
                background: i === 0 ? '#3B82F620' : 
                            i === 3 ? '#FF444420' : '#FF990020',
                border: `1px solid ${i === 0 ? '#3B82F6' : 
                                     i === 3 ? '#FF4444' : '#FF9900'}`,
                borderRadius: '8px',
                padding: '8px 10px',
                fontSize: '11px',
                color: i === 0 ? '#3B82F6' : 
                       i === 3 ? '#FF4444' : '#FF9900',
                textAlign: 'center',
                minWidth: '60px'
              }}>
                {label.replace(' →', '')}
                <div style={{ 
                  color: '#8A9BB5', fontSize: '10px', marginTop: '2px'
                }}>
                  {i === 0 ? 'Origin' : 
                   i === 3 ? 'ATM Zone' : 'Processing'}
                </div>
              </div>
              {i < 3 && (
                <div style={{ 
                  color: '#00D4FF', fontSize: '16px', flexShrink: 0 
                }}>→</div>
              )}
            </React.Fragment>
          ))}
        </div>
        <div style={{ 
          color: '#8A9BB5', fontSize: '11px', marginTop: '8px' 
        }}>
          Chain topology estimated — detailed node data loads after 
          backend processes complaint
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: '#0A0F2C',
      borderRadius: '12px',
      padding: '16px'
    }}>
      <div style={{ 
        color: '#8A9BB5', fontSize: '11px',
        textTransform: 'uppercase', letterSpacing: '0.1em',
        marginBottom: '12px',
        display: 'flex',
        justifyContent: 'space-between'
      }}>
        <span>MULE CHAIN TRACE</span>
        <span style={{ color: '#00D4FF' }}>
          {nodes.length} HOPS DETECTED
        </span>
      </div>
      
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        overflowX: 'auto',
        paddingBottom: '8px'
      }}>
        {displayNodes.map((node, i) => (
          <React.Fragment key={i}>
            <div style={{
              background: nodeColor(node.type) + '20',
              border: `1px solid ${nodeColor(node.type)}`,
              borderRadius: '8px',
              padding: '10px 12px',
              minWidth: '90px',
              flexShrink: 0,
              position: 'relative'
            }}>
              {node.flagged && node.type !== 'cashout' && (
                <div style={{
                  position: 'absolute',
                  top: '-6px',
                  right: '-6px',
                  background: '#FF4444',
                  borderRadius: '50%',
                  width: '12px',
                  height: '12px',
                  fontSize: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'white'
                }}>!</div>
              )}
              <div style={{ 
                color: nodeColor(node.type), 
                fontSize: '10px', 
                fontWeight: 700,
                textTransform: 'uppercase'
              }}>
                {node.label}
              </div>
              <div style={{ 
                color: '#FFFFFF', fontSize: '11px', marginTop: '4px' 
              }}>
                {node.bank}
              </div>
              <div style={{ 
                color: '#8A9BB5', fontSize: '10px' 
              }}>
                {node.state}
              </div>
              {node.velocity > 0 && (
                <div style={{ 
                  color: '#FF9900', fontSize: '10px', marginTop: '2px' 
                }}>
                  {node.velocity} txn/4h
                </div>
              )}
            </div>
            {i < displayNodes.length - 1 && (
              <div style={{ 
                color: '#00D4FF', 
                fontSize: '18px', 
                flexShrink: 0,
                animation: 'pulse 1.5s infinite'
              }}>→</div>
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}
