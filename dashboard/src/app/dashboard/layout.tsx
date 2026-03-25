"use client";

import Sidebar from "@/components/Sidebar";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  return (
    <div className="flex h-screen overflow-hidden bg-[#F0F4FF]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between px-8 py-4 bg-white border-b border-[#E2E8F0] shrink-0 shadow-sm">
          <div>
            <h1 className="text-lg font-semibold text-[#0F172A]">Dashboard</h1>
            <p className="text-xs text-[#94A3B8]">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/dashboard/listing-ai")}
              className="px-4 py-2 text-sm font-medium text-white rounded-lg transition-all hover:opacity-90 active:scale-95"
              style={{ backgroundColor: "#2563EB" }}
            >
              + New Report
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto px-8 py-6">{children}</main>
      </div>
    </div>
  );
}
