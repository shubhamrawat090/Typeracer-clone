import { Server, Socket } from "socket.io";
import { generateParagraph } from "../utils/generateParagraph";
import { rooms } from "../setupListeners";

export class Game {
  gameStatus: "not-started" | "in-progress" | "finished";
  gameId: string;
  players: { id: string; score: number; name: string }[];
  io: Server;
  gameHost: string;
  paragraph: string;

  constructor(id: string, io: Server, host: string) {
    this.gameId = id;
    this.players = [];
    this.io = io;
    this.gameHost = host;
    this.gameStatus = "not-started";
    this.paragraph = "";
  }

  // Listeners are needed to be setup for each player who joins and not just the room they join
  setupListeners(socket: Socket) {
    socket.on("start-game", async () => {
      if (this.gameStatus === "in-progress")
        return socket.emit("error", "The game has already started");

      // Only HOSTS are allowed to start the game
      if (this.gameHost !== socket.id)
        return socket.emit(
          "error",
          "You are not the host of the game. Only hosts are allowed to start the game."
        );

      // Reset the leaderboard to 0
      for (const player of this.players) {
        player.score = 0; // all players' score reset
      }

      // To everyone in the game room we emit the new updated player scores
      this.io.to(this.gameId).emit("players", this.players);

      this.gameStatus = "in-progress";

      // Get the paragraph
      const paragraph = await generateParagraph();
      this.paragraph = paragraph;
      // send this paragraph to every single person in the lobby
      this.io.to(this.gameId).emit("game-started", paragraph);

      // allow typing for 60 minutes only - SCOPE maybe host can set the timer as well
      setTimeout(() => {
        // end the game after 60 seconds have been passed
        this.gameStatus = "finished";
        this.io.to(this.gameId).emit("game-finished");
        // even if the players disconnect we send them all the players data to keep then in sync
        this.io.to(this.gameId).emit("players", this.players);
      }, 60000);
    });

    // Track keystrokes to keep a track of how many words have been typed by the players
    // NOTE: We are doing this on server side as client side is easily hackable/manipulated. This might be a little expensive but it seems the right way to do it.
    socket.on("player-typed", (typed: string) => {
      // If someone tries to emit socket events before starting the game, we don't allow them.
      if (this.gameStatus !== "in-progress")
        return socket.emit("error", "The game has not started yet");

      // Calculate the score
      // 1. Split the actual paragraph
      // 2. Split user typed paragraph
      // 3. Compare how many words are equal
      // 4. STOP COUNTING AFTER FIRST UNEQUAL WORD
      const splittedParagraph = this.paragraph.split(" ");
      const splittedTyped = typed.split(" ");

      let score = 0;
      for (let i = 0; i < splittedTyped.length; i++) {
        if (splittedTyped[i] === splittedParagraph[i]) {
          score++;
        } else {
          break;
        }
      }

      // Find the corresponding player and update their score
      const player = this.players.find((player) => player.id === socket.id);
      if (player) player.score = score;

      // The player's new score is being sent to all the players in the room
      this.io.to(this.gameId).emit("player-score", { id: socket.id, score });
    });

    // What happens when the player leaves???
    socket.on("leave", () => this.leavePlayer(socket)); // leaves willingly

    socket.on("disconnect", () => this.leavePlayer(socket)); // socket connection disconnects for some reason
  }

  leavePlayer(socket: Socket) {
    // If a host leaves the game then we transfer the host rights to someone else
    if (socket.id === this.gameHost) {
      this.players = this.players.filter((player) => player.id !== socket.id);
      if (this.players.length !== 0) {
        // People left other than host, make one of them the host
        this.gameHost = this.players[0].id;
        // send new host info to all the players
        this.io.to(this.gameId).emit("new-host", this.gameHost);
        // inform all other players that the player has left
        this.io.to(this.gameId).emit("player-left", socket.id);
      } else {
        // After host has left if there are no other players then we just delete the room
        rooms.delete(this.gameId);
      }
    }

    // leave the player's room
    socket.leave(this.gameId);
    // remove player from list of all the players
    this.players = this.players.filter((player) => player.id !== socket.id);
    // inform all other players that the player has left
    this.io.to(this.gameId).emit("player-left", socket.id);
  }

  joinPlayer(id: string, name: string, socket: Socket) {
    if (this.gameStatus === "in-progress")
      return socket.emit(
        "error",
        "Game has already started, please wait for it to end before joining"
      );

    // Game is not in-progress so we can add the player in the list of players
    this.players.push({ id, name, score: 0 });

    // To the created game room we send a message indicating that a new player has joined
    this.io.to(this.gameId).emit("player-joined", { id, name, score: 0 });

    // Helps the curr player keep a track of all the players
    socket.emit("players", this.players);
    // Updates the host of the current game
    socket.emit("new-host", this.gameHost);

    // Once the player has joined the room then it is time to setup the listeners
    this.setupListeners(socket);
  }
}
