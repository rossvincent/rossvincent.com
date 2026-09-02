"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

const initialState: LoginState = {};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState);

  return (
    <div
      // React 19 hoists title/meta/link tags rendered anywhere in the tree
      // into <head>, including from a client component, so this doesn't
      // need a separate server wrapper just to set robots noindex.
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0d1113",
        fontFamily:
          "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      }}
    >
      <meta name="robots" content="noindex, nofollow" />
      <form
        action={formAction}
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          width: "20rem",
        }}
      >
        <h1
          style={{
            color: "#dfe7e9",
            fontSize: "0.82rem",
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            margin: 0,
          }}
        >
          Board
        </h1>
        <input
          type="password"
          name="password"
          placeholder="Password"
          autoFocus
          required
          style={{
            padding: "0.65rem 0.85rem",
            borderRadius: "3px",
            border: "1px solid #293438",
            background: "#151b1e",
            color: "#dfe7e9",
            fontSize: "0.95rem",
          }}
        />
        {state.error && (
          <p style={{ color: "#ef7a70", fontSize: "0.85rem", margin: 0 }}>
            {state.error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          style={{
            padding: "0.65rem 0.85rem",
            borderRadius: "3px",
            border: "none",
            background: "#4fb9c0",
            color: "#0d1113",
            fontWeight: 600,
            fontSize: "0.9rem",
            cursor: pending ? "default" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Checking..." : "Enter"}
        </button>
      </form>
    </div>
  );
}
