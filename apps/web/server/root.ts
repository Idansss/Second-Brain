import { router } from "./trpc";
import { notesRouter } from "./routers/notes";
import { tasksRouter } from "./routers/tasks";
import { chatRouter } from "./routers/chat";
import { entitiesRouter } from "./routers/entities";
import { settingsRouter } from "./routers/settings";
import { digestRouter } from "./routers/digest";
import { collectionsRouter } from "./routers/collections";
import { intelligenceRouter } from "./routers/intelligence";
import { sharingRouter } from "./routers/sharing";
import { apiTokensRouter } from "./routers/apiTokens";
import { webhooksRouter } from "./routers/webhooks";

export const appRouter = router({
  notes: notesRouter,
  tasks: tasksRouter,
  chat: chatRouter,
  entities: entitiesRouter,
  settings: settingsRouter,
  digest: digestRouter,
  collections: collectionsRouter,
  intelligence: intelligenceRouter,
  sharing: sharingRouter,
  apiTokens: apiTokensRouter,
  webhooks: webhooksRouter,
});

export type AppRouter = typeof appRouter;
