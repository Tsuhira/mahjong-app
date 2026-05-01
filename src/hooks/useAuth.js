import { useState, useEffect } from "react";

const API_KEY = "AIzaSyCnz26wUZ-78tDbkmnOiu2HSxxnwrFpztA";

// Firebase Auth SDK を使わず REST API でカスタムトークンを ID トークンに交換する
export function useAuth() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const kumaToken = params.get("kumaToken");

    if (!kumaToken) {
      setUser(null);
      return;
    }

    const url = new URL(window.location.href);
    url.searchParams.delete("kumaToken");
    window.history.replaceState({}, "", url.toString());

    fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: kumaToken, returnSecureToken: true }),
      }
    )
      .then(res => res.json())
      .then(data => {
        if (data.idToken) {
          const payload = JSON.parse(atob(data.idToken.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
          setUser({ uid: payload.sub, idToken: data.idToken });
        } else {
          console.error("Token exchange failed:", data.error?.message);
          setUser(null);
        }
      })
      .catch(err => {
        console.error("Auth REST failed:", err);
        setUser(null);
      });
  }, []);

  return { user, loading: user === undefined };
}
