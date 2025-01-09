export function initializeMobileMenu() {
    const mobileMenuButton = document.querySelector('.mobile-menu-button');
    const headerLinksContainer = document.querySelector('.header-links-container');

    if (!mobileMenuButton || !headerLinksContainer) return;

    mobileMenuButton.addEventListener('click', () => {
        headerLinksContainer.classList.toggle('open');
    });

    document.addEventListener('click', (event) => {
        if (!event.target.closest('.mobile-menu-button') && 
            !event.target.closest('.header-links-container')) {
            headerLinksContainer.classList.remove('open');
        }
    });

    const headerLinks = document.querySelectorAll('.header-links');
    headerLinks.forEach(link => {
        link.addEventListener('click', () => {
            headerLinksContainer.classList.remove('open');
        });
    });
}
