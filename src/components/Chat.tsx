import { useState } from "react";

enum Sender {
  Player,
  Bot,
}

interface ChatItem {
  from: Sender;
  text: string;
  timestamp: Date;
}

export default function Chat() {
  const [text, setText] = useState<string>("");
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [notes, setNotes] = useState<string[]>([]);

  const addNote = (note: string) => {
    setNotes((on) => [...on, note]);
  };

  const removeNote = (idx: number) => {
    setNotes((on) => on.filter((_, i) => i !== idx));
  };

  const sendChat = async () => {
    const response = await fetch("/api/chat", { body: text  });
  };
}
