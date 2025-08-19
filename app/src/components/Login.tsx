import { useState } from "react"
import { nhost } from "../lib/nhost"

export default function Login({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg("")
    const { error } = await nhost.auth.signIn({ email, password })
    setLoading(false)
    setMsg(error ? `❌ ${error.message}` : "✅ Logged in")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white shadow rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-6 text-center">Welcome back</h2>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full border rounded px-3 py-2" type="email" placeholder="Email"
            value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password"
            value={password} onChange={e=>setPassword(e.target.value)} />
          <button disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2">
            {loading ? "Signing in…" : "Sign in"}
          </button>
        </form>
        {msg && <p className="mt-3 text-sm text-center">{msg}</p>}
        <p className="mt-4 text-center text-sm">
          Don’t have an account?{" "}
          <button className="text-blue-600 hover:underline" onClick={onSwitch}>Create one</button>
        </p>
      </div>
    </div>
  )
}
