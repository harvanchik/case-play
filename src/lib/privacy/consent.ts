export type ConsentChoice = 'essential' | 'all';

export const CONSENT_STORAGE_KEY = 'caseplay_cookie_consent_v1';
export const CONSENT_EVENT = 'caseplay:consent-changed';
export const OPEN_CONSENT_EVENT = 'caseplay:open-consent';
export const ADSENSE_SCRIPT_ID = 'caseplay-adsense-script';
export const ADSENSE_PUBLISHER_ID = 'ca-pub-3425711717023232';
export const ANALYTICS_SCRIPT_ID = 'caseplay-google-analytics-script';
export const ANALYTICS_MEASUREMENT_ID = 'G-XSBHT3M6GY';

type ConsentWindow = Window & {
	dataLayer?: unknown[];
	adsbygoogle?: Record<string, unknown>[];
	googlefc?: {
		callbackQueue?: Array<() => void>;
		showRevocationMessage?: () => void;
	};
};

let adsenseLoadPromise: Promise<void> | null = null;
let analyticsLoadPromise: Promise<void> | null = null;
let lastTrackedPage = '';

const gtag = (...args: unknown[]) => {
	const consentWindow = window as ConsentWindow;
	(consentWindow.dataLayer ??= []).push(args);
};

export const hasGlobalPrivacyControl = () =>
	typeof navigator !== 'undefined' && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

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
		analytics_storage: 'denied',
		wait_for_update: 500
	});

	if (readConsent() === 'all' && !hasGlobalPrivacyControl()) {
		gtag('consent', 'update', {
			analytics_storage: 'granted'
		});
	} else {
		clearGoogleAnalyticsCookies();
	}
};

const expireCookie = (name: string, domain?: string) => {
	const domainAttribute = domain ? `; Domain=${domain}` : '';
	document.cookie = `${encodeURIComponent(name)}=; Max-Age=0; Path=/${domainAttribute}; SameSite=Lax`;
};

export const clearGoogleAnalyticsCookies = () => {
	if (typeof document === 'undefined') return;
	const cookieNames = document.cookie
		.split(';')
		.map((cookie) => cookie.trim().split('=')[0])
		.filter((name) => name === '_ga' || name.startsWith('_ga_'));

	for (const name of cookieNames) {
		expireCookie(name);
		expireCookie(name, window.location.hostname);
		if (window.location.hostname.endsWith('caseplay.org')) expireCookie(name, '.caseplay.org');
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
		analytics_storage: granted
	});
	if (effectiveChoice === 'essential') clearGoogleAnalyticsCookies();
	window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: effectiveChoice }));
};

export const openConsentChoices = () => {
	if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
};

export const openAdPrivacyChoices = () => {
	if (typeof window === 'undefined') return;
	const consentWindow = window as ConsentWindow;
	const googlefc = (consentWindow.googlefc ??= {});
	const callbackQueue = (googlefc.callbackQueue ??= []);
	if (googlefc.showRevocationMessage) callbackQueue.push(googlefc.showRevocationMessage);
};

export const canLoadAdvertising = () => typeof window !== 'undefined';
export const canLoadAnalytics = () => readConsent() === 'all' && !hasGlobalPrivacyControl();

export const loadGoogleAnalytics = () => {
	if (typeof window === 'undefined' || !canLoadAnalytics()) return Promise.resolve();
	if (analyticsLoadPromise) return analyticsLoadPromise;

	gtag('js', new Date());
	gtag('config', ANALYTICS_MEASUREMENT_ID, {
		allow_google_signals: false,
		allow_ad_personalization_signals: false,
		cookie_expires: 31_536_000,
		send_page_view: false
	});

	analyticsLoadPromise = new Promise<void>((resolve, reject) => {
		const existing = document.getElementById(ANALYTICS_SCRIPT_ID) as HTMLScriptElement | null;
		if (existing) {
			if (existing.dataset.loaded === 'true') resolve();
			else {
				existing.addEventListener('load', () => resolve(), { once: true });
				existing.addEventListener('error', () => reject(new Error('Google Analytics failed to load.')), { once: true });
			}
			return;
		}

		const script = document.createElement('script');
		script.id = ANALYTICS_SCRIPT_ID;
		script.async = true;
		script.src = `https://www.googletagmanager.com/gtag/js?id=${ANALYTICS_MEASUREMENT_ID}`;
		script.addEventListener(
			'load',
			() => {
				script.dataset.loaded = 'true';
				resolve();
			},
			{ once: true }
		);
		script.addEventListener('error', () => reject(new Error('Google Analytics failed to load.')), { once: true });
		document.head.appendChild(script);
	});

	return analyticsLoadPromise;
};

export const trackGoogleAnalyticsPageView = async (url: URL) => {
	if (!canLoadAnalytics()) return;
	const pageKey = `${url.pathname}${url.search}${url.hash}`;
	if (pageKey === lastTrackedPage) return;
	await loadGoogleAnalytics();
	if (!canLoadAnalytics() || pageKey === lastTrackedPage) return;
	lastTrackedPage = pageKey;
	gtag('event', 'page_view', {
		page_title: document.title,
		page_location: url.href,
		page_path: `${url.pathname}${url.search}`
	});
};

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
