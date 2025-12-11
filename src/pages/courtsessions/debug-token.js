// Debug utility to check token and API response
(async () => {
  const token = localStorage.getItem('token');
  console.log('Token:', token);
  const res = await fetch('/api/courtsessions', {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined
  });
  const text = await res.text();
  console.log('Status:', res.status);
  console.log('Response:', text);
})();
