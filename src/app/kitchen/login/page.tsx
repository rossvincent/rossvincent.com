"use client";

import { useActionState, useState } from "react";
import { kitchenLogin, type KitchenLoginState } from "./actions";
import "../kitchen.css";

const initialState: KitchenLoginState = {};

export default function KitchenLoginPage() {
  const [state, formAction, pending] = useActionState(kitchenLogin, initialState);
  const [reveal, setReveal] = useState(false);

  return (
    <div
      className="kt"
      style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {/* React 19 hoists this into <head> from a client component. */}
      <meta name="robots" content="noindex, nofollow" />
      <form
        action={formAction}
        style={{ display: "flex", flexDirection: "column", gap: "1rem", width: "20rem", padding: "1.5rem" }}
      >
        <h1 style={{ fontSize: "1.6rem", margin: 0 }}>Kitchen</h1>
        <p className="kt-sub" style={{ margin: 0 }}>
          The week&rsquo;s dinners and the shopping list.
        </p>
        <input
          type={reveal ? "text" : "password"}
          name="password"
          placeholder="Password"
          autoFocus
          required
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          style={{
            font: "inherit",
            fontSize: "1rem",
            padding: "0.65rem 0.85rem",
            borderRadius: "2px",
            border: "1px solid var(--line-2)",
            background: "var(--surface)",
            color: "var(--ink)",
          }}
        />
        <label style={{ fontSize: "0.8rem", color: "var(--ink-2)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input type="checkbox" checked={reveal} onChange={(e) => setReveal(e.target.checked)} />
          Show password
        </label>
        <button className="kt-btn" type="submit" disabled={pending} style={{ padding: "0.7rem 1rem" }}>
          {pending ? "Checking" : "Open the kitchen"}
        </button>
        {state.error && (
          <p style={{ color: "var(--brick)", fontSize: "0.85rem", margin: 0 }}>{state.error}</p>
        )}
      </form>
    </div>
  );
}
