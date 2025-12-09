import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

/**
 * Router page that handles SEO-friendly URLs and redirects to PropertyDetails
 * Matches URLs like: /imoveis/apartamento/lisboa/titulo-do-imovel?id=123
 */
export default function PropertySEORouter() {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Extract property ID from query string
    const urlParams = new URLSearchParams(window.location.search);
    const propertyId = urlParams.get('id');

    if (propertyId) {
      // Redirect to PropertyDetails with the ID
      const detailsUrl = `${createPageUrl("PropertyDetails")}?id=${propertyId}`;
      navigate(detailsUrl, { replace: true });
    } else {
      // No ID found, redirect to browse page
      navigate(createPageUrl("Website"), { replace: true });
    }
  }, [navigate]);

  // Show loading while redirecting
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
        <p className="text-slate-600">A carregar imóvel...</p>
      </div>
    </div>
  );
}