import { WorkspaceShell } from '@/components/workspace-shell';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
