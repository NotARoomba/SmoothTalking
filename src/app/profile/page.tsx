"use client";

import { useEffect, useState } from "react";

interface User {
  id: string;
  avatar: string;
  username: string;
  name: string;
  email: string;
}

export default function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [dinoAvatar, setDinoAvatar] = useState("");

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      const response = await fetch("/api/user");
      const data = await response.json();
      console.log("Fetched user data:", data);
      if (!response.ok) {
        setError(data.error || "Failed to fetch user data");
        setLoading(false);
        return;
      }
      if (data.user.avatar === "") {
        const dinosaurs = await fetch("/api/dinosaurs").then((res) =>
          res.json()
        );
        const randomDinosaur =
          dinosaurs[Math.floor(Math.random() * dinosaurs.length)];
        setDinoAvatar(randomDinosaur.download_url);
      }

      setUser(data.user || null);
      setLoading(false);
    };
    fetchUser();
  }, []);
  //create a profile page that shows the user's avatar, username, name, and email, and allows to edit them, if the user doesnt have a profile picture then use a random dinosaur from the dinosaurs api as the avatar and then have a border around the avatar that on hover says that its a placehodler until the user changes it, then if they change the avatar they can only select from the dinosaurs api, and then have a button to save the changes that sends a post request to /api/user with the updated user data, and then shows a message that the profile was updated successfully or an error if there was an error
  // use the background as almond and then make a box that has border-6 and border-gunmetal and rounded-2xl
  // include all of the user info in a form that is disabled until the user clicks the edit button
  return (
    <div className="flex flex-col gap-6 items-center justify-center min-h-screen bg-almond p-4">
      <div className="bg-almond border-6 border-gunmetal p-8 rounded-2xl shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-gunmetal">Profile</h1>
        {loading ? (
          <p className="text-gunmetal">Loading...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : user ? (
          <form className="flex flex-col gap-4">
            <div className="flex flex-col items-center">
              <div className="relative">
                <img
                  src={user.avatar || dinoAvatar}
                  alt="Avatar"
                  className="w-32 h-32 rounded-full object-cover border-4 border-gunmetal"
                />
              </div>
              <p className="text-gunmetal text-2xl mt-4 font-mono">
                {user.username}
              </p>
              <button
                type="button"
                className="text-blue-500 hover:underline"
                onClick={() => setEditing(true)}
              >
                Edit
              </button>
            </div>
          </form>
        ) : null}
      </div>
    </div>
  );
}
