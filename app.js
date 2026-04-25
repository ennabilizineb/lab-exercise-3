/*
  Task 2: Weather Data Fetching Logic
*/

// Step 10: Weathercode lookup object for human-readable descriptions and emojis
const weatherLookup = {
    0: { desc: "Clear sky", emoji: "☀️" },
    1: { desc: "Mainly clear", emoji: "🌤️" },
    2: { desc: "Partly cloudy", emoji: "⛅" },
    3: { desc: "Overcast", emoji: "☁️" },
    45: { desc: "Fog", emoji: "🌫️" },
    48: { desc: "Depositing rime fog", emoji: "🌫️" },
    51: { desc: "Light drizzle", emoji: "🌦️" },
    61: { desc: "Slight rain", emoji: "🌧️" },
    71: { desc: "Slight snow fall", emoji: "🌨️" },
    95: { desc: "Thunderstorm", emoji: "⛈️" }
};

/*
  Main function to handle the request chain
*/
async function getWeatherData(cityName) {
    const errorBanner = document.getElementById('errorBanner');
    const errorMessage = document.getElementById('errorMessage');
    
    // Step 9: Wrap all fetch calls in try/catch
    try {
        errorBanner.style.display = 'none';

        // Step 5: Geocoding API call to resolve city name
        const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=en&format=json`;
        const geoResponse = await fetch(geoUrl);        
        
        // Task 4 (Step 16) integration: Explicit HTTP error check
        if (!geoResponse.ok) {
            throw new Error(`Geocoding failed with status: ${geoResponse.status}`);
        }

        const geoData = await geoResponse.json();

        // Step 6: Handle empty results without throwing
        if (!geoData.results || geoData.results.length === 0) {
            showError("City not found. Please try another search.");
            return;
        }

        const { latitude, longitude, name, timezone } = geoData.results[0];
        window.currentCityTimezone = timezone;

        // Step 7: Call Open-Meteo with specific parameters
        const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true&hourly=temperature_2m,relativehumidity_2m,windspeed_10m&daily=temperature_2m_max,temperature_2m_min,weathercode&timezone=auto`;
        
        const weatherResponse = await fetch(weatherUrl);
        if (!weatherResponse.ok) {
            throw new Error(`Weather data fetch failed: ${weatherResponse.status}`);
        }
        
        const weatherData = await weatherResponse.json();

        // Step 8: Success - Populate UI and remove skeletons
        displayWeather(name, weatherData);

    } catch (error) {
        // Step 9: Display error banner with retry option
        showError(error.message);
    }
}

/*
  Helper to update the UI and strip skeleton classes
*/
function displayWeather(city, data) {
    const current = data.current_weather;
    const daily = data.daily;
    const lookup = weatherLookup[current.weathercode] || { desc: "Unknown", emoji: "❓" };

    // Populate Current Weather
    document.getElementById('cityName').textContent = city;
    document.getElementById('temp').textContent = `${current.temperature}°C`;
    document.getElementById('weatherDesc').textContent = `${lookup.emoji} ${lookup.desc}`;
    document.getElementById('humidity').textContent = `Humidity: ${data.hourly.relativehumidity_2m[0]}%`;
    document.getElementById('windSpeed').textContent = `Wind: ${current.windspeed} km/h`;

    // Populate 7-Day Forecast (Simplified example for one card)
    const forecastRow = document.getElementById('forecastRow');
    forecastRow.innerHTML = ''; // Clear previous data
    
    for (let i = 0; i < 7; i++) {
        const dayLookup = weatherLookup[daily.weathercode[i]] || { desc: "Unknown", emoji: "❓" };
        const card = `
            <div class="forecast-card">
                <p class="day-name">${new Date(daily.time[i]).toLocaleDateString('en-US', {weekday: 'short'})}</p>
                <div class="weather-icon">${dayLookup.emoji}</div>
                <p class="high-low">${daily.temperature_2m_max[i]}° / ${daily.temperature_2m_min[i]}°</p>
            </div>
        `;
        forecastRow.innerHTML += card;
    }

    // Remove skeleton classes to reveal the data
    document.querySelectorAll('.skeleton').forEach(el => {
        el.classList.remove('skeleton');
    });

    // Store timezone from Open-Meteo for Task 3
    window.currentCityTimezone = data.timezone; 

    // Trigger Task 3 
    fetchLocalTime(city);
}

function showError(msg) {
    const errorBanner = document.getElementById('errorBanner');
    const errorMessage = document.getElementById('errorMessage');
    errorMessage.textContent = msg;
    errorBanner.style.display = 'block';
}

// Basic search trigger for Task 2
document.getElementById('searchBtn').addEventListener('click', () => {
    const city = document.getElementById('cityInput').value;
    if (city) getWeatherData(city);
});

/*
  Task 3: jQuery AJAX for Local Time
*/
function fetchLocalTime(cityName) {
    // 11. Use $.getJSON to call World TimeAPI 
    // Note: World TimeAPI typically uses timezone strings. 
    // We can use the timezone string returned by the Open-Meteo API in Task 2.
    const timezone = window.currentCityTimezone || "UTC"; 
    const timeUrl = `https://worldtimeapi.org/api/timezone/${timezone}`;

    // 14. Use jQuery's .done(), .fail(), and .always() chaining methods 
    $.getJSON(timeUrl)
        .done(function(data) {
            // 12. Map the city's timezone string and display local time 
            const dateTime = new Date(data.datetime);
            const timeString = dateTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            $('#localTime').text(`Local Time: ${timeString}`).removeClass('skeleton'); [cite: 51]
        })
        .fail(function() {
            // 13. Fallback to browser's local time if API fails 
            const fallbackTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            $('#localTime').text(`Local Time: ${fallbackTime} (Local)`).removeClass('skeleton'); [cite: 51]
            console.warn("TimeAPI failed, using browser fallback.");
        })
        .always(function() {
            // 15. Log a timestamp of the completed request to the console 
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] TimeAPI request completed.`); [cite: 51]
        });
}

/*
  Task 4: Error Handling & Edge Cases
*/

let debounceTimer;
const SEARCH_DELAY = 500; // 500ms debounce delay 
const REQUEST_TIMEOUT = 10000; // 10-second timeout 

/*
  Step 18: Debounce Implementation
  Prevents rapid API calls while the user is typing.
*/
document.getElementById('cityInput').addEventListener('input', (e) => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        handleSearch(e.target.value);
    }, SEARCH_DELAY);
});

/*
  Step 17: Input Validation
*/
async function handleSearch(query) {
    const trimmedQuery = query.trim();

    // Show validation message for empty or short strings 
    if (trimmedQuery.length > 0 && trimmedQuery.length < 2) {
        showError("Please enter at least 2 characters.");
        return;
    }

    if (trimmedQuery.length >= 2) {
        await getWeatherData(trimmedQuery);
    }
}

/*
  Updated Fetch with AbortController (Step 19)
*/
async function fetchWithTimeout(url, options = {}) {
    // Implement AbortController
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

    try {
        const response = await fetch(url, { 
            ...options, 
            signal: controller.signal 
        });
        clearTimeout(timeoutId);

        // Handle HTTP errors explicitly
        if (!response.ok) {
            throw new Error(`HTTP Error ${response.status}: Request failed.`);
        }

        return await response.json();
    } catch (error) {
        if (error.name === 'AbortError') {
            throw new Error("Request timed out. The server took too long to respond.");
        }
        throw error;
    }
}