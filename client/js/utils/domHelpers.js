import { hasDataForOutcome } from './dataHelpers.js';


export function toggleChartVisibility(stat, visible) {
    const container = document.getElementById(`${stat}Chart`)?.parentElement;
    if (container) {
        container.style.display = visible ? 'block' : 'none';
    }

    const legend = document.querySelector('.chart-legend');
    const chartContainer = document.querySelector('.chart-container');
    
    if (legend) legend.style.display = 'flex';
    if (chartContainer) chartContainer.style.display = 'grid';
}

export function updateLegendVisibility(currentCategory, averageEventTimes, currentLiveStats, previousGameStats) {
    const hasWins = hasDataForOutcome(averageEventTimes, currentCategory, 'wins');
    const hasLosses = hasDataForOutcome(averageEventTimes, currentCategory, 'losses');
    const hasSurrenderWins = hasDataForOutcome(averageEventTimes, currentCategory, 'surrenderWins');
    const hasSurrenderLosses = hasDataForOutcome(averageEventTimes, currentCategory, 'surrenderLosses');
    const hasCurrentGame = currentLiveStats && Object.keys(currentLiveStats).length > 0;
    const hasPreviousGame = previousGameStats && Object.keys(previousGameStats).length > 0;

    const elements = {
        wins: document.querySelector('.legend-item.wins'),
        losses: document.querySelector('.legend-item.losses'),
        surrenderWins: document.querySelector('.legend-item.surrender-wins'),
        surrenderLosses: document.querySelector('.legend-item.surrender-losses'),
        currentGame: document.querySelector('.legend-item.current-game'),
        previousGame: document.querySelector('.legend-item.previous-game')
    };

    const visibility = {
        wins: hasWins,
        losses: hasLosses,
        surrenderWins: hasSurrenderWins,
        surrenderLosses: hasSurrenderLosses,
        currentGame: hasCurrentGame,
        previousGame: hasPreviousGame
    };

    Object.entries(elements).forEach(([key, element]) => {
        if (element) {
            element.style.display = visibility[key] ? 'flex' : 'none';
        }
    });

    const legendSection = document.querySelector('.chart-legend');
    const hasAnyData = Object.values(visibility).some(Boolean);
    if (legendSection) {
        legendSection.style.display = hasAnyData ? 'flex' : 'none';
    }
}