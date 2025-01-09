import { initializeMobileMenu } from './shared.js';


document.addEventListener('DOMContentLoaded', function() {

    initializeMobileMenu();
    
    // Stats screenshot toggle functionality
    const statsImg = document.getElementById('statsScreenshot');
    const statTypeInputs = document.querySelectorAll('input[name="statType"]');
    const displayModeInputs = document.querySelectorAll('input[name="displayMode"]');

    function updateScreenshot() {
        const statType = document.querySelector('input[name="statType"]:checked').value;
        const displayMode = document.querySelector('input[name="displayMode"]:checked').value;
        
        statsImg.style.opacity = '0';
        
        setTimeout(() => {
            statsImg.src = `./images/${statType}_${displayMode}.png`;
            statsImg.style.opacity = '1';
        }, 300);
    }

    statTypeInputs.forEach(input => {
        input.addEventListener('change', updateScreenshot);
    });

    displayModeInputs.forEach(input => {
        input.addEventListener('change', updateScreenshot);
    });

    updateScreenshot();

    // Search functionality
    const fetchStatsButton = document.getElementById('fetchStatsButton');
    const summonerNameInput = document.getElementById('summonerName');
    const tagLineInput = document.getElementById('tagLine');
    // const regionSelect = document.getElementById('region');
    const gameModeSelect = document.getElementById('gameMode');

    function cleanTagline(tagline) {
        if (!tagline) return '';
        return tagline.replace(/^[#%23]+/, '');
    }

    fetchStatsButton.addEventListener('click', function() {
        const summonerName = encodeURIComponent(summonerNameInput.value.trim());
        const tagLine = encodeURIComponent(tagLineInput.value.trim());
        // const region = regionSelect.value;
        const gameMode = gameModeSelect.value;

        if (!summonerName || !tagLine) {
            alert('Please enter both Summoner Name and Tagline');
            return;
        }

        const cleanedTag = cleanTagline(tagLine);

        // Construct the URL with search parameters
        const searchParams = new URLSearchParams({
            summoner: summonerName,
            tag: cleanedTag,
            // region: region,
            mode: gameMode
        });

        // Redirect to index.html with search parameters
        window.location.href = `index.html?${searchParams.toString()}`;
    });

    // Optional: Enable enter key to trigger search
    const inputs = [summonerNameInput, tagLineInput];
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                fetchStatsButton.click();
            }
        });
    });
});