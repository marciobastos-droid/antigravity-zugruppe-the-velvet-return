import React from "react";
import { base44 } from "@/api/base44Client";
import SubscriptionManager from "../components/subscription/SubscriptionManager";

export default function Subscriptions() {
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
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Subscrições</h1>
          <p className="text-slate-600">Gerir o seu plano e funcionalidades premium</p>
        </div>

        <SubscriptionManager />
      </div>
    </div>
  );
}