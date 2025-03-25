import { useEffect, useState } from "react";
import io from "socket.io-client";
import Editor from "@monaco-editor/react";
import { FaCodeBranch } from "react-icons/fa";
import "./App.css";

//const socket = io("http://localhost:5000");
const socket = io("https://realtimecodeeditor-tz6i.onrender.com/");

const App = () => {
  const [joined, setJoined] = useState(false);
  const [roomId, setRoomId] = useState("");
  const [userName, setUserName] = useState("");
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("// start code here");
  const [copySuccess, setCopySuccess] = useState("");
  const [users, setUsers] = useState([]);
  const [typing, setTyping] = useState("");
  const [outPut, setOutPut] = useState("");
  const [version, setVersion] = useState("*");

  useEffect(() => {
    const storedRoomId = localStorage.getItem("roomId");
    const storedUserName = localStorage.getItem("userName");
    if (storedRoomId && storedUserName) {
      setRoomId(storedRoomId);
      setUserName(storedUserName);
      setJoined(true);
      socket.emit("join", { roomId: storedRoomId, userName: storedUserName });
    }
  }, []);


  useEffect(() => {
    socket.on("userJoined", (users) => {
      setUsers(users);
    });

    socket.on("codeUpdate", (newCode) => {
      setCode(newCode);
    });

    socket.on("userTyping", (user) => {
      setTyping(`${user.slice(0, 8)}... is Typing`);
      setTimeout(() => setTyping(""), 2000);
    });

    socket.on("languageUpdate", (newLanguage) => {
      setLanguage(newLanguage);
    });

    socket.on("codeResponse", (response) => {
      setOutPut(response.run.output);
    });

    return () => {
      socket.off("userJoined");
      socket.off("codeUpdate");
      socket.off("userTyping");
      socket.off("languageUpdate");
      socket.off("codeResponse");
    };
  }, []);

  useEffect(() => {
    const handleBeforeUnload = () => {
      socket.emit("leaveRoom");
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, []);

  const joinRoom = () => {
    if (roomId && userName) {
      socket.emit("join", { roomId, userName });
      localStorage.setItem("roomId", roomId);
      localStorage.setItem("userName", userName);
      setJoined(true);
    }
  };

  const leaveRoom = () => {
    socket.emit("leaveRoom");
    localStorage.removeItem("roomId");
    localStorage.removeItem("userName");
    setJoined(false);
    setRoomId("");
    setUserName("");
    setCode("// start code here");
    setLanguage("javascript");
  };

  const copyRoomId = () => {
    navigator.clipboard.writeText(roomId);
    setCopySuccess("Copied!");
    setTimeout(() => setCopySuccess(""), 2000);
  };

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit("codeChange", { roomId, code: newCode });
    socket.emit("typing", { roomId, userName });
  };

  const handleLanguageChange = (e) => {
    const newLanguage = e.target.value;
    setLanguage(newLanguage);
    socket.emit("languageChange", { roomId, language: newLanguage });
  };

  const runCode = () => {
    socket.emit("compileCode", { code, roomId, language, version });
  };

  const getUserInitials = (name) => {
    const words = name.trim().split(" ");
    if (words.length === 1) return words[0][0].toUpperCase(); // If only one word, take the first letter
    return (words[0][0] + words[1][0]).toUpperCase(); // Take first letter of first and last name
  };



  if (!joined) {
    return (
      <div className="join-container">
        <div className="join-form">
          <h1>Enter Room ID</h1>
          <input
            type="text"
            placeholder="Room Id"
            value={roomId}
            onChange={(e) => setRoomId(e.target.value)}
          />
          <input
            type="text"
            placeholder="Your Name"
            value={userName}
            onChange={(e) => setUserName(e.target.value)}
          />
          <button onClick={joinRoom}>Join Room</button>
        </div>
      </div>
    );
  }

  return (
    <div className="editor-container">
      <div className="sidebar">
        <div className="sidebar-header">
          <div className="room-info">
            {/* <h2>Code Room: {roomId}</h2> */}
            <h1>
              <FaCodeBranch color="#4a90e2" />
              CodeCollab
            </h1>
            {/* <button onClick={copyRoomId} className="copy-button">
            Copy Id
          </button> */}
          </div>

          <div>
            <h3>Connected Users:</h3>
            <ul>
              {/* {users.map((user, index) => (
            <li key={index}>{user.slice(0, 8)}</li>
          ))} */}
              {users.map((user, index) => {
                const initials = user ? getUserInitials(user) : "User"; // Default to "U" if user is undefined
                const avatarUrl = `https://api.dicebear.com/5.x/initials/svg?seed=${initials}`;

                return (
                  <li key={index} className="user-avatar">
                    <div className="avatar-circle">
                      <img
                        src={avatarUrl}
                        alt={user || "Unknown"}
                        className="avatar-image"
                        onError={(e) => e.target.src = "https://via.placeholder.com/40"} // Fallback in case of API failure
                      />
                    </div>
                  </li>
                );
              })}

            </ul>
          </div>
        </div>
        <p className="typing-indicator">{typing}</p>
        <div>
          <select
            className="language-selector"
            value={language}
            onChange={handleLanguageChange}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="cpp">C++</option>
          </select>

          {copySuccess && <div className="copy-success">{copySuccess}</div>}

          <button onClick={copyRoomId} className="copy-button">
            Copy Room ID
          </button>

          <button className="leave-button" onClick={leaveRoom}>
            Leave
          </button>
        </div>
      </div>

      <div className="editor-wrapper">
        <Editor
          height={"100%"}
          defaultLanguage={language}
          language={language}
          value={code}
          onChange={handleCodeChange}
          theme="vs-dark"
          options={{
            minimap: { enabled: false },
            fontSize: 20,
          }}
        />
        <button className="run-btn" onClick={runCode}>
          Execute
        </button>
        <textarea
          className="output-console"
          value={outPut}
          readOnly
          placeholder="Output will appear here ..."
        />
      </div>
    </div>
  );
};

export default App;
