import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export default function TouchOptimizedInput({ 
  label, 
  error, 
  helperText,
  className = "",
  containerClassName = "",
  ...props 
}) {
  return (
    <div className={cn("space-y-2", containerClassName)}>
      {label && (
        <Label className="text-base font-medium text-slate-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      <Input
        {...props}
        className={cn(
          "h-12 text-base px-4 rounded-lg border-2 focus:border-blue-500 transition-colors",
          error && "border-red-500 focus:border-red-500",
          className
        )}
      />
      {error && (
        <p className="text-sm text-red-600 mt-1">{error}</p>
      )}
      {helperText && !error && (
        <p className="text-sm text-slate-500 mt-1">{helperText}</p>
      )}
    </div>
  );
}