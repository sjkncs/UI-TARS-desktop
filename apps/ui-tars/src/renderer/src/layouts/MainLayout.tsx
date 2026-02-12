import { Outlet } from 'react-router';
import { AppSidebar } from '@/renderer/src/components/SideBar/app-sidebar';
import { SidebarInset, SidebarProvider } from '@renderer/components/ui/sidebar';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts';

export function MainLayout() {
  useGlobalShortcuts();

  return (
    <SidebarProvider
      style={{ '--sidebar-width-icon': '72px' }}
      className="flex h-screen w-full bg-background"
    >
      <AppSidebar />
      <SidebarInset className="flex-1">
        <Outlet />
      </SidebarInset>
    </SidebarProvider>
  );
}
