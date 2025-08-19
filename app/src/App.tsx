import { useEffect, useState } from 'react'
import { NhostProvider, useAuthenticationStatus } from '@nhost/react'
import { nhost } from './lib/nhost'
import Login from './components/Login'
import Signup from './components/Signup'
import Chats from './components/Chats'
import ChatRoom from './components/ChatRoom'

function Shell() {
  const { isAuthenticated, isLoading } = useAuthenticationStatus()
  const [chatId, setChatId] = useState<string | null>(null)
  const [showSignup, setShowSignup] = useState(false)

  useEffect(() => {
    const session = nhost.auth.getSession()
    if (session) console.log('session', session)
  }, [])

  if (isLoading) return <p className="p-6">Loading…</p>
  if (!isAuthenticated) {
    return showSignup
      ? <Signup onSwitch={() => setShowSignup(false)} />
      : <Login onSwitch={() => setShowSignup(true)} />
  }

  return chatId
    ? <ChatRoom chatId={chatId} onBack={() => setChatId(null)} />
    : <Chats onOpen={setChatId} />
}

export default function App() {
  return (
    <NhostProvider nhost={nhost}>
      <Shell />
    </NhostProvider>
  )
}
