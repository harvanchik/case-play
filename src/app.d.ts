// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			user: {
				id: string;
				email: string;
				role: 'admin' | 'user';
				createdAt: string;
				updatedAt: string;
			} | null;
			accountUser: {
				id: string;
				email: string;
				firstName: string;
				lastName: string;
			} | null;
		}
		interface PageData {
			accountUser?: { signedIn: true } | null;
			accountCsrfToken?: string | null;
		}
		// interface Platform {}
	}
}

export {};
