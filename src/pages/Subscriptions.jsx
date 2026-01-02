import React from "react";
import SubscriptionManager from "../components/subscription/SubscriptionManager";

export default function Subscriptions() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Subscrições</h1>
          <p className="text-slate-600">Escolha o plano ideal para o seu negócio</p>
        </div>
        
        <SubscriptionManager />
      </div>
    </div>
  );
}