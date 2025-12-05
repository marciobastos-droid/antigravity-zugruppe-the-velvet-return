import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, AlertCircle } from "lucide-react";

const VALIDATORS = {
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: "Email inválido"
  },
  phone: {
    pattern: /^(\+351)?[0-9\s]{9,15}$/,
    message: "Telefone inválido"
  },
  postalCode: {
    pattern: /^[0-9]{4}-[0-9]{3}$|^[0-9]{7}$/,
    message: "Formato: 1234-567"
  },
  integer: {
    validate: (val) => !val || /^\d*$/.test(val),
    message: "Apenas números inteiros"
  },
  positiveNumber: {
    validate: (val) => !val || (Number(val) >= 0 && !isNaN(Number(val))),
    message: "Valor deve ser positivo"
  },
  year: {
    validate: (val) => !val || (/^\d{4}$/.test(val) && Number(val) >= 1800 && Number(val) <= new Date().getFullYear() + 10),
    message: "Ano inválido"
  },
  price: {
    validate: (val) => !val || (Number(val) > 0 && !isNaN(Number(val))),
    message: "Preço deve ser maior que 0"
  }
};

export default function ValidatedInput({
  id,
  label,
  value,
  onChange,
  type = "text",
  validator,
  placeholder,
  required = false,
  className = "",
  hint,
  ...props
}) {
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState(false);
  const [isValid, setIsValid] = useState(false);

  const validate = (val) => {
    if (!val && required) {
      return "Campo obrigatório";
    }

    if (!val) {
      return null;
    }

    const validatorConfig = VALIDATORS[validator];
    if (!validatorConfig) return null;

    if (validatorConfig.pattern) {
      if (!validatorConfig.pattern.test(val)) {
        return validatorConfig.message;
      }
    }

    if (validatorConfig.validate) {
      if (!validatorConfig.validate(val)) {
        return validatorConfig.message;
      }
    }

    return null;
  };

  useEffect(() => {
    if (touched) {
      const validationError = validate(value);
      setError(validationError);
      setIsValid(!validationError && value);
    }
  }, [value, touched, required, validator]);

  const handleBlur = () => {
    setTouched(true);
    const validationError = validate(value);
    setError(validationError);
    setIsValid(!validationError && value);
  };

  const handleChange = (e) => {
    const val = e.target.value;
    
    // For integer/number types, prevent non-numeric input
    if (validator === 'integer' && val && !/^\d*$/.test(val)) {
      return;
    }
    
    if ((validator === 'positiveNumber' || validator === 'price') && val && !/^\d*\.?\d*$/.test(val)) {
      return;
    }

    if (validator === 'year' && val && !/^\d*$/.test(val)) {
      return;
    }

    onChange(e);
    
    if (touched) {
      const validationError = validate(val);
      setError(validationError);
      setIsValid(!validationError && val);
    }
  };

  return (
    <div className={className}>
      {label && (
        <Label htmlFor={id} className="flex items-center gap-1 mb-1.5">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
      )}
      <div className="relative">
        <Input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          onBlur={handleBlur}
          placeholder={placeholder}
          required={required}
          className={`pr-8 ${error && touched ? "border-red-500 focus-visible:ring-red-500" : ""} ${isValid ? "border-green-500" : ""}`}
          {...props}
        />
        {touched && (
          <div className="absolute right-2 top-1/2 -translate-y-1/2">
            {error ? (
              <AlertCircle className="w-4 h-4 text-red-500" />
            ) : isValid ? (
              <CheckCircle2 className="w-4 h-4 text-green-500" />
            ) : null}
          </div>
        )}
      </div>
      {error && touched && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
      {hint && !error && (
        <p className="text-xs text-slate-500 mt-1">{hint}</p>
      )}
    </div>
  );
}