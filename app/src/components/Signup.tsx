import { useState } from "react"
import { nhost } from "../lib/nhost"

export default function Signup({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [msg, setMsg] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setMsg("")
    const { error } = await nhost.auth.signUp({ email, password })
    setLoading(false)
    setMsg(error ? `❌ ${error.message}` : "✅ Account created. Check your inbox (if email verification enabled).")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white shadow rounded-2xl p-6">
        <h2 className="text-2xl font-semibold mb-6 text-center">Create account</h2>
        <form onSubmit={submit} className="space-y-3">
          <input className="w-full border rounded px-3 py-2" type="email" placeholder="Email"
            value={email} onChange={e=>setEmail(e.target.value)} />
          <input className="w-full border rounded px-3 py-2" type="password" placeholder="Password"
            value={password} onChange={e=>setPassword(e.target.value)} />
          <button disabled={loading}
            className="w-full bg-green-600 hover:bg-green-700 text-white rounded px-4 py-2">
            {loading ? "Creating…" : "Sign up"}
          </button>
        </form>
        {msg && <p className="mt-3 text-sm text-center">{msg}</p>}
        <p className="mt-4 text-center text-sm">
          Already have an account?{" "}
          <button className="text-blue-600 hover:underline" onClick={onSwitch}>Sign in</button>
        </p>
      </div>
    </div>
  )
}
