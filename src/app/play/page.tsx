"use client";

import { useEffect, useState, useRef } from "react";
import DinoPlayer from "@/components/DinoPlayer";
import Link from "next/link";
import {
  Notebook,
  NotebookPen,
  Send,
  X,
  Plus,
  Trash2,
  GripVertical,
} from "lucide-react";
import Modal from "react-modal";
import {
  DragDropContext,
  Droppable,
  Draggable,
  DropResult,
} from "react-beautiful-dnd";

enum Sender {
  Player,
  Bot,
}

interface ChatItem {
  from: Sender;
  text: string;
  timestamp: Date;
}

interface DinoSchema {
  persona: {
    id: string;
    name: string;
    description: string;
    likes: string[];
    dislikes: string[];
    coinValue?: number;
    imageUrl: string | null;
  };
  initialMessage: { role: "assistant"; content: string };
  coinRules: {
    trigger: string;
    coins: number;
    description: string;
  }[];
  earnedRules?: {
    trigger: string;
    coins: number;
    earnedAt: Date;
  }[];
}

interface Player {
  imageUrl: string;
  coinValue: number;
}

interface Note {
  id: string;
  content: string;
}

Modal.setAppElement("#root");

export default function Play() {
  const [dinoData, setDinoData] = useState<DinoSchema | null>(null);
  const [playerData, setDinoPlayer] = useState<Player | null>(null);
  const [selectedDinosaur, setSelectedDinosaur] = useState<string | null>(null);
  const [gameId, setGameId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [notesVisible, setNotesVisible] = useState(false);
  const [text, setText] = useState<string>("");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [newNoteText, setNewNoteText] = useState("");
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);
  const [gameOverVisible, setGameOverVisible] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  };

  // Scroll to bottom when chats change
  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  // Check authentication status
  const checkAuthStatus = async () => {
    try {
      const response = await fetch("/api/user", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });
      if (response.ok) {
        const userData = await response.json();
        setIsAuthenticated(true);
        return userData.user;
      } else {
        setIsAuthenticated(false);
        return null;
      }
    } catch (error) {
      setIsAuthenticated(false);
      return null;
    }
  };

  // Load game data from localStorage for non-authenticated users
  const loadLocalGameData = () => {
    const localGameId = localStorage.getItem("currentGameId");
    const localDinoData = localStorage.getItem("dinoData");
    const localChats = localStorage.getItem("chatHistory");
    const localPlayerData = localStorage.getItem("playerData");

    if (localGameId && localDinoData) {
      setGameId(localGameId);

      const parsedDinoData = JSON.parse(localDinoData);
      const earnedRules = parsedDinoData.earnedRules || [];

      // Calculate total coins earned to subtract from bot's coin value
      const totalCoinsEarned = earnedRules.reduce(
        (sum: number, rule: any) => sum + (rule.coins || 0),
        0
      );

      const adjustedDinoData = {
        ...parsedDinoData,
        persona: {
          ...parsedDinoData.persona,
          coinValue: Math.max(
            0,
            (parsedDinoData.persona.coinValue || 0) - totalCoinsEarned
          ),
        },
      };

      setDinoData(adjustedDinoData);
      setSelectedDinosaur(parsedDinoData.persona.name);

      if (localChats) {
        const parsedChats = JSON.parse(localChats);
        setChats(
          parsedChats.map((chat: any) => ({
            ...chat,
            timestamp: new Date(chat.timestamp),
          }))
        );
      }

      if (localPlayerData) {
        const parsedPlayerData = JSON.parse(localPlayerData);

        // If user is authenticated, fetch their current avatar and coins
        if (isAuthenticated) {
          fetch("/api/user", {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          })
            .then((response) => response.json())
            .then((userData) => {
              if (userData.user && userData.user.avatar) {
                setDinoPlayer({
                  imageUrl: userData.user.avatar,
                  coinValue: userData.user.coins || 0,
                });
              } else {
                setDinoPlayer(parsedPlayerData);
              }
            })
            .catch(() => {
              setDinoPlayer(parsedPlayerData);
            });
        } else {
          setDinoPlayer(parsedPlayerData);
        }
      }

      return true;
    }
    return false;
  };

  // Save game data to localStorage for non-authenticated users
  const saveLocalGameData = (gameData: any, playerData: any, chatData: any) => {
    if (!isAuthenticated) {
      localStorage.setItem("currentGameId", gameData.gameId || "");
      localStorage.setItem("dinoData", JSON.stringify(gameData));
      localStorage.setItem("chatHistory", JSON.stringify(chatData));
      localStorage.setItem("playerData", JSON.stringify(playerData));
    }
  };

  // Clear local game data
  const clearLocalGameData = () => {
    localStorage.removeItem("currentGameId");
    localStorage.removeItem("dinoData");
    localStorage.removeItem("chatHistory");
    localStorage.removeItem("playerData");
  };

  // Helper function to load a game session
  const loadGameSession = async (gameSession: any) => {
    try {
      setGameId(gameSession.gameId);

      // Make sure earnedRules is properly restored to prevent duplicate coin earning
      const earnedRules = gameSession.dinoData.earnedRules || [];

      // Calculate total coins earned in this game to subtract from bot's coin value
      const totalCoinsEarned = earnedRules.reduce(
        (sum: number, rule: any) => sum + (rule.coins || 0),
        0
      );

      const dinoDataWithEarnedRules = {
        ...gameSession.dinoData,
        earnedRules,
        persona: {
          ...gameSession.dinoData.persona,
          coinValue: Math.max(
            0,
            (gameSession.dinoData.persona.coinValue || 0) - totalCoinsEarned
          ),
        },
      };

      setDinoData(dinoDataWithEarnedRules);
      setSelectedDinosaur(gameSession.dinosaur);

      // Set up player data - get current user data for coins and avatar
      const userResponse = await fetch("/api/user", {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      if (userResponse.ok) {
        const userData = await userResponse.json();
        setDinoPlayer({
          imageUrl: userData.user.avatar,
          coinValue: userData.user.coins || 0,
        });
      } else {
        // Fallback for guest users or if user fetch fails
        setDinoPlayer({
          imageUrl: gameSession.dinoData.persona.imageUrl,
          coinValue: 0,
        });
      }

      // Convert chat history timestamps and reconstruct full conversation
      const convertedChats: ChatItem[] = [];

      // Add initial bot message
      convertedChats.push({
        from: Sender.Bot,
        text: gameSession.dinoData.initialMessage.content,
        timestamp: new Date(gameSession.createdAt),
      });

      // Add chat history if exists
      if (gameSession.chatHistory && gameSession.chatHistory.length > 0) {
        gameSession.chatHistory.forEach((chat: any) => {
          if (chat.type === "user") {
            convertedChats.push({
              from: Sender.Player,
              text: chat.message,
              timestamp: new Date(chat.timestamp),
            });
          } else if (chat.type === "bot") {
            convertedChats.push({
              from: Sender.Bot,
              text: chat.message,
              timestamp: new Date(chat.timestamp),
            });
          }
        });
      }

      setChats(convertedChats);
      console.log(
        `Loaded existing game: ${gameSession.gameId} with ${gameSession.dinoData.persona.name}`
      );
      return true;
    } catch (error) {
      console.error("Failed to load game session:", error);
      return false;
    }
  };

  // Find and load the first active game for authenticated users
  const loadFirstActiveGame = async () => {
    try {
      const response = await fetch("/api/games");
      if (response.ok) {
        const data = await response.json();
        const activeGame = data.gameSessions.find((g: any) => g.isActive);

        if (activeGame) {
          return await loadGameSession(activeGame);
        }
      }
      return false;
    } catch (error) {
      console.error("Failed to load first active game:", error);
      return false;
    }
  };

  useEffect(() => {
    // Initialize game
    const initializeGame = async () => {
      try {
        // Check authentication status
        const user = await checkAuthStatus();

        // For authenticated users, try to load first active game
        if (user) {
          const loadedActiveGame = await loadFirstActiveGame();
          if (loadedActiveGame) {
            setTimeout(() => {
              setIsVisible(true);
            }, 100);
            return;
          }
        } else {
          // Try to load existing game for non-authenticated users
          if (loadLocalGameData()) {
            setTimeout(() => {
              setIsVisible(true);
            }, 100);
            return;
          }
        }

        // Fetch dinosaur images for new game
        const response = await fetch("/api/dinosaurs");
        const data = await response.json();
        if (Array.isArray(data)) {
          const imageUrls = data
            .filter((item: any) => item.download_url)
            .map((item: any) => item.download_url);

          if (imageUrls.length > 0) {
            const randomIndex1 = Math.floor(Math.random() * imageUrls.length);
            let randomIndex2 = Math.floor(Math.random() * imageUrls.length);

            // Ensure dino2 is different from dino1
            while (randomIndex2 === randomIndex1 && imageUrls.length > 1) {
              randomIndex2 = Math.floor(Math.random() * imageUrls.length);
            }

            // Generate persona using the chat route
            const personaResponse = await fetch("/api/chat", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                imageUrl: imageUrls[randomIndex1],
                isNewGame: true,
                message: "Hello!", // Initial message to trigger persona generation
              }),
            });
            const personaResponseData = await personaResponse.json();

            if (!personaResponseData.dinoData) {
              console.error("Failed to generate persona");
              return;
            }

            const personaData = personaResponseData.dinoData;
            setSelectedDinosaur(personaData.persona.name);
            console.log(personaResponseData);
            setGameId(personaResponseData.gameId);

            // Set up player data - use user avatar if logged in and has avatar, otherwise use random dino
            const playerData = {
              imageUrl:
                user && user.avatar ? user.avatar : imageUrls[randomIndex2],
              coinValue: user?.coins || 0,
            };
            setDinoPlayer(playerData);

            setDinoData(personaData);
            const initialChats = [
              {
                from: Sender.Player,
                text: "Hello!",
                timestamp: new Date(),
              },
              {
                from: Sender.Bot,
                text: personaResponseData.response,
                timestamp: new Date(),
              },
            ];
            setChats(initialChats);

            // Save initial game state for non-authenticated users
            if (!user) {
              const initialGameId = `local_game_${Date.now()}_${Math.random()
                .toString(36)
                .substr(2, 9)}`;
              setGameId(initialGameId);
              saveLocalGameData(personaData, playerData, initialChats);
            }

            setTimeout(() => {
              setIsVisible(true);
            }, 100);
          }
        } else {
          console.error("No dinosaur images found");
        }
      } catch (error) {
        console.error("Failed to initialize game:", error);
      }
    };

    initializeGame();
  }, []);

  const addNote = () => {
    if (newNoteText.trim()) {
      const newNote: Note = {
        id: Date.now().toString(),
        content: newNoteText.trim(),
      };
      setNotes((prevNotes) => [...prevNotes, newNote]);
      setNewNoteText("");
      setIsAddingNote(false);
    }
  };

  const deleteNote = (id: string) => {
    setNotes((prevNotes) => prevNotes.filter((note) => note.id !== id));
  };

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination || !result.destination.droppableId) return;

    const items = Array.from(notes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setNotes(items);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      addNote();
    }
  };

  const handleRestart = () => {
    clearLocalGameData();
    window.location.reload();
  };

  const handleExit = () => {
    window.location.href = "/";
  };

  const sendChat = async () => {
    if (!text.trim() || !selectedDinosaur) return;

    const messageText = text.trim();
    const newChat: ChatItem = {
      from: Sender.Player,
      text: messageText,
      timestamp: new Date(),
    };
    const updatedChats = [...chats, newChat];
    setChats(updatedChats);
    setText("");

    try {
      console.log("gameId:", gameId);
      // Convert chats to API format (exclude initial greeting for chat history)
      const apiChatHistory = chats.slice(1).map((chat) => ({
        type: chat.from === Sender.Player ? "user" : "bot",
        message: chat.text,
        timestamp: chat.timestamp,
      }));

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: messageText,
          dinosaur: selectedDinosaur,
          gameId: gameId,
          chatHistory: apiChatHistory,
        }),
      });

      const data = await response.json();
      console.log(data);

      if (data && data.response) {
        const botChat: ChatItem = {
          from: Sender.Bot,
          text: data.response,
          timestamp: new Date(),
        };
        const finalChats = [...updatedChats, botChat];
        setChats(finalChats);

        // Update game ID if provided
        if (data.gameId && !gameId) {
          setGameId(data.gameId);
        }

        // Update dino data if provided
        if (data.dinoData) {
          setDinoData(data.dinoData);
        }

        // Update coin values if there was a change
        let newPlayerCoins = playerData?.coinValue || 0;
        let newDinoCoins = dinoData?.persona.coinValue || 0;

        if (data.coinChange !== undefined && data.coinChange !== 0) {
          newPlayerCoins =
            (playerData?.coinValue || 0) + Math.abs(data.coinChange);
          newDinoCoins = Math.max(
            0,
            (dinoData?.persona.coinValue || 0) - Math.abs(data.coinChange)
          );

          const updatedPlayerData = {
            ...playerData!,
            coinValue: newPlayerCoins,
          };

          setDinoPlayer(updatedPlayerData);

          setDinoData((prevData) => ({
            ...prevData!,
            persona: {
              ...prevData!.persona,
              coinValue: newDinoCoins,
            },
          }));

          // Save updated game state for non-authenticated users
          if (!isAuthenticated) {
            saveLocalGameData(
              data.dinoData || dinoData,
              updatedPlayerData,
              finalChats
            );
          }
        }

        // Handle game over
        if (data.gameOver || newDinoCoins <= 0) {
          setGameOverVisible(true);

          // Clear localStorage for non-authenticated users
          if (data.shouldClearLocalStorage) {
            clearLocalGameData();
          }

          // For authenticated users, coins are already updated on the backend
          // For non-authenticated users, we don't need to update the database
        }
      }
    } catch (error) {
      console.error("Failed to send chat:", error);
    }
  };

  return (
    <div className="flex flex-row w-screen h-screen">
      <div className="w-1/3 flex flex-col items-center justify-center px-10 gap-4">
        {dinoData && (
          <div className="flex flex-col items-center gap-4">
            <DinoPlayer
              key={dinoData?.persona.imageUrl}
              imageUrl={dinoData?.persona.imageUrl as string}
              coinValue={dinoData?.persona.coinValue ?? 0}
              className="opacity-100"
            />
            <h2 className="text-4xl font-bold font-mono text-gunmetal">
              Orpheus
            </h2>
          </div>
        )}
      </div>
      <div className="w-1/3 flex flex-col gap-1 items-end justify-center py-10">
        <Link href="/">
          <p
            className={`font-mono text-gunmetal text-5xl pb-2 text-center mx-auto cursor-pointer hover:opacity-80 transition-opacity ${
              notesVisible ? "opacity-0" : "opacity-100"
            }`}
          >
            smooth talking
          </p>
        </Link>
        <div
          className="mt-auto flex flex-col w-full max-h-[calc(100vh-200px)] overflow-y-auto pr-2"
          ref={chatContainerRef}
        >
          {chats.map((chat, index) => (
            <div
              key={index}
              className={`max-w-md p-4 my-2 rounded-2xl shadow-md ${
                chat.from === Sender.Bot
                  ? "bg-gunmetal text-almond mr-auto"
                  : "bg-almond text-gunmetal ml-auto"
              }`}
            >
              <p className="font-bold ">
                {chat.from === Sender.Bot ? "Orpheus" : "You"}
              </p>
              <p>{chat.text}</p>
              <p className="text-sm text-gray-500">
                {chat.timestamp.toLocaleTimeString()}
              </p>
            </div>
          ))}
        </div>
        <div className="flex gap-4 items-center h-24 justify-center mx-auto">
          <button
            className="bg-gunmetal hover:bg-gunmetal/80 text-almond font-bold p-3 rounded-2xl transition-all duration-500 cursor-pointer items-center flex"
            onClick={() => {
              setNotesVisible(!notesVisible);
            }}
          >
            <NotebookPen size={28} className="text-almond" />
          </button>
          <input
            className=" w-full min-w-full border-gunmetal border-6 rounded-3xl h-14 p-2 my-auto text-xl"
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendChat();
              }
            }}
            placeholder="Type your message..."
          />
          <button
            className="bg-gunmetal hover:bg-gunmetal/80 text-almond font-bold p-3 rounded-2xl transition-all duration-500 cursor-pointer items-center flex"
            onClick={() => {
              sendChat();
            }}
          >
            <Send size={28} className="text-almond" />
          </button>
        </div>
      </div>
      <div className="w-1/3 flex flex-col items-center justify-center px-10 gap-4">
        {playerData && (
          <div className="flex flex-col items-center gap-4">
            <DinoPlayer
              key={playerData?.imageUrl}
              imageUrl={playerData?.imageUrl as string}
              coinValue={playerData?.coinValue ?? 0}
              className="opacity-100"
              mirrored={true}
            />
            <h2 className="text-4xl font-bold font-mono text-gunmetal">You</h2>
          </div>
        )}
      </div>
      <Modal
        isOpen={notesVisible}
        closeTimeoutMS={300}
        onRequestClose={() => setNotesVisible(false)}
        shouldCloseOnOverlayClick
        contentLabel="Notes Modal"
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-almond p-8 rounded-2xl outline-6 outline-gunmetal w-1/3 min-h-3/4 duration-500 transition-opacity shadow-2xl `}
        portalClassName={`duration-300 transition-all ${
          notesVisible ? "opacity-100" : "opacity-0"
        }`}
        overlayClassName={
          "bg-gunmetal/20 fixed top-0 left-0 w-full h-full flex items-center justify-center cursor-pointer"
        }
      >
        <div className="absolute left-0 flex flex-row h-12 justify-between items-center -top-16 w-full">
          <p></p>
          <p className="text-5xl font-mono text-center text-gunmetal ml-14">
            notes
          </p>
          <button
            className="cursor-pointer mt-2 hover:opacity-80 transition-opacity duration-300 p-1 hover:bg-gunmetal/10 rounded-xl"
            onClick={() => setNotesVisible(false)}
          >
            <X size={40} className="text-gunmetal" />
          </button>
        </div>
        <div className="flex flex-col gap-4 h-full">
          <div className="flex flex-col gap-2 overflow-y-auto overflow-x-clip max-h-96">
            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable
                droppableId="aa"
                type="group"
                isDropDisabled={false}
                isCombineEnabled={false}
                ignoreContainerClipping={true}
                direction="vertical"
              >
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef}>
                    {notes.map((note, idx) => (
                      <div key={note.id}>
                        <Draggable draggableId={note.id} index={idx}>
                          {(provided) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              style={{
                                ...provided.draggableProps.style,
                                position: "static",
                              }}
                              className=" group cursor-pointer"
                              onMouseEnter={() => setHoveredNoteId(note.id)}
                              onMouseLeave={() => setHoveredNoteId(null)}
                            >
                              <div className="bg-white p-4 rounded-xl shadow-md border border-gunmetal/10 flex items-start gap-3 hover:shadow-lg transition-shadow duration-200">
                                <div
                                  {...provided.dragHandleProps}
                                  className="mt-1 opacity-50 group-hover:opacity-100 transition-opacity duration-200 cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical
                                    size={16}
                                    className="text-gunmetal"
                                  />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="whitespace-pre-wrap break-words text-gunmetal">
                                    {note.content}
                                  </p>
                                </div>
                                {hoveredNoteId === note.id && (
                                  <button
                                    onClick={() => deleteNote(note.id)}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 p-1 hover:bg-red-100 rounded-lg cursor-pointer"
                                  >
                                    <Trash2
                                      size={16}
                                      className="text-red-500"
                                    />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </Draggable>
                        {idx < notes.length - 1 && (
                          <div className="border-t-2 border-dashed border-gunmetal/20 my-3"></div>
                        )}
                      </div>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {notes.length > 0 && (
              <div className="border-t-2 border-dashed border-gunmetal/20 my-3"></div>
            )}

            {/* Add new note section */}
            {isAddingNote ? (
              <div className="bg-white p-4 rounded-xl shadow-md border border-gunmetal/10">
                <textarea
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  onKeyDown={handleKeyPress}
                  placeholder="Write your note here..."
                  className="w-full p-3 border border-gunmetal/20 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-gunmetal focus:border-gunmetal min-h-[60px] text-gunmetal placeholder-gunmetal/50"
                  autoFocus
                  rows={1}
                  style={{
                    minHeight: "60px",
                    height: `${Math.max(
                      60,
                      newNoteText.split("\n").length * 24 + 36
                    )}px`,
                  }}
                />
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={addNote}
                    className="bg-gunmetal hover:bg-gunmetal/80 text-almond px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingNote(false);
                      setNewNoteText("");
                    }}
                    className="bg-gunmetal/10 hover:bg-gunmetal/20 text-gunmetal px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors duration-200"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => setIsAddingNote(true)}
                className="bg-white hover:bg-gunmetal/5 p-4 rounded-xl shadow-md border-2 border-dashed border-gunmetal/20 hover:border-gunmetal/40 transition-colors duration-200 flex items-center justify-center gap-2 text-gunmetal/60 hover:text-gunmetal cursor-pointer"
              >
                <Plus size={20} />
                <span>Add a note</span>
              </button>
            )}

            <div className="h-4"></div>
          </div>
        </div>
      </Modal>

      {/* Game Over Modal */}
      <Modal
        isOpen={gameOverVisible}
        closeTimeoutMS={300}
        onRequestClose={() => setGameOverVisible(false)}
        shouldCloseOnOverlayClick={false}
        contentLabel="Game Over Modal"
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-almond p-8 rounded-2xl outline-6 outline-gunmetal w-1/3 min-h-1/4 duration-500 transition-opacity shadow-2xl`}
        portalClassName={`duration-300 transition-all ${
          gameOverVisible ? "opacity-100" : "opacity-0"
        }`}
        overlayClassName={
          "bg-gunmetal/20 fixed top-0 left-0 w-full h-full flex items-center justify-center cursor-pointer"
        }
      >
        <div className="flex flex-col items-center gap-6 text-center">
          <h2 className="text-4xl font-bold font-mono text-gunmetal">
            Game Over!
          </h2>
          <p className="text-lg text-gunmetal">
            The conversation has ended! {dinoData?.persona.name} is no longer
            willing to talk.
          </p>
          <p className="text-sm text-gunmetal/70">
            Final Score: {playerData?.coinValue || 0} coins
          </p>
          <div className="flex gap-4">
            <button
              onClick={handleRestart}
              className="bg-gunmetal hover:bg-gunmetal/80 text-almond px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors duration-200"
            >
              Play Again
            </button>
            <button
              onClick={handleExit}
              className="bg-gunmetal/10 hover:bg-gunmetal/20 text-gunmetal px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors duration-200"
            >
              Exit to Home
            </button>
          </div>
          {/* Login/Signup button */}
          <div className="flex gap-4">
            <button
              onClick={() => (window.location.href = "/auth")}
              className="bg-gunmetal hover:bg-gunmetal/80 text-white px-6 py-3 rounded-lg font-medium cursor-pointer transition-colors duration-200"
            >
              Login / Sign Up to Save Progress
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
