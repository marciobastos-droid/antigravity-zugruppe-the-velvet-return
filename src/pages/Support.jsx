import React from "react";
import { base44 } from "@/api/base44Client";
import SupportTicketManager from "../components/support/SupportTicketManager";

export default function Support() {
  // Auth check
  React.useEffect(() => {
    base44.auth.isAuthenticated().then(isAuth => {
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.pathname);
      }
    });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <SupportTicketManager />
      </div>
    </div>
  );
}