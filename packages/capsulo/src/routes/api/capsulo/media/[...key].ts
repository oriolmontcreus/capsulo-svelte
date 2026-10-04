import { handle, json } from "$lib/server/http";
import { readUpload } from "$lib/server/uploads";

export const prerender = false;

/**
 * Public: serves uploaded files to the admin and the build. Visitors of the public site
 * get the copies baked into the static build (`/uploads/<key>`), which cost nothing.
 */
export const GET = handle(async ({ params }) => {
	const response = params.key ? await readUpload(params.key) : null;
	return response ?? json({ error: "Not found." }, { status: 404 });
});
