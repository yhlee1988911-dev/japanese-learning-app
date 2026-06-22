const API_HOST = '192.168.31.120:5001';
const API_URL = `http://${API_HOST}/api`;

export const api = {
  get: async <T>(endpoint: string): Promise<T> => {
    const response = await fetch(`${API_URL}${endpoint}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  },

  post: async <T>(endpoint: string, body: any): Promise<T> => {
    const response = await fetch(`${API_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }
};

export const getTtsUrl = (text: string) =>
  `${API_URL}/tts/japanese?text=${encodeURIComponent(text)}`;
