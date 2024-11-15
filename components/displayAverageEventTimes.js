export async function displayAverageEventTimes(averageEventTimes) {

    // Define labels as the stat categories (kills, deaths, etc.)
    const labels = averageEventTimes.playerStats.kills.map((_, index) => `Kill ${index + 1}`);

    // Prepare datasets for player, team, and enemy stats
    const data = {
        labels: labels,  // Labels for each kill event
        datasets: [
            {
                label: 'Player Kills Time',
                data: averageEventTimes.playerStats.kills,  // Time for each kill event
                borderColor: 'rgba(255, 99, 132, 1)',
                backgroundColor: 'rgba(255, 99, 132, 0.2)',
                fill: true,
                tension: 0.3 // Smooth line curve
            },
            {
                label: 'Team Kills Time',
                data: averageEventTimes.teamStats.kills,  // Time for each team kill event
                borderColor: 'rgba(54, 162, 235, 1)',
                backgroundColor: 'rgba(54, 162, 235, 0.2)',
                fill: true,
                tension: 0.3
            },
            {
                label: 'Enemy Kills Time',
                data: averageEventTimes.enemyStats.kills,  // Time for each enemy kill event
                borderColor: 'rgba(75, 192, 192, 1)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                fill: true,
                tension: 0.3
            }
        ]
    };

    // Create the chart
    const canvas = document.getElementById('averageEventTimesChart');
    if (!canvas) {
        console.error('Canvas element not found');
        return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        console.error('Failed to get canvas context');
        return;
    }
    
        const averageEventTimesChart = new Chart(ctx, {
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
                text: 'Average Time Until Each Kill Event'
            }
        },
        scales: {
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Time (seconds)'
                }
            },
            x: {
                title: {
                    display: true,
                    text: 'Kill Count'
                }
            }
        }
    }
    });
}