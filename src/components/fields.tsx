import type { ReactNode } from "react";

import { Field, Input, useFieldControlProps } from "@dev-mainsequence/command-center-sdk/controls";
import {
  ResourcePicker,
  type ResourcePickerOption,
} from "@dev-mainsequence/command-center-sdk/views";

interface FieldChrome {
  label: ReactNode;
  description?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  disabled?: boolean;
}

interface PickerProps {
  value: string | null;
  options: readonly ResourcePickerOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  searchable?: boolean;
  loading?: boolean;
  emptyMessage?: string;
}

function FieldPicker({ label, ...picker }: PickerProps & { label: ReactNode }) {
  const control = useFieldControlProps({ disabled: picker.loading });
  return (
    <ResourcePicker
      ariaLabel={typeof label === "string" ? label : undefined}
      disabled={control.disabled}
      emptyMessage={picker.emptyMessage}
      fullWidth
      id={control.id}
      loading={picker.loading}
      mode="single"
      onValueChange={picker.onChange}
      options={picker.options}
      placeholder={picker.placeholder}
      presentation="auto"
      searchable={picker.searchable ?? picker.options.length > 8}
      value={picker.value}
    />
  );
}

/** A labelled single-choice picker (the SDK has no native select control). */
export function SelectField({ label, description, error, required, disabled, ...picker }: FieldChrome & PickerProps) {
  return (
    <Field description={description} disabled={disabled} error={error} label={label} required={required}>
      <FieldPicker label={label} {...picker} />
    </Field>
  );
}

export const YES_NO_OPTIONS: readonly ResourcePickerOption[] = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

interface TextFieldProps extends FieldChrome {
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "number";
  placeholder?: string;
  min?: number;
  max?: number;
  step?: number | "any";
  inputMode?: "decimal" | "numeric" | "text";
  autoComplete?: string;
}

export function TextField({
  label,
  description,
  error,
  required,
  disabled,
  value,
  onChange,
  type = "text",
  placeholder,
  min,
  max,
  step,
  inputMode,
  autoComplete = "off",
}: TextFieldProps) {
  return (
    <Field description={description} disabled={disabled} error={error} label={label} required={required}>
      <Input
        autoComplete={autoComplete}
        inputMode={inputMode}
        max={max}
        min={min}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        required={required}
        step={step}
        type={type}
        value={value}
      />
    </Field>
  );
}

/** Parse a numeric field; `null` when blank, `NaN` when not a number. */
export function parseNumberField(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return Number(trimmed);
}
