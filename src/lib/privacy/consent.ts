export type ConsentChoice = 'essential' | 'all';

export const CONSENT_STORAGE_KEY = 'caseplay_cookie_consent_v1';
export const CONSENT_EVENT = 'caseplay:consent-changed';
export const OPEN_CONSENT_EVENT = 'caseplay:open-consent';
export const ADSENSE_SCRIPT_ID = 'caseplay-adsense-script';
export const ADSENSE_PUBLISHER_ID = 'ca-pub-3425711717023232';
export const CONSENT_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

type ConsentRecord = {
	choice: ConsentChoice;
	expiresAt: number;
};

type ConsentWindow = Window & {
	adsbygoogle?: Record<string, unknown>[] & {
		requestNonPersonalizedAds?: number;
	};
	googlefc?: {
		callbackQueue?: Array<() => void>;
		showRevocationMessage?: () => void;
	};
};

let adsenseLoadPromise: Promise<void> | null = null;
let sessionConsent: ConsentChoice | null = null;

export const hasGlobalPrivacyControl = () =>
	typeof navigator !== 'undefined' && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

const writeConsentRecord = (choice: ConsentChoice) => {
	const record: ConsentRecord = { choice, expiresAt: Date.now() + CONSENT_DURATION_MS };
	window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
};

export const readConsent = (): ConsentChoice | null => {
	if (typeof window === 'undefined') return null;
	try {
		const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
		if (stored === 'all' || stored === 'essential') {
			writeConsentRecord(stored);
			return stored;
		}
		if (stored === 'analytics') {
			writeConsentRecord('essential');
			return 'essential';
		}
		if (!stored) return sessionConsent;
		const record = JSON.parse(stored) as { choice?: unknown; expiresAt?: unknown };
		if (record.choice === 'analytics' && typeof record.expiresAt === 'number' && record.expiresAt > Date.now()) {
			writeConsentRecord('essential');
			return 'essential';
		}
		if (
			(record.choice !== 'all' && record.choice !== 'essential') ||
			typeof record.expiresAt !== 'number' ||
			record.expiresAt <= Date.now()
		) {
			window.localStorage.removeItem(CONSENT_STORAGE_KEY);
			sessionConsent = null;
			return null;
		}
		return record.choice as ConsentChoice;
	} catch {
		return sessionConsent;
	}
};

const expireCookie = (name: string, domain?: string) => {
	const domainAttribute = domain ? `; Domain=${domain}` : '';
	document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=/${domainAttribute}; SameSite=Lax`;
};

const clearAdvertisingCookies = () => {
	if (typeof document === 'undefined') return;
	const cookieNames = document.cookie
		.split(';')
		.map((cookie) => cookie.trim().split('=')[0])
		.filter(
			(name) =>
				name.startsWith('_gcl_') ||
				name === '__gads' ||
				name === '__gpi' ||
				name === '__eoi' ||
				name === 'IDE' ||
				name === 'DSID' ||
				name === 'FLC'
		);

	for (const name of cookieNames) {
		expireCookie(name);
		expireCookie(name, window.location.hostname);
		if (window.location.hostname.endsWith('caseplay.org')) expireCookie(name, '.caseplay.org');
	}
};

export const saveConsent = (choice: ConsentChoice) => {
	if (typeof window === 'undefined') return;
	const effectiveChoice: ConsentChoice = hasGlobalPrivacyControl() ? 'essential' : choice;
	sessionConsent = effectiveChoice;
	try {
		writeConsentRecord(effectiveChoice);
	} catch {
		// The preference remains active for this page even if browser storage is unavailable.
	}

	if (effectiveChoice === 'essential') clearAdvertisingCookies();
	window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: effectiveChoice }));
};

export const initializeConsent = () => {
	if (typeof window === 'undefined') return;
	const storedChoice = readConsent();
	if (hasGlobalPrivacyControl() && storedChoice === 'all') {
		saveConsent('essential');
		return;
	}
	if (storedChoice === 'essential') clearAdvertisingCookies();
};

export const openConsentChoices = () => {
	if (typeof window === 'undefined') return;
	if (googleCmpHandlesRegion()) {
		const consentWindow = window as ConsentWindow;
		(consentWindow.googlefc ??= {}).callbackQueue ??= [];
		consentWindow.googlefc.callbackQueue.push(() => consentWindow.googlefc?.showRevocationMessage?.());
		return;
	}
	window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
};

const googleCmpHandlesRegion = () =>
	typeof document !== 'undefined' &&
	document.querySelector<HTMLMetaElement>('meta[name="caseplay-google-cmp-required"]')?.content === 'true';

export const canLoadAdvertising = () => googleCmpHandlesRegion() || readConsent() !== null;

export const shouldRestrictAdDataProcessing = () =>
	!googleCmpHandlesRegion() && (readConsent() === 'essential' || hasGlobalPrivacyControl());

const configureAdPrivacy = () => {
	if (typeof window === 'undefined') return;
	const choice = readConsent();
	const adsbygoogle = ((window as ConsentWindow).adsbygoogle ??= []);
	if (choice === 'essential' || hasGlobalPrivacyControl()) adsbygoogle.requestNonPersonalizedAds = 1;
	else if (choice === 'all') adsbygoogle.requestNonPersonalizedAds = 0;
};

export const requestAd = () => {
	if (typeof window === 'undefined' || !canLoadAdvertising()) return;
	configureAdPrivacy();
	const choice = readConsent();
	const request =
		choice === 'essential' || hasGlobalPrivacyControl()
			? { params: { google_privacy_treatments: 'disablePersonalization' } }
			: {};
	((window as ConsentWindow).adsbygoogle ??= []).push(request);
};

export const loadAdSense = () => {
	if (typeof window === 'undefined' || !canLoadAdvertising()) return Promise.resolve();
	configureAdPrivacy();
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
