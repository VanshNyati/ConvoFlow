import { useEffect, useState } from 'react'
import { ops } from '../lib/api'
import { nhost } from '../lib/nhost'

type Chat = { id: string; title: string; created_at: string }

export default function Chats({ onOpen }: { onOpen: (id: string) => void }) {
  const [chats, setChats] = useState<Chat[]>([])
  const [title, setTitle] = useState('')
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>('')

  async function load() {
    try {
      setErr('')
      setLoading(true)
      const { ConvoFlow_chats } = await ops.myChats()
      setChats(ConvoFlow_chats as Chat[])
    } catch (e: any) {
      console.error(e)
      setErr(e?.message ?? 'Failed to load chats')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function addChat() {
    const t = title.trim()
    if (!t) return
    try {
      setErr('')
      const { insert_ConvoFlow_chats_one } = await ops.createChat(t)
      setChats([insert_ConvoFlow_chats_one as Chat, ...chats])
      setTitle('')
    } catch (e: any) {
      console.error(e)
      setErr(e?.message ?? 'Failed to create chat')
    }
  }

  async function logout() { await nhost.auth.signOut() }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <h1 className="text-3xl font-semibold">My Chats</h1>
        <button onClick={logout} className="text-sm text-gray-600 underline hover:text-gray-900">
          Log out
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        <input
          value={title}
          onChange={e => setTitle(e.target.value)}
          placeholder="New chat title"
          className="flex-1 rounded border px-3 py-2 outline-none focus:ring focus:ring-blue-200"
        />
        <button
          onClick={addChat}
          className="rounded bg-green-600 px-4 py-2 text-white hover:bg-green-700"
        >
          Create
        </button>
      </div>

      {err && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {err}
        </div>
      )}

      {loading ? (
        <div className="space-y-2">
          <div className="h-11 animate-pulse rounded bg-gray-200" />
          <div className="h-11 animate-pulse rounded bg-gray-200" />
          <div className="h-11 animate-pulse rounded bg-gray-200" />
        </div>
      ) : chats.length === 0 ? (
        <p className="text-gray-500">No chats yet. Create your first one!</p>
      ) : (
        <ul className="space-y-2">
          {chats.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onOpen(c.id)}
                className="flex w-full items-center justify-between rounded border px-4 py-3 text-left transition hover:bg-gray-50"
              >
                <span className="font-medium">{c.title}</span>
                <span className="text-xs text-gray-500">
                  {new Date(c.created_at).toLocaleString()}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
