//import { notInAGame } from '../views/currentGameDisplay';

export async function getLiveData() {

    try {
        // Fetch the data from allgamedata.json for testing
        const response = await fetch('/test/allgamedata.json');
        
        // const response = await fetch("http://127.0.0.1:3000/liveclientdata/allgamedata", {
        //     headers: {
        //         "Content-Type": "application/json",
        //     },
        // });

        if (response.ok) {
            
            const newData = await response.json();
            //console.log("Fetched data:", newData); // Log the new data
            return newData;
        } else {
            console.error('Error fetching data:', response.status, response.statusText);
            return null;
        }
    } catch (error) {
        //console.error('Request failed:', error);
        notInAGame();
        return null;
    }
}