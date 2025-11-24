//Java script for studentFly
document.addEventListener('DOMContentLoaded', function() {
    const searchForm= document.getElementById('flight-search-form');
    const resultsSection= document.getElementById('results-section');
    const flightResults= document.getElementById('flight-results');
    const loadingElement= document.getElementById('loading');
    const errorMessage= document.getElementById('error-message');

    // Setting a minimun date to today
    const today= new Date().toISOString().split('T')[0];
    document.getElementById('departure-date').setAttribute('min', today);
    document.getElementById('return-date').setAttribute('min', today);

    //Default date is tomorrow
    const tomorrow= new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    document.getElementById('departure-date').value= tomorrow.toISOString().split('T')[0];

    //Emoji animations
    const emojis= ['✈️', '🛫', '🛬', '🌍', '🧳', '🎓',];
    let emojiIndex= 0;

    function updateLoadingEmoji() {
        if (loadingElement.style.display !== 'none') {
            loadingElement.innerHTML = `🔍 ${emojis[emojiIndex]} Searching for student deals`;
            emojiIndex = (emojiIndex + 1) % emojis.length;
        }
    }
    setInterval(updateLoadingEmoji, 1500);

    searchForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const origin= document.getElementById('origin').value.trim();
        const destination= document.getElementById('destination').value.trim();
        const departureDate= document.getElementById('departure-date').value;
        const returnDate= document.getElementById('return-date').value;
        const passengers= document.getElementById('passengers').value;
        const budget= document.getElementById('budget').value;

        // Basic validation
        if (!origin || !destination || !departureDate) {
            showError('❌ Please fill in all required fields.');
            return;
        }

        if (origin.toLowerCase() === destination.toLowerCase()) {
            showError('❌ Origin and destination cannot be the same.');
            return;
        }
        
        //show loading
        loadingElement.style.display= 'block';
        flightResults.innerHTML= '';
        errorMessage.style.display= 'none';
        resultsSection.style.display= 'block';
        emojiIndex= 0;
        updateLoadingEmoji();

        // callling backend for real API
        setTimeout(async () => {
            try {
                const flights = await fetchFlightsFromBackend(origin, destination, departureDate, returnDate, passengers, budget);
                loadingElement.style.display = 'none';
                if (flights.length === 0) {
                    showError('😔 No flights found matching your criteria. Try different dates or destinations.');
                    return;
                }
                displayFlights(flights, passengers);
            } catch (error) {
                console.error('Backend API failed, using mock flights.', error);
                loadingElement.style.display = 'none';
                const mockFlights = generateMockFlights(origin, destination, departureDate, returnDate, passengers, budget);
                displayFlights(mockFlights, passengers);
            }
        }, 1000); 
    });
    
// Fetch flights from backend API
    async function fetchFlightsFromBackend(origin, destination, departureDate, returnDate, passengers, budget) {
        try {
            const url =`http://localhost:5001/api/flights?origin=${origin}&destination=${destination}&date=${departureDate}`;
            console.log('🛰 Calling backend:' + url);

            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Backend error: ${response.status}`);
            }

            const data = await response.json();

            //Check if we got an error from backend
            if (data.error) {
                throw new Error(data.message);
            }

            // Transforming API data to existing UI format
            const flights = data.map((f, i) => {
                const basePrice =Math.floor(Math.random() * 150) + 80;
                const studentPrice = Math.round(basePrice * 0.9);

                if (budget !== 'any' && studentPrice > parseInt(budget)) {
                    return null; 
                }

                return {
                    id: f.id || `FL${Date.now()}${i}`,
                    airline: f.airline || 'StudentAir',
                    airlineEmoji: getAirlineEmoji(f.airline),
                    airlineCode: f.airlineCode || 'SA',
                    flightNumber: f.flightNumber || `SA${Math.floor(Math.random() * 900) + 100}`,
                    price: studentPrice,
                    currency: 'USD',
                    departure: {
                        airport: f.departure?.airport || origin.toUpperCase(),
                        datetime: f.departure?.time || departureDate
                    },
                    arrival: {
                        airport: f.arrival?.airport || destination.toUpperCase(),
                        datetime: f.arrival?.time || departureDate
                    },
                    duration: f.duration || '2h 30m',
                    stops: f.stops || 0,
                    isCheapest: false
                };
            }).filter(flight => flight !== null); // Remove nulls entries

            flights.sort((a, b) => a.price - b.price);
            if (flights.length > 0) flights[0].isCheapest = true;
            return flights;
        } catch (error) {
            console.error('Backend fetch error:', error);
            throw error;
        }
    }

    function getAirlineEmoji(airlineName) {
        const emojiMap = {
            'StudentAir': '🎓',
            'BudgetFly': '💸',
            'EconoJet': '🛩️',
            'ValueWings': '🦅',
            'ThriftyTravel': '🌍'
        };

        return emojiMap[airlineName] || '✈️';
    }

    function displayFlights(flights, passengers) {
        flightResults.innerHTML = '';

        if (flights.length === 0) {
            showError('😔 No flights found matching your criteria. Try different dates or destinations.');
            return;
        }

        const resultsCount = document.createElement('div');
        resultsCount.style.marginBottom = '1.5rem';
        resultsCount.style.fontSize = '1.1rem';
        resultsCount.style.color = 'var(--lilac-dark)';
        resultsCount.innerHTML = `✨ Found ${flights.length} flight${flights.length !== 1 ? 's' : ''} for ${passengers} passenger${passengers !== '1' ? 's' : ''}.`;
        flightResults.appendChild(resultsCount);

        flights.forEach(flight => {
            const flightCard = document.createElement('div');
            flightCard.className = 'flight-card';

            const depDate = new Date(flight.departure.datetime);
            const arrDate = new Date(flight.arrival.datetime);
            const departureTime = depDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const arrivalTime = arrDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            const departureDateStr = depDate.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
            const stopText = flight.stops === 0 ? '🟠 Non-stop' : '🔴 1 stop';

            flightCard.innerHTML = `
                <div class="flight-header">
                    <div class="flight-route">
                        ${flight.departure.airport} ➔ ${flight.arrival.airport}
                        ${flight.isCheapest ? '<span class="cheap-tag">🏆 Best Deal</span>' : ''}
                    </div>   
                    <div class="flight-price">$${flight.price}</div>
                </div>
                <div class="flight-details">
                    <div class="flight-time">
                        <span class="detail-label"> 🛫Departure:</span> 
                        <span class="detail-value">${departureTime}</span> 
                        <span class="detail-label">${departureDateStr}</span>
                    </div>
                    <div class="flight-time">
                         <span class="detail-label"> 🛬Arrival:</span>
                         <span class="detail-value">${arrivalTime} </span>
                         <span class="detail-label">${stopText}</span>
                    </div>
                    <div class="flight-duration">
                        <span class="detail-label">⏳ Duration:</span>
                        <span class="detail-value">${flight.duration}</span>
                    </div>
                    <div class="flight-airline">
                        <span class="detail-label">${flight.airlineEmoji} Airline:</span>
                        <span class="detail-value">${flight.airline} </span>
                        <span class="detail-label">${flight.flightNumber}</span> 
                    </div>
                </div>
                <div style="margin-top: 10px; font-size: 0.9rem; color: var(--success); flex; justify-content: space-between; align-items: center;">
                    <span> ✅ Student discount applied!</span>
                    <button class="book-btn" onclick="bookFlight('${flight.id}')"> 📖 Book Now</button>
                </div>
            `;
            flightResults.appendChild(flightCard);
        });                              
        
    }

    function showError(message) {
        errorMessage.textContent = message;
        errorMessage.style.display = 'block';
        resultsSection.style.display = 'block';
        loadingElement.style.display = 'none';
    }

    const inputs = document.querySelectorAll('input, select');
    inputs.forEach (input => {
        input.addEventListener('focus', function(){
            this.style.backgroundColor= 'var(--lilac-light)';
        });
        input.addEventListener('blur', function(){
            this.style.backgroundColor= ''; 
        });
    }); 
});

//Global function for booking flights
function bookFlight(flightId) {
    alert(`You have booked flight ID: ${flightId}. Further booking steps will be implemented soon! ✈️🎓`);
}

//Mock data function
function generateMockFlights(origin, destination, departureDate, returnDate, passengers, budget) {
    const airlines = [
        { name: 'StudentAir', code: 'SA', emoji: '🎓' },
        { name: 'BudgetFly', code: 'BF', emoji: '💸' },
        { name: 'EconoJet', code: 'EJ', emoji: '🛩️' },
        { name: 'ValueWings', code: 'VW', emoji: '🦅' },
        { name: 'ThriftyTravel', code: 'TT', emoji: '🌍' }
    ];

    const flights = [];
    const numFlights = Math.floor(Math.random() * 5) + 3;

    for (let i = 0; i < numFlights; i++) {
        const chosenAirline = airlines[Math.floor(Math.random() * airlines.length)];
        const flightNumber = chosenAirline.code + (Math.floor(Math.random() * 900) + 100);

        let price = Math.floor(Math.random() * 150) + 80;
        price = Math.round(price * 0.9); // Student discount

        if (budget !== 'any' && price > parseInt(budget)) {
            continue;
        }

        const depDateObj = new Date(departureDate);
        depDateObj.setHours(Math.floor(Math.random() * 12) + 6);
        depDateObj.setMinutes(Math.floor(Math.random() * 60));
        const durationHours = Math.floor(Math.random() * 4) + 1;
        const durationMinutes = Math.floor(Math.random() * 60);
        const arrDateObj = new Date(depDateObj.getTime() + durationHours * 60 * 60 * 1000 + durationMinutes * 60 * 1000);

        flights.push({
            id: `FL${Date.now()}${i}`,
            airline: chosenAirline.name,
            airlineEmoji: chosenAirline.emoji,
            airlineCode: chosenAirline.code,
            flightNumber: flightNumber,
            price: price,
            currency: 'USD',
            departure: {
                airport: origin.toUpperCase(),
                datetime: depDateObj.toISOString()
            },
            arrival: {
                airport: destination.toUpperCase(),
                datetime: arrDateObj.toISOString()
            },
            duration: `${durationHours}h ${durationMinutes}m`,
            stops: Math.floor(Math.random() * 2),
            isCheapest: false
        });
    
    }

    flights.sort((a, b) => a.price - b.price);
    if (flights.length > 0) {
        flights[0].isCheapest = true;
    }

    return flights;
}

