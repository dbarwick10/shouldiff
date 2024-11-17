let averageEventTimesChart; // Declare a variable to hold the chart instance

export async function displayAverageEventTimes(averageEventTimes) {
    const dropdown = document.getElementById('statSelector');

    // Add an event listener to the dropdown
    dropdown.addEventListener('change', () => {
        const selectedStat = dropdown.value; // Get the selected stat
        updateChart(selectedStat, averageEventTimes);
    });

    // Initialize the chart with the default stat (e.g., "kills")
    updateChart('kills', averageEventTimes);
}

function updateChart(stat, averageEventTimes) {
    // Dynamically generate labels based on the selected stat's data length
    const statKeys = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];
    const maxEventCount = Math.max(
        ...statKeys.map(key => averageEventTimes.playerStats[key][stat]?.length || 0)
    );
    const labels = Array.from({ length: maxEventCount }, (_, index) => `${stat.charAt(0).toUpperCase() + stat.slice(1)} ${index + 1}`);

    // Prepare datasets for the selected stat
    const data = {
        labels: labels,
        datasets: [
            {
                label: `Player ${stat.charAt(0).toUpperCase() + stat.slice(1)} Time (Wins)`,
                data: averageEventTimes.playerStats.wins[stat],
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.3
            },
            {
                label: `Player ${stat.charAt(0).toUpperCase() + stat.slice(1)} Time (Losses)`,
                data: averageEventTimes.playerStats.losses[stat],
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true,
                tension: 0.3
            },
            {
                label: `Player ${stat.charAt(0).toUpperCase() + stat.slice(1)} Time (Surrender Wins)`,
                data: averageEventTimes.playerStats.surrenderWins[stat],
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true,
                tension: 0.3
            },
            {
                label: `Player ${stat.charAt(0).toUpperCase() + stat.slice(1)} Time (Surrender Losses)`,
                data: averageEventTimes.playerStats.surrenderLosses[stat],
                borderColor: 'rgba(255, 206, 86, 1)',
                backgroundColor: 'rgba(255, 206, 86, 0.2)',
                fill: true,
                tension: 0.3
            }
        ]
    };

    // Destroy the existing chart if it exists
    const canvas = document.getElementById('averageEventTimesChart');
    const ctx = canvas.getContext('2d');
    if (averageEventTimesChart) {
        averageEventTimesChart.destroy();
    }

    // Create a new chart with the selected stat
    averageEventTimesChart = new Chart(ctx, {
        type: 'line',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: `Average Time Until Each ${stat.charAt(0).toUpperCase() + stat.slice(1)} Event`
                }
            },
            scales: {
                y: {
                    type: 'linear',
                    position: 'bottom',
                    title: {
                        display: true,
                        text: 'Time (seconds)'
                    }
                },
                x: {
                    type: 'category',
                    title: {
                        display: true,
                        text: `${stat.charAt(0).toUpperCase() + stat.slice(1)} Index`
                    }
                }
            }
        }
    });
}
