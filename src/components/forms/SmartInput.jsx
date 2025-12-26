import React from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Campo de input inteligente com validação em tempo real
 */
export default function SmartInput({
  label,
  name,
  type = "text",
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  placeholder,
  autoComplete,
  suggestions = [],
  onSuggestionClick,
  validating = false,
  success = false,
  icon: Icon,
  description,
  className,
  inputClassName,
  disabled = false,
  maxLength
}) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const [internalValue, setInternalValue] = React.useState(value || '');

  React.useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
    
    // Mostrar sugestões se existirem
    if (suggestions.length > 0 && newValue.length > 2) {
      setShowSuggestions(true);
    }
  };

  const handleBlur = () => {
    // Pequeno delay para permitir clique em sugestões
    setTimeout(() => {
      setShowSuggestions(false);
      if (onBlur) onBlur();
    }, 200);
  };

  const hasError = touched && error;
  const hasSuccess = touched && !error && internalValue && success;

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label htmlFor={name} className="text-sm font-medium text-slate-700 flex items-center gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      
      {description && (
        <p className="text-xs text-slate-500">{description}</p>
      )}

      <div className="relative">
        {Icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
        )}
        
        <Input
          id={name}
          name={name}
          type={type}
          value={internalValue}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          autoComplete={autoComplete}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            "transition-all duration-200",
            Icon && "pl-10",
            hasError && "border-red-500 focus-visible:ring-red-500",
            hasSuccess && "border-green-500 focus-visible:ring-green-500",
            inputClassName
          )}
        />

        {/* Status Icons */}
        <div className="absolute right-3 top-1/2 -translate-y-1/2">
          {validating && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
          {hasSuccess && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
        </div>

        {/* Sugestões de Autocompletar */}
        {showSuggestions && suggestions.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  if (onSuggestionClick) {
                    onSuggestionClick(suggestion);
                  }
                  setShowSuggestions(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-0"
              >
                <div className="text-sm font-medium text-slate-900">
                  {suggestion.name || suggestion.full_name}
                </div>
                <div className="text-xs text-slate-500">
                  {suggestion.email}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="flex items-center gap-1.5 text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}

      {/* Character Count */}
      {maxLength && internalValue && (
        <p className={cn(
          "text-xs text-right",
          internalValue.length > maxLength * 0.9 ? "text-amber-600" : "text-slate-400"
        )}>
          {internalValue.length}/{maxLength}
        </p>
      )}
    </div>
  );
}