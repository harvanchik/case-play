export type ConsentChoice = 'essential' | 'all';

export const CONSENT_STORAGE_KEY = 'caseplay_cookie_consent_v1';
export const CONSENT_EVENT = 'caseplay:consent-changed';
export const OPEN_CONSENT_EVENT = 'caseplay:open-consent';
export const ADSENSE_SCRIPT_ID = 'caseplay-adsense-script';
export const ADSENSE_PUBLISHER_ID = 'ca-pub-3425711717023232';

type ConsentWindow = Window & {
	dataLayer?: unknown[];
	adsbygoogle?: Record<string, unknown>[];
};

let adsenseLoadPromise: Promise<void> | null = null;

const gtag = (...args: unknown[]) => {
	const consentWindow = window as ConsentWindow;
	(consentWindow.dataLayer ??= []).push(args);
};

export const hasGlobalPrivacyControl = () =>
	typeof navigator !== 'undefined' &&
	(navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

export const readConsent = (): ConsentChoice | null => {
	if (typeof window === 'undefined') return null;
	try {
		const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
		return stored === 'all' || stored === 'essential' ? stored : null;
	} catch {
		return null;
	}
};

export const initializeConsentMode = () => {
	if (typeof window === 'undefined') return;
	gtag('consent', 'default', {
		ad_storage: 'denied',
		ad_user_data: 'denied',
		ad_personalization: 'denied',
		analytics_storage: 'denied',
		wait_for_update: 500
	});

	if (readConsent() === 'all' && !hasGlobalPrivacyControl()) {
		gtag('consent', 'update', {
			ad_storage: 'granted',
			ad_user_data: 'granted',
			ad_personalization: 'granted',
			analytics_storage: 'granted'
		});
	}
};

export const saveConsent = (choice: ConsentChoice) => {
	if (typeof window === 'undefined') return;
	const effectiveChoice: ConsentChoice = hasGlobalPrivacyControl() ? 'essential' : choice;
	try {
		window.localStorage.setItem(CONSENT_STORAGE_KEY, effectiveChoice);
	} catch {
		// The preference remains active for this page even if browser storage is unavailable.
	}

	const granted = effectiveChoice === 'all' ? 'granted' : 'denied';
	gtag('consent', 'update', {
		ad_storage: granted,
		ad_user_data: granted,
		ad_personalization: granted,
		analytics_storage: granted
	});
	window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: effectiveChoice }));
};

export const openConsentChoices = () => {
	if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
};

export const canLoadAdvertising = () => readConsent() === 'all' && !hasGlobalPrivacyControl();

export const loadAdSense = () => {
	if (typeof window === 'undefined' || !canLoadAdvertising()) return Promise.resolve();
	if (adsenseLoadPromise) return adsenseLoadPromise;

	adsenseLoadPromise = new Promise<void>((resolve, reject) => {
		const existing = document.getElementById(ADSENSE_SCRIPT_ID) as HTMLScriptElement | null;
		if (existing) {
			if (existing.dataset.loaded === 'true') resolve();
			else {
				existing.addEventListener('load', () => resolve(), { once: true });
				existing.addEventListener('error', () => reject(new Error('AdSense failed to load.')), { once: true });
			}
			return;
		}

		const script = document.createElement('script');
		script.id = ADSENSE_SCRIPT_ID;
		script.async = true;
		script.crossOrigin = 'anonymous';
		script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_PUBLISHER_ID}`;
		script.addEventListener(
			'load',
			() => {
				script.dataset.loaded = 'true';
				resolve();
			},
			{ once: true }
		);
		script.addEventListener('error', () => reject(new Error('AdSense failed to load.')), { once: true });
		document.head.appendChild(script);
	});

	return adsenseLoadPromise;
};
