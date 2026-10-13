// Read the backend API URL from the frontend environment.
const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000/api";

// Reusable function for sending requests to our Express API.
export async function apiRequest(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,

    // Tell Express that we are sending JSON when applicable.
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  // Convert the JSON response body into a JavaScript object.
  const result = await response.json();

  // Throw an error if the HTTP response indicates failure.
  if (!response.ok) {
    throw new Error(result.message || "Something went wrong.");
  }

  // Return the JSON data so a React component can use it.
  return result;
}
