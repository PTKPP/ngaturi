"use client";

import { useState } from "react";
import {
  GiftModuleSchema,
  MAX_GIFT_ACCOUNTS,
  MAX_GIFT_ACCOUNTS_PER_TYPE,
  maskGiftAccountIdentifier,
  maskGiftAddress,
  type GiftBankAccount,
  type GiftEWallet,
  type GiftModule,
} from "../definitions/gift";

type AccountDraft = { provider: string; accountNumber: string; accountHolder: string };
type AccountKind = "bankAccounts" | "eWallets";
const emptyDraft = (): AccountDraft => ({ provider: "", accountNumber: "", accountHolder: "" });

export function GiftModuleEditor({ value, onChange }: { value: GiftModule; onChange(value: GiftModule): void }) {
  const [bankDraft, setBankDraft] = useState(emptyDraft);
  const [walletDraft, setWalletDraft] = useState(emptyDraft);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState("");
  const totalAccounts = value.bankAccounts.length + value.eWallets.length;

  const commit = (candidate: GiftModule) => {
    const result = GiftModuleSchema.safeParse(candidate);
    if (!result.success) {
      setFeedback(result.error.issues[0]?.message ?? "Data hadiah belum valid.");
      return false;
    }
    setFeedback("");
    onChange(result.data);
    return true;
  };

  const addAccount = (kind: AccountKind, draft: AccountDraft) => {
    const type = kind === "bankAccounts" ? "bank" as const : "e_wallet" as const;
    const account = { id: crypto.randomUUID(), type, ...draft };
    if (!commit({ ...value, [kind]: [...value[kind], account] })) return;
    if (kind === "bankAccounts") setBankDraft(emptyDraft());
    else setWalletDraft(emptyDraft());
  };

  const removeAccount = (kind: AccountKind, id: string) => {
    commit({ ...value, [kind]: value[kind].filter((account) => account.id !== id) });
    setRevealed((current) => { const next = new Set(current); next.delete(id); return next; });
  };

  const moveAccount = (kind: AccountKind, index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= value[kind].length) return;
    const accounts = [...value[kind]];
    [accounts[index], accounts[target]] = [accounts[target], accounts[index]];
    commit({ ...value, [kind]: accounts });
  };

  const editAccount = (kind: AccountKind, id: string, key: keyof AccountDraft, nextValue: string, input: HTMLInputElement) => {
    const current = value[kind].find((account) => account.id === id);
    if (!current) return;
    const accounts = value[kind].map((account) => account.id === id ? { ...account, [key]: nextValue } : account) as GiftBankAccount[] & GiftEWallet[];
    if (!commit({ ...value, [kind]: accounts })) input.value = current[key];
  };

  const copy = async (id: string, accountNumber: string) => {
    try {
      await navigator.clipboard.writeText(accountNumber);
      setFeedback(`Nomor ${id} berhasil disalin.`);
    } catch {
      setFeedback("Nomor belum dapat disalin. Tampilkan lalu salin dari field edit.");
    }
  };

  const accountEditor = (kind: AccountKind, account: GiftBankAccount | GiftEWallet, index: number) => {
    const label = kind === "bankAccounts" ? "bank" : "e-wallet";
    return <article className="gift-editor-card" key={account.id}>
      <div className="event-heading"><div><strong>{account.provider}</strong><p>{maskGiftAccountIdentifier(account.accountNumber)} · {account.accountHolder}</p></div><span className="badge">{kind === "bankAccounts" ? "Bank" : "E-Wallet"}</span></div>
      <div className="form two-column">
        <label className="field"><span>Provider {label} {index + 1}</span><input defaultValue={account.provider} maxLength={60} onBlur={(event) => editAccount(kind, account.id, "provider", event.currentTarget.value, event.currentTarget)} required /></label>
        <label className="field"><span>Atas nama {label} {index + 1}</span><input defaultValue={account.accountHolder} maxLength={100} onBlur={(event) => editAccount(kind, account.id, "accountHolder", event.currentTarget.value, event.currentTarget)} required /></label>
        <label className="field full"><span>Nomor {label} {index + 1}</span><input type={revealed.has(account.id) ? "text" : "password"} defaultValue={account.accountNumber} maxLength={40} autoComplete="off" onBlur={(event) => editAccount(kind, account.id, "accountNumber", event.currentTarget.value, event.currentTarget)} required /></label>
      </div>
      <div className="actions">
        <button className="button ghost compact" type="button" onClick={() => setRevealed((current) => { const next = new Set(current); if (next.has(account.id)) next.delete(account.id); else next.add(account.id); return next; })}>{revealed.has(account.id) ? "Sembunyikan nomor" : "Tampilkan nomor"}</button>
        <button className="button secondary compact" type="button" onClick={() => void copy(account.provider, account.accountNumber)}>Salin nomor</button>
        <button className="button ghost compact" type="button" disabled={index === 0} onClick={() => moveAccount(kind, index, -1)}>Naik</button>
        <button className="button ghost compact" type="button" disabled={index === value[kind].length - 1} onClick={() => moveAccount(kind, index, 1)}>Turun</button>
        <button className="button danger compact" type="button" onClick={() => removeAccount(kind, account.id)}>Hapus</button>
      </div>
    </article>;
  };

  const addEditor = (kind: AccountKind, draft: AccountDraft, setDraft: (value: AccountDraft) => void) => {
    const label = kind === "bankAccounts" ? "rekening bank" : "e-wallet";
    const capped = totalAccounts >= MAX_GIFT_ACCOUNTS || value[kind].length >= MAX_GIFT_ACCOUNTS_PER_TYPE;
    return <fieldset className="gift-add-account" disabled={capped}>
      <legend>Tambah {label}</legend>
      <div className="form two-column">
        <label className="field"><span>Provider {label} baru</span><input value={draft.provider} maxLength={60} onChange={(event) => setDraft({ ...draft, provider: event.target.value })} placeholder={kind === "bankAccounts" ? "Contoh: BCA" : "Contoh: GoPay"} /></label>
        <label className="field"><span>Atas nama {label} baru</span><input value={draft.accountHolder} maxLength={100} onChange={(event) => setDraft({ ...draft, accountHolder: event.target.value })} /></label>
        <label className="field full"><span>Nomor {label} baru</span><input value={draft.accountNumber} maxLength={40} autoComplete="off" onChange={(event) => setDraft({ ...draft, accountNumber: event.target.value })} /></label>
      </div>
      <button className="button secondary compact" type="button" onClick={() => addAccount(kind, draft)}>Tambah {label}</button>
      {capped ? <small>Maksimal {MAX_GIFT_ACCOUNTS} akun total dan {MAX_GIFT_ACCOUNTS_PER_TYPE} per jenis.</small> : null}
    </fieldset>;
  };

  return <section className="form-section form gift-module-editor" data-gift-editor>
    <div><h2>Informasi hadiah</h2><p>Gift hanya menampilkan informasi. Ngaturi tidak memproses pembayaran atau transaksi.</p></div>
    <div className="gift-editor-list">{value.bankAccounts.map((account, index) => accountEditor("bankAccounts", account, index))}</div>
    {addEditor("bankAccounts", bankDraft, setBankDraft)}
    <div className="gift-editor-list">{value.eWallets.map((account, index) => accountEditor("eWallets", account, index))}</div>
    {addEditor("eWallets", walletDraft, setWalletDraft)}
    <div className="gift-editor-card">
      <label className="check-field"><input type="checkbox" checked={value.physicalGift.enabled} onChange={(event) => commit({ ...value, physicalGift: { ...value.physicalGift, enabled: event.target.checked } })} /><span>Tampilkan alamat hadiah fisik</span></label>
      <p className="gift-masked-value">Preview aman: {maskGiftAddress(value.physicalGift.address)}</p>
      <details><summary>Edit penerima dan alamat hadiah fisik</summary><div className="form">
        <label className="field"><span>Nama penerima hadiah fisik</span><input defaultValue={value.physicalGift.recipient} maxLength={100} onBlur={(event) => { const previous = value.physicalGift.recipient; if (!commit({ ...value, physicalGift: { ...value.physicalGift, recipient: event.currentTarget.value } })) event.currentTarget.value = previous; }} /></label>
        <label className="field"><span>Alamat hadiah fisik</span><textarea defaultValue={value.physicalGift.address} maxLength={500} onBlur={(event) => { const previous = value.physicalGift.address; if (!commit({ ...value, physicalGift: { ...value.physicalGift, address: event.currentTarget.value } })) event.currentTarget.value = previous; }} /></label>
        <label className="field"><span>Instruksi hadiah fisik (opsional)</span><textarea defaultValue={value.physicalGift.note} maxLength={300} onBlur={(event) => { const previous = value.physicalGift.note; if (!commit({ ...value, physicalGift: { ...value.physicalGift, note: event.currentTarget.value } })) event.currentTarget.value = previous; }} /></label>
      </div></details>
    </div>
    {value.legacyText ? <div className="gift-editor-card"><label className="field"><span>Informasi hadiah lama (compatibility)</span><textarea defaultValue={value.legacyText} maxLength={2000} onBlur={(event) => { const previous = value.legacyText; if (!commit({ ...value, legacyText: event.currentTarget.value })) event.currentTarget.value = previous; }} /></label><small>Teks lama tetap ditampilkan sampai dikosongkan setelah data terstruktur selesai diisi.</small></div> : null}
    <p className={feedback.includes("berhasil") ? "form-success" : "form-error"} role="status" hidden={!feedback}>{feedback}</p>
  </section>;
}
