import { PageHeader } from '@/components/ui/PageHeader';
import { SettingsNav } from '@/components/settings/SettingsNav';

/** Settings: one page per section (General, Delivery, Team) with a side nav. */
export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <PageHeader title="Settings" description="Store configuration, delivery charges and the admin team." />
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <SettingsNav />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
