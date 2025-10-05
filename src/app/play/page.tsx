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
    id: string;
    trigger: string;
    coins: number;
    description: string;
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

  useEffect(() => {
    // Fetch the dinosaur images
    const fetchDinoImages = async () => {
      try {
        const response = await fetch("/api/dinosaurs");
        const data = await response.json();
        if (Array.isArray(data)) {
          const imageUrls = data
            .filter((item: any) => item.download_url)
            .map((item: any) => item.download_url);
          // Set initial images
          if (imageUrls.length > 0) {
            const randomIndex1 = Math.floor(Math.random() * imageUrls.length);
            let randomIndex2 = Math.floor(Math.random() * imageUrls.length);

            // Ensure dino2 is different from dino1
            while (randomIndex2 === randomIndex1 && imageUrls.length > 1) {
              randomIndex2 = Math.floor(Math.random() * imageUrls.length);
            }

            const response = await fetch("/api/persona", {
              method: "POST",
              body: JSON.stringify({ imageUrl: imageUrls[randomIndex1] }),
            });
            const personaData = await response.json();
            console.log(personaData);
            setDinoData(personaData);
            setChats([
              {
                from: Sender.Bot,
                text: personaData.initialMessage.content,
                timestamp: new Date(),
              },
            ]);
            setDinoPlayer({
              imageUrl: imageUrls[randomIndex2],
              coinValue: 0,
            });

            // Fade in after a short delay
            setTimeout(() => {
              setIsVisible(true);
            }, 100);
          }
        } else {
          console.error("No dinosaur images found");
        }
      } catch (error) {
        console.error("Failed to fetch dinosaur images:", error);
      }
    };

    fetchDinoImages();
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
    window.location.reload();
  };

  const handleExit = () => {
    window.location.href = "/";
  };

  const sendChat = async () => {
    if (!text.trim() || !dinoData) return;

    const messageText = text.trim();
    const newChat: ChatItem = {
      from: Sender.Player,
      text: messageText,
      timestamp: new Date(),
    };
    setChats((prevChats) => [...prevChats, newChat]);
    setText("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          dinoData: {
            ...dinoData,
            playerCoinValue: playerData?.coinValue || 0,
          },
          newMessage: messageText,
          chatHistory: chats,
        }),
      });

      const data = await response.json();
      console.log(data);

      if (data && data.reply) {
        const botChat: ChatItem = {
          from: Sender.Bot,
          text: data.reply,
          timestamp: new Date(),
        };
        setChats((prevChats) => [...prevChats, botChat]);

        // Update coin values if there was a change
        if (data.coinChange !== undefined) {
          // Update dino coins
          if (data.newDinoCoinValue !== undefined) {
            setDinoData((prevData) => ({
              ...prevData!,
              persona: {
                ...prevData!.persona,
                coinValue: data.newDinoCoinValue,
              },
            }));
          }

          // Update player coins
          if (data.newUserCoinValue !== undefined) {
            setDinoPlayer((prevPlayer) => ({
              ...prevPlayer!,
              coinValue: data.newUserCoinValue,
            }));
          }

          // Check for game over
          if (data.isGameOver) {
            setGameOverVisible(true);
          }
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
        <p
          className={`font-mono text-gunmetal text-5xl pb-2 text-center mx-auto ${
            notesVisible ? "opacity-0" : "opacity-100"
          } transition-opacity duration-500`}
        >
          smooth talking
        </p>
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
            You've successfully convinced {dinoData?.persona.name} to give you
            all their coins!
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
