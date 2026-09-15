"use client";

import { useActionState } from "react";
import { loginAction } from "@/lib/actions/auth";
import { PasswordField } from "@/components/PasswordField";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null);

  return (
    <form action={action} autoComplete="off" className="card mx-auto max-w-md space-y-4 p-6">
      <div>
        <label className="mb-1 block text-sm font-semibold">Usuario</label>
        <input
          autoComplete="username"
          className="field"
          name="email"
          required
          type="text"
          placeholder="Correo o nombre del equipo"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-semibold">Contraseña</label>
        <PasswordField autoComplete="current-password" name="password" required />
        <p className="mt-1 text-xs text-muted">Si eres capitán, usa el WhatsApp del equipo.</p>
      </div>
      {state?.error ? <p className="text-sm font-semibold text-red-400">{state.error}</p> : null}
      <button className="btn btn-lime w-full" disabled={pending} type="submit">
        {pending ? "Entrando..." : "Entrar"}
      </button>
    </form>
  );
}
