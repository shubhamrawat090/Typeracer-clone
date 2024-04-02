"use client";

import type { GameProps, GameStatus, Player, PlayerScore } from "@/types/types";
import { useEffect, useState } from "react";
import { Socket, io } from "socket.io-client";
import { toast } from "sonner";
import LeaderboardCard from "./leaderboard-card";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";

export default function Game({ gameId, name }: GameProps) {
  const [ioInstance, setIoInstance] = useState<Socket>();
  const [players, setPlayers] = useState<Player[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>("not-started");
  const [paragraph, setParagraph] = useState<string>("");
  const [host, setHost] = useState<string>("");
  const [inputParagraph, setInputParagraph] = useState<string>("");
  const [showCopied, setShowCopied] = useState(false);
  const [showCode, setShowCode] = useState(false);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WEBSOCKET_URL as string, {
      // If we leave this then polling will also work. But in this case only websocket connection is working
      transports: ["websocket"],
    });

    setIoInstance(socket);

    socket.emit("join-game", gameId, name);

    return () => {
      // VERY IMPORTANT.
      removeListeners();
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    // Will just after the socket instance is created
    setupListeners();
    return () => removeListeners();
  }, [ioInstance]);

  // useEffect for detecting changes in input paragraph
  // NOTE: Some throttling can be done for optimisation
  useEffect(() => {
    // If the game is not running or the socket doesn't exist. WE DO NOT DO ANYTHING
    if (!ioInstance || gameStatus !== "in-progress") return;

    // Send the keystrokes info to the socket
    ioInstance.emit("player-typed", inputParagraph);
  }, [inputParagraph]);

  function setupListeners() {
    if (!ioInstance) return;

    ioInstance.on("connect", () => {
      console.log("Connected to server");
    });

    ioInstance.on("players", (players: Player[]) => {
      console.log("received players");
      setPlayers(players);
    });

    ioInstance.on("player-joined", (player: Player) => {
      setPlayers((prev) => [...prev, player]);
    });

    ioInstance.on("player-left", (id: string) => {
      setPlayers((prev) => prev.filter((player) => player.id !== id));
    });

    ioInstance.on("player-score", ({ id, score }: PlayerScore) => {
      setPlayers((prev) =>
        prev.map((player) => {
          if (player.id === id) {
            return {
              ...player,
              score,
            };
          }
          return player;
        })
      );
    });

    ioInstance.on("game-started", (paragraph: string) => {
      setParagraph(paragraph);
      setGameStatus("in-progress");
    });

    ioInstance.on("game-finished", () => {
      setGameStatus("finished");
      setInputParagraph("");
    });

    ioInstance.on("new-host", (id: string) => {
      setHost(id);
    });

    ioInstance.on("error", (message: string) => {
      toast.error(message);
    });
  }

  function removeListeners() {
    // Leave all the listers that the client was listening to
    if (!ioInstance) return;

    ioInstance.off("connect");
    ioInstance.off("players");
    ioInstance.off("player-joined");
    ioInstance.off("player-left");
    ioInstance.off("player-score");
    ioInstance.off("game-started");
    ioInstance.off("game-finished");
    ioInstance.off("new-host");
    ioInstance.off("error");
  }

  function startGame() {
    // inform the websocket server to start the game
    if (!ioInstance) return;

    ioInstance.emit("start-game");
  }

  // Usually when you close your tab, the socket is informed after some time that the player has left
  // Here, we are emmitting the leave event to let others know in realtime(just before the player closes their tab) that the player has left
  window.onbeforeunload = () => {
    if (ioInstance) {
      ioInstance.emit("leave");
    }
  };

  return (
    <div className="w-screen p-10 grid grid-cols-1 lg:grid-cols-3 gap-10">
      {/* Leaderboard */}
      <div className="w-full order-last lg:order-first">
        <h2 className="text-2xl font-medium mt-10 lg:mt-0">Leaderboard</h2>
        <div className="flex items-stretch my-5 shadow-[0_0_5px_rgb(255,255,255)] rounded-sm">
          <div
            className="flex-1 flex items-center justify-center"
            onMouseEnter={() => setShowCode(true)}
            onMouseLeave={() => setShowCode(false)}
          >
            {!showCode && (
              <p className="text-sm font-medium">
                Hover over me to see the invite code!
              </p>
            )}
            {showCode && <p className="text-sm font-extralight">{gameId}</p>}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(gameId);
              // We show the copied tooltip for 1 second
              setShowCopied(true);
              setTimeout(() => {
                setShowCopied(false);
              }, 1000);
            }}
            className="px-4 py-2 relative"
            title="Click to copy the invite code"
          >
            {showCopied && (
              <div className="absolute top-[-70%] left-[-10%] text-xs border bg-blue-500 px-2 py-1">
                COPIED
              </div>
            )}
            <svg
              viewBox="0 0 16 16"
              fill="currentColor"
              height="1em"
              width="1em"
            >
              <path
                fillRule="evenodd"
                d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"
              />
              <path
                fillRule="evenodd"
                d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"
              />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-5 w-full">
          {/* sort players based on score and map */}
          {players
            .sort((a, b) => b.score - a.score)
            .map((player, index) => (
              <LeaderboardCard
                key={player.id}
                player={player}
                rank={index + 1}
                host={host}
                you={player.id === ioInstance?.id}
              />
            ))}
        </div>
      </div>

      {/* Game */}
      <div className="lg:col-span-2 h-full">
        {gameStatus === "not-started" && (
          <div className="flex flex-col items-center justify-center p-10">
            <h1 className="text-2xl font-bold">
              Waiting for players to join...
            </h1>

            {/* If we are the host then we see start game button */}
            {host === ioInstance?.id && (
              <Button className="mt-10 px-20" onClick={startGame}>
                Start Game
              </Button>
            )}
          </div>
        )}

        {gameStatus === "in-progress" && (
          <div className="h-full">
            <h1 className="text-2xl font-bold mb-10">
              Type your paragraph below
            </h1>

            <div className="relative h-full">
              <p className="text-2xl lg:text-5xl p-5">{paragraph}</p>

              <Textarea
                value={inputParagraph}
                onChange={(e) => setInputParagraph(e.target.value)}
                className="text-2xl lg:text-5xl outline-none p-5 absolute top-0 left-0 right-0 bottom-0 z-10 opacity-75"
                placeholder=""
                disabled={gameStatus !== "in-progress" || !ioInstance}
              />
            </div>
          </div>
        )}

        {gameStatus === "finished" && (
          <div className="flex flex-col items-center justify-center p-10">
            <h1 className="text-2xl font-bold text-center">
              Game finished!
              {ioInstance?.id === host && " Start a fresh game!"}
            </h1>

            {host === ioInstance?.id && (
              <Button className="mt-10 px-20" onClick={startGame}>
                Start Game
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
