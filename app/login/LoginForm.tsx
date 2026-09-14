"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} autoComplete="off" className="card mx-auto max-w-md space-y-4 p-6">
      <div>
        <label className="mb-1 block text-sm font-semibold">Correo</label>
        <input
          autoComplete="username"
          className="field"
          name="email"
          required
          type="email"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">Contraseña</label>
        <input
          autoComplete="current-password"
          className="field"
          name="password"
          required
          type="password"
        />
      </div>
      {state?.error ? <p className="text-sm font-semibold text-red-400">{state.error}</p> : null}
      <button className="btn btn-lime w-full" disabled={pending} type="submit">
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
