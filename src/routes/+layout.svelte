<script>
	import '../app.css';
	import CookieConsent from '$lib/components/CookieConsent.svelte';
	import GoogleAnalytics from '$lib/components/GoogleAnalytics.svelte';
</script>

<slot />
<CookieConsent />
<GoogleAnalytics />
