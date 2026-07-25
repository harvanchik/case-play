export type ConsentChoice = 'essential' | 'analytics' | 'all';
export type AnalyticsConsentMode = 'basic' | 'advanced';

export const CONSENT_STORAGE_KEY = 'caseplay_cookie_consent_v1';
export const CONSENT_EVENT = 'caseplay:consent-changed';
export const OPEN_CONSENT_EVENT = 'caseplay:open-consent';
export const ADSENSE_SCRIPT_ID = 'caseplay-adsense-script';
export const ADSENSE_PUBLISHER_ID = 'ca-pub-3425711717023232';
export const ANALYTICS_SCRIPT_ID = 'caseplay-google-analytics-script';
export const ANALYTICS_MEASUREMENT_ID = 'G-XSBHT3M6GY';
export const CONSENT_DURATION_MS = 365 * 24 * 60 * 60 * 1000;

type ConsentRecord = {
	choice: ConsentChoice;
	expiresAt: number;
};

type ConsentWindow = Window & {
	dataLayer?: unknown[];
	gtag?: (...args: unknown[]) => void;
	__caseplayConsentModeDefaulted?: boolean;
	adsbygoogle?: Record<string, unknown>[];
};

let adsenseLoadPromise: Promise<void> | null = null;
let analyticsLoadPromise: Promise<void> | null = null;
let lastTrackedPage = '';
let sessionConsent: ConsentChoice | null = null;

const gtag = function (...args: unknown[]) {
	const consentWindow = window as ConsentWindow;
	if (typeof consentWindow.gtag === 'function') {
		consentWindow.gtag(...args);
		return;
	}
	(consentWindow.dataLayer ??= []).push(arguments);
};

export const hasGlobalPrivacyControl = () =>
	typeof navigator !== 'undefined' && (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true;

export const readConsent = (): ConsentChoice | null => {
	if (typeof window === 'undefined') return null;
	try {
		const stored = window.localStorage.getItem(CONSENT_STORAGE_KEY);
		if (stored === 'all' || stored === 'analytics' || stored === 'essential') {
			writeConsentRecord(stored);
			return stored;
		}
		if (!stored) return sessionConsent;
		const record = JSON.parse(stored) as Partial<ConsentRecord>;
		if (
			(record.choice !== 'all' && record.choice !== 'analytics' && record.choice !== 'essential') ||
			typeof record.expiresAt !== 'number' ||
			record.expiresAt <= Date.now()
		) {
			window.localStorage.removeItem(CONSENT_STORAGE_KEY);
			sessionConsent = null;
			return null;
		}
		return record.choice;
	} catch {
		return sessionConsent;
	}
};

const writeConsentRecord = (choice: ConsentChoice) => {
	const record: ConsentRecord = { choice, expiresAt: Date.now() + CONSENT_DURATION_MS };
	window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
};

const consentState = (choice: ConsentChoice) => {
	return {
		analytics_storage: choice === 'all' || choice === 'analytics' ? 'granted' : 'denied',
		ad_storage: choice === 'all' ? 'granted' : 'denied',
		ad_user_data: choice === 'all' ? 'granted' : 'denied',
		ad_personalization: choice === 'all' ? 'granted' : 'denied'
	};
};

export const initializeConsentMode = () => {
	if (typeof window === 'undefined') return;
	const consentWindow = window as ConsentWindow;
	if (!consentWindow.__caseplayConsentModeDefaulted) {
		gtag('consent', 'default', { ...consentState('essential'), wait_for_update: 500 });
		gtag('set', 'ads_data_redaction', true);
		gtag('set', 'url_passthrough', false);
		consentWindow.__caseplayConsentModeDefaulted = true;
	}

	const storedChoice = readConsent();
	const effectiveChoice: ConsentChoice = storedChoice && !hasGlobalPrivacyControl() ? storedChoice : 'essential';
	gtag('consent', 'update', consentState(effectiveChoice));
	gtag('set', 'ads_data_redaction', effectiveChoice !== 'all');
	if (effectiveChoice === 'essential') clearGoogleTrackingCookies();
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

export const clearGoogleTrackingCookies = () => {
	if (typeof document === 'undefined') return;
	const cookieNames = document.cookie
		.split(';')
		.map((cookie) => cookie.trim().split('=')[0])
		.filter(
			(name) =>
				name === '_ga' ||
				name.startsWith('_ga_') ||
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

	gtag('consent', 'update', consentState(effectiveChoice));
	gtag('set', 'ads_data_redaction', effectiveChoice !== 'all');
	gtag('set', 'url_passthrough', false);
	if (effectiveChoice === 'essential') {
		lastTrackedPage = '';
		clearGoogleTrackingCookies();
	}
	window.dispatchEvent(new CustomEvent<ConsentChoice>(CONSENT_EVENT, { detail: effectiveChoice }));
};

export const openConsentChoices = () => {
	if (typeof window !== 'undefined') window.dispatchEvent(new Event(OPEN_CONSENT_EVENT));
};

export const canLoadAdvertising = () => readConsent() === 'all' && !hasGlobalPrivacyControl();
export const hasAnalyticsConsent = () => {
	const choice = readConsent();
	return (choice === 'analytics' || choice === 'all') && !hasGlobalPrivacyControl();
};
export const canLoadAnalytics = (mode: AnalyticsConsentMode = 'basic') =>
	!hasGlobalPrivacyControl() && (hasAnalyticsConsent() || mode === 'advanced');

export const loadGoogleAnalytics = (mode: AnalyticsConsentMode = 'basic') => {
	if (typeof window === 'undefined' || !canLoadAnalytics(mode)) return Promise.resolve();
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

export const trackGoogleAnalyticsPageView = async (url: URL, mode: AnalyticsConsentMode = 'basic') => {
	if (!canLoadAnalytics(mode)) return;
	const pageKey = `${url.pathname}${url.search}${url.hash}`;
	if (pageKey === lastTrackedPage) return;
	await loadGoogleAnalytics(mode);
	if (!canLoadAnalytics(mode) || pageKey === lastTrackedPage) return;
	lastTrackedPage = pageKey;
	const analyticsAllowed = hasAnalyticsConsent();
	const pageLocation = analyticsAllowed ? url.href : `${url.origin}${url.pathname}`;
	gtag('event', 'page_view', {
		page_title: document.title,
		page_location: pageLocation,
		page_path: analyticsAllowed ? `${url.pathname}${url.search}` : url.pathname,
		page_referrer: analyticsAllowed ? document.referrer : ''
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
