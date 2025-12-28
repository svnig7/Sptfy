export default {
  async fetch(req, env) {
    const url = new URL(req.url);

    // STEP 1: Login
    if (url.pathname === "/login") {
      const auth = new URL("https://accounts.spotify.com/authorize");
      auth.searchParams.set("client_id", env.SPOTIFY_CLIENT_ID);
      auth.searchParams.set("response_type", "code");
      auth.searchParams.set("redirect_uri", env.REDIRECT_URI);
      auth.searchParams.set(
        "scope",
        "user-library-read user-library-modify"
      );
      return Response.redirect(auth.toString(), 302);
    }

    // STEP 2: Callback
    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");

      const tokenRes = await fetch(
        "https://accounts.spotify.com/api/token",
        {
          method: "POST",
          headers: {
            "Authorization":
              "Basic " +
              btoa(
                env.SPOTIFY_CLIENT_ID +
                  ":" +
                  env.SPOTIFY_CLIENT_SECRET
              ),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: env.REDIRECT_URI,
          }),
        }
      );

      const token = await tokenRes.json();
      const accessToken = token.access_token;

      let removed = 0;

      while (true) {
        const tracksRes = await fetch(
          "https://api.spotify.com/v1/me/tracks?limit=50",
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          }
        );

        const tracks = await tracksRes.json();
        if (!tracks.items.length) break;

        const ids = tracks.items.map((i) => i.track.id);

        await fetch("https://api.spotify.com/v1/me/tracks", {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ ids }),
        });

        removed += ids.length;
      }

      return new Response(
        `✅ Done! Removed ${removed} liked songs.`,
        { headers: { "Content-Type": "text/plain" } }
      );
    }

    return new Response("Not Found", { status: 404 });
  },
};
