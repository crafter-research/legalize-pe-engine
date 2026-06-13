import { ProvideLinksToolSchema } from '../../../lib/ai/inkeep-qa-schema';
import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';

export type InkeepUIMessage = UIMessage<
  never,
  {
    client: {
      location: string;
    };
  }
>;

const openai = createOpenAICompatible({
  name: 'inkeep',
  apiKey: process.env.INKEEP_API_KEY,
  baseURL: 'https://api.inkeep.com/v1',
});

export async function POST(req: Request, ctx: RouteContext<"/api/chat">) {
  const reqJson = await req.json();

  const result = streamText({
    model: openai('inkeep-qa-sonnet-4'),
    tools: {
      provideLinks: {
        inputSchema: ProvideLinksToolSchema,
      },
    },
    messages: await convertToModelMessages<InkeepUIMessage>(reqJson.messages, {
      ignoreIncompleteToolCalls: true,
      convertDataPart(part) {
        if (part.type === 'data-client')
          return {
            type: 'text',
            text: `[Client Context: ${JSON.stringify(part.data)}]`,
          };
      },
    }),
    toolChoice: 'auto',
  });

  return result.toUIMessageStreamResponse();
}