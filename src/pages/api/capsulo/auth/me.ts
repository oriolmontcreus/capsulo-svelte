import { getCurrentUser } from "$lib/server/auth";
import { handle, json } from "$lib/server/http";

export const prerender = false;

export const GET = handle(async (context) => json({ user: await getCurrentUser(context) }));
