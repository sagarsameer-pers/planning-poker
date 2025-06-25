const config = {
  API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://planning-poker-2mjf.onrender.com' 
    : 'http://localhost:3001'
};

export default config; 