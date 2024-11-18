export async function displayAverageEventTimes(averageEventTimes, liveStatsPromise) {
    const dropdown = document.getElementById('statSelector');
    let chart, liveStatsInterval;

    const statOptions = ['kills', 'deaths', 'assists'];
    const statKeys = ['wins', 'losses', 'surrenderWins', 'surrenderLosses'];

    const capitalizeFirstLetter = (string) => string.charAt(0).toUpperCase() + string.slice(1);

    dropdown.innerHTML = '';
    statOptions.forEach(stat => {
        const option = document.createElement('option');
        option.value = stat;
        option.textContent = capitalizeFirstLetter(stat);
        dropdown.appendChild(option);
    });

    async function updateChart(selectedStat, liveStats = null) {
        const maxEventCount = Math.max(
            ...statKeys.map(key => averageEventTimes.playerStats[key][selectedStat]?.length || 0)
        );

        const labels = Array.from(
            { length: maxEventCount },
            (_, i) => `${capitalizeFirstLetter(selectedStat)} ${i + 1}`
        );

        const datasets = statKeys.map((key, index) => ({
            label: `Historical ${selectedStat} (${key})`,
            data: averageEventTimes.playerStats[key][selectedStat] || [],
            borderColor: `rgba(${index * 50}, ${255 - index * 50}, ${index * 100}, 1)`,
            backgroundColor: `rgba(${index * 50}, ${255 - index * 50}, ${index * 100}, 0.2)`,
            fill: true,
            tension: 0.3,
        }));

        // Add live stats dataset only if liveStats exists
        if (liveStats) {
            const liveDataset = {
                label: `Current Game ${selectedStat}`,
                data: liveStats[selectedStat] || [],
                borderColor: 'rgba(0, 255, 0, 1)',
                backgroundColor: 'rgba(0, 255, 0, 0.2)',
                fill: true,
                tension: 0.3,
            };
            datasets.push(liveDataset);
        }

        const ctx = document.getElementById('averageEventTimesChart').getContext('2d');
        if (chart) chart.destroy();

        chart = new Chart(ctx, {
            type: 'line',
            data: { labels, datasets },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' },
                    title: { display: true, text: `Historical vs Live ${capitalizeFirstLetter(selectedStat)} Times` },
                },
                scales: {
                    y: { beginAtZero: true, title: { display: true, text: 'Time (seconds)' } },
                },
                animation: { duration: 0 },
            },
        });

        // Set up live stats interval only if liveStats is defined
        if (liveStats) {
            if (liveStatsInterval) clearInterval(liveStatsInterval);

            liveStatsInterval = setInterval(async () => {
                try {
                    const liveData = await getLiveData();
                    if (liveData?.events) {
                        const updatedLiveStats = await calculateLiveStats(liveData.events);
                        chart.data.datasets[datasets.length - 1].data = updatedLiveStats[selectedStat];

                        if (updatedLiveStats[selectedStat].length > chart.data.labels.length) {
                            chart.data.labels = Array.from(
                                { length: updatedLiveStats[selectedStat].length },
                                (_, i) => `${capitalizeFirstLetter(selectedStat)} ${i + 1}`
                            );
                        }

                        chart.update('none');
                    }
                } catch (error) {
                    console.error('Error updating live stats:', error);
                    clearInterval(liveStatsInterval);
                }
            }, FETCH_INTERVAL_MS);
        }
    }

    try {
        const initialLiveStats = liveStatsPromise ? await liveStatsPromise : null;
        dropdown.addEventListener('change', (e) => updateChart(e.target.value, initialLiveStats));
        dropdown.value = 'kills';
        updateChart('kills', initialLiveStats);
    } catch (error) {
        console.error('Error initializing live stats:', error);
    }

    return { updateChart };
}
