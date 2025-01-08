document.addEventListener('DOMContentLoaded', function() {
    const statsImg = document.getElementById('statsScreenshot');
    const statTypeInputs = document.querySelectorAll('input[name="statType"]');
    const displayModeInputs = document.querySelectorAll('input[name="displayMode"]');

    function updateScreenshot() {
        const statType = document.querySelector('input[name="statType"]:checked').value;
        const displayMode = document.querySelector('input[name="displayMode"]:checked').value;
        
        // Set opacity to 0 before changing
        statsImg.style.opacity = '0';
        
        // Update the image source after a short delay
        setTimeout(() => {
            statsImg.src = `./images/${statType}_${displayMode}.png`;
            statsImg.style.opacity = '1';
        }, 300);
    }

    // Add event listeners to all radio buttons
    statTypeInputs.forEach(input => {
        input.addEventListener('change', updateScreenshot);
    });

    displayModeInputs.forEach(input => {
        input.addEventListener('change', updateScreenshot);
    });

    // Initial load
    updateScreenshot();
});