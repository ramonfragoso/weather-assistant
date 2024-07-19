import axios from "axios";

export default function openWeatherService() {
  const API = axios.create({
    baseURL: "https://api.openweathermap.org/data/2.5/weather",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const getWeatherData = async (latitude: string, longitude: string) => {
    const response = await API.get(
      `?lat=${latitude}&lon=${longitude}&appid=${process.env.OPENWEATHER_API_KEY}&units=metric`
    );
    if (response) {
      return {
        feels_like: response.data?.main.feels_like,
        humidity: response.data?.main.humidity,
        speed: response.data?.wind.speed,
        weather: response.data?.weather,
      };
    }
  };

  return {
    getWeatherData,
  };
}
