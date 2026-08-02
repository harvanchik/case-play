import { applyAction, deserialize } from '$app/forms';
import { invalidateAll } from '$app/navigation';

type NamedActionFormOptions = string | { name: string; resetOnSuccess?: boolean };

/** Runs a SvelteKit named action in the background without changing the visible URL or reloading the page. */
export const namedActionForm = (form: HTMLFormElement, initialOptions: NamedActionFormOptions) => {
	let options = typeof initialOptions === 'string' ? { name: initialOptions, resetOnSuccess: false } : initialOptions;
	let submitting = false;

	const submit = async (event: SubmitEvent) => {
		event.preventDefault();
		if (submitting) return;
		submitting = true;
		form.setAttribute('aria-busy', 'true');
		try {
			const body = new FormData(form);
			const submitter = event.submitter;
			if (submitter instanceof HTMLButtonElement && submitter.name) body.append(submitter.name, submitter.value);
			const response = await fetch(`?/${encodeURIComponent(options.name)}`, {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await response.text());
			if (result.type === 'redirect') {
				const destination = new URL(result.location, window.location.href);
				if (destination.pathname === window.location.pathname) {
					if (options.resetOnSuccess) form.reset();
					await invalidateAll();
				} else {
					await applyAction(result);
				}
			} else {
				await applyAction(result);
				if (result.type === 'success') {
					if (options.resetOnSuccess) form.reset();
					await invalidateAll();
				}
			}
		} catch {
			form.dispatchEvent(new CustomEvent('namedactionerror'));
		} finally {
			submitting = false;
			form.removeAttribute('aria-busy');
		}
	};

	form.addEventListener('submit', submit);
	return {
		update(nextOptions: NamedActionFormOptions) {
			options = typeof nextOptions === 'string' ? { name: nextOptions, resetOnSuccess: false } : nextOptions;
		},
		destroy() {
			form.removeEventListener('submit', submit);
		}
	};
};
