import React from "react";
import { Badge } from "@/components/ui/badge";
import { Crown, Sparkles } from "lucide-react";

export default function PremiumBadge({ plan, size = "default" }) {
  if (!plan || plan === 'free') return null;

  const config = {
    premium: {
      icon: Crown,
      color: "bg-blue-600",
      label: "Premium"
    },
    enterprise: {
      icon: Sparkles,
      color: "bg-purple-600",
      label: "Enterprise"
    }
  };

  const { icon: Icon, color, label } = config[plan] || config.premium;

  return (
    <Badge className={`${color} text-white ${size === 'sm' ? 'text-xs px-2 py-0.5' : ''}`}>
      <Icon className={`${size === 'sm' ? 'w-2.5 h-2.5' : 'w-3 h-3'} mr-1`} />
      {label}
    </Badge>
  );
}