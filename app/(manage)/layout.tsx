import { DashboardShell } from '@/components/dashboard-shell';

export default function ManageLayout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>;
}
