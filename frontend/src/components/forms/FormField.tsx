import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import React, { forwardRef } from "react";

interface FormFieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string | React.ReactNode;
  name: string;
  error?: string;
  required?: boolean;
  className?: string;
}

export const FormField = forwardRef<HTMLInputElement, FormFieldProps>(
  (
    {
      label,
      name,
      type = "text",
      placeholder,
      error,
      required = false,
      className,
      ...props
    },
    ref
  ) => {
    return (
      <div className={cn("space-y-2.5", className)}>
        <Label htmlFor={name} className="flex gap-1">
          {label}
          {required && <span className="text-red-500">*</span>}
        </Label>
        <Input
          ref={ref}
          id={name}
          name={name}
          type={type}
          placeholder={placeholder}
          aria-invalid={!!error}
          className={cn(error && "border-red-500 focus-visible:ring-red-500")}
          {...props}
        />
        {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
      </div>
    );
  }
);
