import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import { useNexusStore } from '@/store/nexusStore';
export default function RoleGuard({ roles, children }: { roles: string[]; children: ReactNode }) { const user=useNexusStore(s=>s.user); if(!user) return <Navigate to="/login" replace />; if(!roles.includes(user.role)) return <Navigate to="/unauthorized" replace />; return <>{children}</>; }
