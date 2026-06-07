import type { Editor } from "@tiptap/core";
import { createSubscriber } from "svelte/reactivity";

const editorSubscriberCache = new WeakMap<Editor, Editor>();

export function createReactiveEditor(instance: Editor): Editor {
	const cached = editorSubscriberCache.get(instance);
	if (cached) return cached;

	const subscribe = createSubscriber((update) => {
		instance.on("transaction", update);
		return () => instance.off("transaction", update);
	});

	const proxy = new Proxy(instance, {
		get(target, prop, receiver) {
			subscribe();
			return Reflect.get(target, prop, receiver);
		}
	});

	editorSubscriberCache.set(instance, proxy as Editor);
	return proxy as Editor;
}
