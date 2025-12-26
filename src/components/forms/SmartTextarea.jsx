import React from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Campo de textarea inteligente com validação em tempo real
 */
export default function SmartTextarea({
  label,
  name,
  value,
  onChange,
  onBlur,
  error,
  touched,
  required = false,
  placeholder,
  rows = 4,
  description,
  className,
  textareaClassName,
  disabled = false,
  maxLength,
  minLength,
  autoExpand = false
}) {
  const [internalValue, setInternalValue] = React.useState(value || '');
  const textareaRef = React.useRef(null);

  React.useEffect(() => {
    setInternalValue(value || '');
  }, [value]);

  // Auto-expand textarea
  React.useEffect(() => {
    if (autoExpand && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [internalValue, autoExpand]);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange(newValue);
  };

  const hasError = touched && error;
  const hasSuccess = touched && !error && internalValue && internalValue.length >= (minLength || 0);

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
        <Textarea
          ref={textareaRef}
          id={name}
          name={name}
          value={internalValue}
          onChange={handleChange}
          onBlur={onBlur}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={autoExpand ? 1 : rows}
          className={cn(
            "transition-all duration-200 resize-none",
            hasError && "border-red-500 focus-visible:ring-red-500",
            hasSuccess && "border-green-500 focus-visible:ring-green-500",
            autoExpand && "overflow-hidden",
            textareaClassName
          )}
        />

        {/* Status Icon */}
        <div className="absolute right-3 top-3">
          {hasSuccess && <CheckCircle2 className="w-4 h-4 text-green-500" />}
          {hasError && <AlertCircle className="w-4 h-4 text-red-500" />}
        </div>
      </div>

      {/* Error Message */}
      {hasError && (
        <div className="flex items-center gap-1.5 text-red-600">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <p className="text-xs font-medium">{error}</p>
        </div>
      )}

      {/* Character Count */}
      {maxLength && (
        <div className="flex items-center justify-between">
          {minLength && (
            <p className={cn(
              "text-xs",
              internalValue.length < minLength ? "text-amber-600" : "text-slate-400"
            )}>
              Mínimo {minLength} caracteres
            </p>
          )}
          <p className={cn(
            "text-xs ml-auto",
            internalValue.length > maxLength * 0.9 ? "text-amber-600 font-medium" : "text-slate-400"
          )}>
            {internalValue.length}/{maxLength}
          </p>
        </div>
      )}
    </div>
  );
}