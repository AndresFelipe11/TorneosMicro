"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} className="card mx-auto max-w-md space-y-4 p-6">
      <div>
        <label className="mb-1 block text-sm font-semibold">Correo</label>
        <input className="field" name="email" type="email" required defaultValue="admin@torneosmicro.local" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">Contraseña</label>
        <input className="field" name="password" type="password" required defaultValue="admin1234" />
      </div>
      {state?.error ? <p className="text-sm font-semibold text-red-400">{state.error}</p> : null}
      <button className="btn btn-lime w-full" disabled={pending} type="submit">
        {pending ? "Entrando..." : "Entrar"}
      </button>
      <p className="text-xs text-muted">
        Demo local: <strong>admin@torneosmicro.local</strong> / <strong>admin1234</strong>
      </p>
    </form>
  );
}
