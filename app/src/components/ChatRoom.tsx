import { useEffect, useRef, useState } from "react"
import { ops, Msg } from "../lib/api"

type Bubble = { id: string; sender: string; content: string; _temp?: boolean }

export default function ChatRoom({
  chatId,
  onBack,
}: {
  chatId: string
  onBack: () => void
}) {
  const [messages, setMessages] = useState<Bubble[]>([])
  const [input, setInput] = useState("")
  const [pending, setPending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string>("")
  const listRef = useRef<HTMLDivElement>(null)

  // --- helpers ---------------------------------------------------------------
  const toBubble = (m: Msg): Bubble => ({ id: m.id, sender: m.sender, content: m.content })

  async function refresh() {
    const { ConvoFlow_messages } = await ops.messages(chatId)
    setMessages(ConvoFlow_messages.map(toBubble))
  }

  // initial fetch
  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        setErr("")
        setLoading(true)
        const { ConvoFlow_messages } = await ops.messages(chatId)
        if (!mounted) return
        setMessages(ConvoFlow_messages.map(toBubble))
      } catch (e: any) {
        console.error(e)
        setErr(e?.message ?? "Failed to load messages")
      } finally {
        setLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [chatId])

  // subscription (no-op on older nhost versions)
  useEffect(() => {
    const off = ops.subscribeMessages(
      chatId,
      (rows: Msg[]) => setMessages(rows.map(toBubble)),
      (e) => {
        console.warn("subscription error (non-fatal):", e)
      }
    )
    return () => {
      try {
        off()
      } catch {}
    }
  }, [chatId])

  // autoscroll
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, pending])

  // send with optimistic UI + action + fallback polling
  async function send(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || pending) return
    setInput("")
    setPending(true)
    setErr("")

    // optimistic user bubble
    const tmpUserId = `tmp-user-${Date.now()}`
    setMessages((m) => [...m, { id: tmpUserId, sender: "user", content: text, _temp: true }])

    try {
      // 1) insert real USER row
      await ops.addUserMessage(chatId, text)

      // 2) call Action (n8n). It returns { reply } — show optimistically too
      const { sendMessage } = await ops.sendMessageAction(chatId, text)
      const replyText = sendMessage?.reply ?? ""

      if (replyText) {
        const tmpBotId = `tmp-bot-${Date.now()}`
        setMessages((m) => [
          // keep everything but remove the temp user only if you want to avoid seeing both
          // we keep it; the refresh will replace with server truth
          ...m,
          { id: tmpBotId, sender: "assistant", content: replyText, _temp: true },
        ])
      }

      // 3) immediate refresh once
      await refresh()

      // 4) fallback: short polling in case DB insert lags
      //    poll up to ~8s (6 * 1.3s) to catch late n8n inserts
      for (let i = 0; i < 6; i++) {
        await delay(1300)
        await refresh()
      }
    } catch (e: any) {
      console.error(e)
      setErr(e?.message ?? "Failed to send")
      // remove temp user bubble on failure
      setMessages((m) => m.filter((b) => b.id !== tmpUserId))
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto flex h-screen max-w-3xl flex-col">
        <header className="flex items-center gap-3 border-b bg-white p-3">
          <button onClick={onBack} className="text-sm text-blue-600 underline">
            ← Back
          </button>
          <h1 className="font-semibold">Chat</h1>
        </header>

        {err && (
          <div className="mx-3 mt-3 rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-900">
            {err}
          </div>
        )}

        <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4">
          {loading && (
            <div className="space-y-2">
              <div className="h-8 w-1/2 animate-pulse rounded bg-gray-200" />
              <div className="h-8 w-2/3 animate-pulse rounded bg-gray-200" />
              <div className="h-8 w-1/3 animate-pulse rounded bg-gray-200" />
            </div>
          )}

          {!loading && messages.length === 0 && !err && (
            <p className="py-6 text-center text-gray-500">No messages yet… Say hi!</p>
          )}

          {messages.map((m) => {
            const mine = m.sender === "user"
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2 shadow-sm ${
                    mine ? "bg-blue-600 text-white" : "bg-white"
                  } ${m._temp ? "opacity-70" : ""}`}
                >
                  {m.content}
                </div>
              </div>
            )
          })}

          {pending && (
            <div className="flex justify-end">
              <div className="max-w-[80%] rounded-2xl bg-blue-600/80 px-4 py-2 text-white">
                Sending…
              </div>
            </div>
          )}
        </div>

        <form onSubmit={send} className="flex gap-2 border-t bg-white p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message…"
            className="flex-1 rounded border px-3 py-2 outline-none focus:ring focus:ring-blue-200"
          />
          <button
            disabled={pending}
            className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-60"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

function delay(ms: number) {
  return new Promise((res) => setTimeout(res, ms))
}
