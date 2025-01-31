// client/js/cookieConsent.js
export function initializeCookieConsent() {
    const acceptButton = document.getElementById('accept-cookies');
    const rejectButton = document.getElementById('reject-cookies');
    const banner = document.getElementById('cookie-consent');

    // Only set up listeners if elements exist
    if (acceptButton && rejectButton && banner) {
        acceptButton.addEventListener('click', function() {
            localStorage.setItem('cookieConsent', 'accepted');
            banner.style.display = 'none';
            loadGoogleAnalytics();
        });

        rejectButton.addEventListener('click', function() {
            localStorage.setItem('cookieConsent', 'rejected');
            banner.style.display = 'none';
        });

        // Show banner if no consent is stored
        if (!localStorage.getItem('cookieConsent')) {
            banner.style.display = 'block';
        }
    }
}

export function loadGoogleAnalytics() {
    if (localStorage.getItem('cookieConsent') === 'accepted') {
        const script = document.createElement('script');
        script.async = true;
        script.src = 'https://www.googletagmanager.com/gtag/js?id=G-JVVLV3M1D6';
        document.head.appendChild(script);

        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', 'G-JVVLV3M1D6');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCookieConsent);
} else {
    initializeCookieConsent();
}

// Load analytics if already accepted
if (localStorage.getItem('cookieConsent') === 'accepted') {
    loadGoogleAnalytics();
}