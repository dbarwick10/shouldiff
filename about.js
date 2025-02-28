import { initializeMobileMenu } from './shared.js';

document.addEventListener('DOMContentLoaded', function() {

    initializeMobileMenu();
    
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

    const fetchStatsButton = document.getElementById('fetchStatsButton');
    const summonerNameInput = document.getElementById('summonerName');
    const tagLineInput = document.getElementById('tagLine');
    const gameModeSelect = document.getElementById('gameMode');

    function cleanTagline(tagline) {
        if (!tagline) return '';
        // First remove leading hash character if present
        tagline = tagline.replace(/^#/, '');
        
        // Check if this is a URL-encoded string that needs decoding
        if (tagline.match(/%[0-9A-F]{2}/i)) {
            try {
                return decodeURIComponent(tagline);
            } catch (e) {
                console.error('Error decoding tagline:', e);
                return tagline;
            }
        }
        
        return tagline;
    }

    fetchStatsButton.addEventListener('click', function() {
        const summonerName = summonerNameInput.value.trim();
        const tagLine = tagLineInput.value.trim();
        const gameMode = gameModeSelect.value;

        if (!summonerName || !tagLine) {
            alert('Please enter both Summoner Name and Tagline');
            return;
        }

        const cleanedTag = cleanTagline(tagLine);

        const searchParams = new URLSearchParams({
            summoner: summonerName,
            tag: cleanedTag,
            mode: gameMode
        });

        window.location.href = `index.html?${searchParams.toString()}`;
    });

    const inputs = [summonerNameInput, tagLineInput];
    inputs.forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                fetchStatsButton.click();
            }
        });
    });
});