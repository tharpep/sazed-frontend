import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { AccountId, FinanceState } from "../data";
import { formatMoney, useMask } from "../Masked";
import { RuleChoice, SHEET_BUTTON_CLASS } from "./accountParts";
import { FinanceSheet } from "./FinanceSheet";

const CONTROL_CLASS = "h-11 w-full md:h-8";

interface ManualFormProps {
  state: FinanceState;
  id: AccountId;
  onAccount: (id: AccountId) => void;
}

function ManualForm({ state, id, onAccount }: ManualFormProps) {
  const { masked } = useMask();
  const account = state.accounts.find((a) => a.id === id) ?? state.accounts[0];
  const prefill = id === state.manual.account ? state.manual.value : account.figure?.value;
  const items = state.accounts.map((a) => ({ value: a.id, label: a.name }));

  return (
    <>
      <Field>
        <FieldLabel htmlFor="manual-account">Account</FieldLabel>
        <Select items={items} value={id} onValueChange={(v) => v && onAccount(v)}>
          <SelectTrigger id="manual-account" className={CONTROL_CLASS}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {items.map((item) => (
              <SelectItem key={item.value} value={item.value}>
                {item.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Field>
        <FieldLabel htmlFor="manual-amount">{account.owed ? "Balance owed" : "Balance"}</FieldLabel>
        <div className="relative">
          <Input
            key={id}
            id="manual-amount"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            defaultValue={prefill !== undefined && !masked ? formatMoney(prefill) : ""}
            className={`${CONTROL_CLASS} pr-12 font-mono tabular-nums`}
          />
          <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-caption text-muted">USD</span>
        </div>
      </Field>
      <Field>
        <FieldLabel htmlFor="manual-asof">As of</FieldLabel>
        <Input id="manual-asof" type="date" defaultValue={state.today} max={state.today} className={CONTROL_CLASS} />
      </Field>
      <Field>
        <FieldLabel htmlFor="manual-note">Note</FieldLabel>
        <Input id="manual-note" placeholder={state.manual.note} className={CONTROL_CLASS} />
      </Field>
      <RuleChoice />
    </>
  );
}

interface ManualSheetProps {
  state: FinanceState;
  accountId: AccountId | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ManualSheet({ state, accountId, open, onOpenChange }: ManualSheetProps) {
  const initial = accountId ?? state.manual.account;
  const [id, setId] = useState<AccountId>(initial);
  // Each opening starts from the account it was opened for.
  const [openedFor, setOpenedFor] = useState<AccountId | null>(null);
  const opening = open ? initial : null;
  if (openedFor !== opening) {
    setOpenedFor(opening);
    if (opening) setId(opening);
  }
  const figure = state.accounts.find((a) => a.id === id)?.figure ?? null;
  const close = () => onOpenChange(false);

  return (
    <FinanceSheet
      open={open}
      onOpenChange={onOpenChange}
      title={figure ? "Edit by hand" : "Type a figure"}
      subtitle={figure ? `Last: ${figure.source.toLowerCase()}, ${figure.when}` : "No figure yet"}
      footer={
        <>
          <Button className={SHEET_BUTTON_CLASS} onClick={close}>
            Save
          </Button>
          <Button variant="outline" className={SHEET_BUTTON_CLASS} onClick={close}>
            Cancel
          </Button>
        </>
      }
    >
      <ManualForm state={state} id={id} onAccount={setId} />
    </FinanceSheet>
  );
}
