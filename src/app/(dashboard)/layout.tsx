import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import Sidebar from "@/components/Sidebar";
import SessionProvider from "@/components/SessionProvider";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <SessionProvider session={session}>
      <div className="dashboard-layout">
        <Sidebar
          role={session.user.role}
          userName={session.user.name || "Usuario"}
          userEmail={session.user.email || ""}
        />
        <main className="main-content">
          {children}
        </main>
      </div>
    </SessionProvider>
  );
}
