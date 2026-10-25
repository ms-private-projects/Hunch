import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";

import { Button, Field, Textarea } from "@dev-mainsequence/command-center-sdk/controls";
import {
  ApplicationCard,
  ApplicationPage,
  ApplicationPageHeader,
  ApplicationPageStack,
} from "@dev-mainsequence/command-center-sdk/layout";

import { api } from "../../api/hunch";
import type { RiskLevel, TakeConstraints, TakeCreateBody } from "../../api/types";
import { useAction } from "../../api/useQuery";
import { useNotices } from "../../app/notices/NoticesProvider";
import { SelectField, TextField, YES_NO_OPTIONS, parseNumberField } from "../../components/fields";
import { ErrorNotice } from "../../components/Notices";
import { parseList } from "../../lib/format";

interface FormValues {
  title: string;
  thesis: string;
  horizon: string;
  cashBuffer: string;
  maxWeight: string;
  maxPositions: string;
  exclusions: string;
  leveragedEtf: "yes" | "no";
  risk: RiskLevel;
  changeMyMind: string;
}

const DEFAULTS: FormValues = {
  title: "",
  thesis: "",
  horizon: "12",
  cashBuffer: "0.05",
  maxWeight: "0.15",
  maxPositions: "15",
  exclusions: "",
  leveragedEtf: "no",
  risk: "medium",
  changeMyMind: "",
};

type Errors = Partial<Record<keyof FormValues, string>>;

function validate(values: FormValues): { errors: Errors; body: TakeCreateBody | null } {
  const errors: Errors = {};
  const title = values.title.trim();
  const thesis = values.thesis.trim();
  if (!title) errors.title = "Give the take a title.";
  else if (title.length > 255) errors.title = "At most 255 characters.";
  if (thesis.length < 10) errors.thesis = "Write at least ten characters.";
  else if (thesis.length > 5000) errors.thesis = "At most 5,000 characters.";

  const inRange = (key: keyof FormValues, min: number, max: number, integer = false): number | null => {
    const value = parseNumberField(values[key] as string);
    if (value === null || Number.isNaN(value)) {
      errors[key] = "Enter a number.";
      return null;
    }
    if (integer && !Number.isInteger(value)) {
      errors[key] = "Enter a whole number.";
      return null;
    }
    if (value < min || value > max) {
      errors[key] = `Between ${min} and ${max}.`;
      return null;
    }
    return value;
  };
  const horizon = inRange("horizon", 1, 120, true);
  const cashBuffer = inRange("cashBuffer", 0, 0.5);
  const maxWeight = inRange("maxWeight", 0.02, 1);
  const maxPositions = inRange("maxPositions", 3, 40, true);
  const exclusions = parseList(values.exclusions, /[,\n;]+/);
  if (exclusions.length > 50) errors.exclusions = "At most 50 exclusions.";
  const changeMyMind = parseList(values.changeMyMind, /\n+/).join("\n");
  if (changeMyMind.length > 2000) errors.changeMyMind = "At most 2,000 characters.";

  if (Object.keys(errors).length > 0 || horizon === null || cashBuffer === null || maxWeight === null || maxPositions === null) {
    return { errors, body: null };
  }
  const constraints: TakeConstraints = {
    horizon_months: horizon,
    cash_buffer: cashBuffer,
    max_single_name_weight: maxWeight,
    max_positions: maxPositions,
    exclusions,
    allow_leveraged_etf: values.leveragedEtf === "yes",
    risk_level: values.risk,
    change_my_mind: changeMyMind || null,
  };
  return { errors, body: { title, thesis_text: thesis, constraints } };
}

export function NewTakePage() {
  const navigate = useNavigate();
  const { notify } = useNotices();
  const action = useAction();
  const [values, setValues] = useState<FormValues>(DEFAULTS);
  const [errors, setErrors] = useState<Errors>({});
  const [submitted, setSubmitted] = useState(false);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) => {
    setValues((current) => ({ ...current, [key]: value }));
    if (submitted) setErrors(validate({ ...values, [key]: value }).errors);
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const { errors: nextErrors, body } = validate(values);
    setErrors(nextErrors);
    if (!body) return;
    const take = await action.run(() => api.takes.create(body));
    if (!take) return;
    notify({ title: "Take saved", description: "Build it to turn the thesis into a basket.", variant: "success" });
    navigate(`/takes/${encodeURIComponent(take.uid)}?welcome=1`);
  }

  return (
    <ApplicationPage maxWidth="content">
      <form noValidate onSubmit={submit}>
        <ApplicationPageHeader
          actions={
            <Button pending={action.pending} type="submit" variant="primary">
              Save take
            </Button>
          }
          description="Write the thesis in your own words and set the limits Hunch must respect. You can build, practise and fund it afterwards."
          eyebrow="Takes"
          title="New take"
        />
        <ApplicationPageStack>
          {action.error ? <ErrorNotice error={action.error} /> : null}
          <ApplicationCard header={<h2 className="hunch-section-title">Thesis</h2>}>
            <div className="hunch-form-stack">
              <TextField
                error={errors.title}
                label="Title"
                onChange={(value) => set("title", value)}
                placeholder="Grid build-out beats rate fears"
                required
                value={values.title}
              />
              <Field
                description="What you believe, why, and over what period. Hunch researches it and picks the basket."
                error={errors.thesis}
                label="Thesis"
                required
              >
                <Textarea
                  onChange={(event) => set("thesis", event.target.value)}
                  required
                  rows={7}
                  value={values.thesis}
                />
              </Field>
              <Field
                description="One per line. The reviews flag these conditions when they show up."
                error={errors.changeMyMind}
                label="What would change my mind"
              >
                <Textarea
                  onChange={(event) => set("changeMyMind", event.target.value)}
                  placeholder={"Capex guidance is cut for two quarters in a row\nPolicy support is withdrawn"}
                  rows={3}
                  value={values.changeMyMind}
                />
              </Field>
            </div>
          </ApplicationCard>
          <ApplicationCard header={<h2 className="hunch-section-title">Constraints</h2>}>
            <div className="hunch-form-grid">
              <TextField
                error={errors.horizon}
                inputMode="numeric"
                label="Horizon (months)"
                max={120}
                min={1}
                onChange={(value) => set("horizon", value)}
                step={1}
                type="number"
                value={values.horizon}
              />
              <TextField
                description="Fraction kept in cash, 0 to 0.5."
                error={errors.cashBuffer}
                inputMode="decimal"
                label="Cash buffer"
                max={0.5}
                min={0}
                onChange={(value) => set("cashBuffer", value)}
                step={0.01}
                type="number"
                value={values.cashBuffer}
              />
              <TextField
                description="Fraction per instrument, 0.02 to 1."
                error={errors.maxWeight}
                inputMode="decimal"
                label="Max single-name weight"
                max={1}
                min={0.02}
                onChange={(value) => set("maxWeight", value)}
                step={0.01}
                type="number"
                value={values.maxWeight}
              />
              <TextField
                error={errors.maxPositions}
                inputMode="numeric"
                label="Max positions"
                max={40}
                min={3}
                onChange={(value) => set("maxPositions", value)}
                step={1}
                type="number"
                value={values.maxPositions}
              />
              <SelectField
                label="Risk level"
                onChange={(value) => set("risk", value as RiskLevel)}
                options={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                ]}
                value={values.risk}
              />
              <SelectField
                label="Allow leveraged ETFs"
                onChange={(value) => set("leveragedEtf", value === "yes" ? "yes" : "no")}
                options={YES_NO_OPTIONS}
                value={values.leveragedEtf}
              />
              <div className="hunch-span-all">
                <TextField
                  description="Tickers or themes to keep out, separated by commas."
                  error={errors.exclusions}
                  label="Exclusions"
                  onChange={(value) => set("exclusions", value)}
                  placeholder="TSLA, tobacco"
                  value={values.exclusions}
                />
              </div>
            </div>
          </ApplicationCard>
        </ApplicationPageStack>
      </form>
    </ApplicationPage>
  );
}
