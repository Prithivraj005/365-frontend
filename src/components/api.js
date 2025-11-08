const API_BASE_URL = "https://three65-82mp.onrender.com"; // change later to deployed URL
export default API_BASE_URL;


export async function signup(username, password) {
  const res = await fetch(`${https://render.com/docs/node-version}/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Signup failed");
  }

  return res.json();
}

export async function login(username, password) {
  const res = await fetch(`${https://render.com/docs/node-version}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Login failed");
  }

  return res.json();
}


