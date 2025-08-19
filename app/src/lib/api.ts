import { nhost } from './nhost'

type GqlResponse<T> = { data: T; error?: unknown };

async function gql<T>(query: string, variables?: Record<string, any>): Promise<T> {
  const { data, error } = (await nhost.graphql.request(
    query,
    variables
  )) as GqlResponse<T>;
  if (error) throw error;
  return data;
}


export type Msg = {
  id: string
  chat_id: string
  sender: string
  content: string
  created_at: string
}

export const ops = {
  myChats: () =>
    gql<{ ConvoFlow_chats: { id: string; title: string; created_at: string }[] }>(`
      query {
        ConvoFlow_chats(order_by: { created_at: desc }) {
          id title created_at
        }
      }
    `),

  createChat: (title: string) =>
    gql<{ insert_ConvoFlow_chats_one: { id: string; title: string; created_at: string } }>(
      `mutation($title:String!) {
        insert_ConvoFlow_chats_one(object:{ title:$title }) {
          id title created_at
        }
      }`,
      { title }
    ),

  messages: (chat_id: string) =>
    gql<{ ConvoFlow_messages: Msg[] }>(
      `query($chat_id:uuid!){
        ConvoFlow_messages(
          where:{chat_id:{_eq:$chat_id}},
          order_by:{created_at:asc}
        ){ id chat_id sender content created_at }
      }`,
      { chat_id }
    ),

  // Insert USER message (step 1)
  addUserMessage: (chat_id: string, content: string) =>
    gql<{ insert_ConvoFlow_messages_one: { id: string } }>(
      `mutation($chat_id:uuid!, $content:String!) {
        insert_ConvoFlow_messages_one(
          object:{ chat_id:$chat_id, content:$content, sender:"user" }
        ) { id }
      }`,
      { chat_id, content }
    ),

  // Hasura Action → n8n → OpenRouter (step 2)
  sendMessageAction: (chat_id: string, content: string) =>
    gql<{ sendMessage: { inserted_id: string; reply: string } }>(
      `mutation($chat_id:uuid!, $content:String!) {
        sendMessage(chat_id:$chat_id, content:$content) {
          inserted_id
          reply
        }
      }`,
      { chat_id, content }
    ),

  // (Optional) subscription — ignore if your nhost version lacks it
  subscribeMessages: (
    chat_id: string,
    onNext: (rows: Msg[]) => void,
    onError?: (e: any) => void
  ) => {
    const anyGql: any = nhost.graphql as any
    if (!anyGql?.subscribe) {
      // silently no-op if subscribe() isn’t available in this nhost version
      return () => {}
    }
    const SUB = `
      subscription($chat_id:uuid!){
        ConvoFlow_messages(
          where:{chat_id:{_eq:$chat_id}},
          order_by:{created_at:asc}
        ){ id chat_id sender content created_at }
      }
    `
    const observable = anyGql.subscribe<{ ConvoFlow_messages: Msg[] }>(SUB, { chat_id })
    const sub = observable.subscribe({
      next: (x: any) => onNext(x.data?.ConvoFlow_messages ?? []),
      error: (e: any) => onError?.(e),
    })
    return () => { try { sub.unsubscribe() } catch {} }
  },
}
