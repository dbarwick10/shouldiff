export const getChartOptions = (stat, maxTimeInMinutes) => ({
    responsive: true,
    maintainAspectRatio: true,
    plugins: {
        title: { 
            display: true, 
            text: getChartTitle(stat),
            font: {
                size: 16,
                weight: 'bold'
            }
        },
        tooltip: {
            enabled: false,
            mode: 'nearest',
            intersect: false,
            callbacks: {
                label: function(context) {
                    return generateTooltipLabel(context, stat);
                }
            }
        },
        legend: {
            display: false,
            position: 'top'
        }
    },
    scales: {
        x: {
            type: 'linear',
            position: 'bottom',
            min: 0,
            max: maxTimeInMinutes,
            title: { 
                display: true, 
                text: stat === 'deathTimers' ? 'Time of Death (Minutes)' : 'Time (Minutes)',
                font: {
                    weight: 'bold'
                }
            },
            ticks: {
                callback: value => value.toFixed(0),
                stepSize: Math.max(1, Math.ceil(maxTimeInMinutes / 10))
            }
        },
        y: { 
            title: { 
                display: true, 
                text: getYAxisTitle(stat),
                font: {
                    weight: 'bold'
                }
            },
            beginAtZero: true,
            min: 0,
            suggestedMin: 0,
            ...(stat !== 'deathTimers' && stat !== 'kda' && stat !== 'gold' ? {
                ticks: { stepSize: 1 }
            } : {})
        }
    },
    animation: { duration: 0 }
});

function getChartTitle(stat) {
    switch(stat) {
        case 'deathTimers': return 'Time Spent Dead vs Time of Death';
        case 'kda': return 'KDA';
        case 'gold': return 'Gold Over Time';
        default: return capitalizeFirstLetter(stat) + ' Over Time';
    }
}

function getYAxisTitle(stat) {
    switch(stat) {
        case 'deathTimers': return 'Time Spent Dead (Seconds)';
        case 'kda': return 'KDA Ratio';
        case 'gold': return 'Total Gold';
        default: return `Total ${capitalizeFirstLetter(stat)}`;
    }
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function generateTooltipLabel(context, stat) {
    const label = context.dataset.label || '';
    const value = context.parsed.y;
    const time = context.parsed.x.toFixed(1);
    
    if (label.includes('Trend')) {
        const stats = calculateTrendlineStats(context.dataset.data);
        if (stats) {
            const rateOfChange = (stats.slope * 60).toFixed(2); // per minute
            return [
                `${label}: ${value.toFixed(2)} at ${time} min`,
                `Rate of change: ${rateOfChange} per minute`,
                `R² = ${stats.rSquared.toFixed(3)}`
            ];
        }
    }
    
    switch(stat) {
        case 'deathTimers':
            return `${label}: ${value.toFixed(1)}s at ${time} min`;
        case 'kda':
            return `${label}: ${value.toFixed(2)} at ${time} min`;
        case 'gold':
            return `${label}: ${value.toFixed(0)} gold at ${time} min`;
        default:
            return `${label}: ${value} at ${time} min`;
    }
}