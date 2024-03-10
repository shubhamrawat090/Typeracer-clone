import { Server, Socket } from "socket.io";
import { Game } from "./classes/game";

// This keeps a track of all the rooms. And when someone wants to join the room we just search for the roomID in this map in O(1) and fetch the game associated with it.
export const rooms = new Map<string, Game>();

export function setupListeners(io: Server) {
  io.on("connection", (socket: Socket) => {
    console.log(`New connection - ${socket.id}`);

    socket.on("join-game", (roomId: string, name: string) => {
      if (!roomId) return socket.emit("error", "Invalid room ID");
      if (!name) return socket.emit("error", "Please provide name");

      socket.join(roomId);

      if (rooms.has(roomId)) {
        // room already exists
        const game = rooms.get(roomId); // fetch the game instance
        if (!game) return socket.emit("error", "Game not found");
        // If game already exists then simply join the player to the game
        game.joinPlayer(socket.id, name, socket);
      } else {
        // room does not exist
        // Create the game as it doesn't exist
        const game = new Game(roomId, io, socket.id);
        rooms.set(roomId, game); // storing the roomID => game info in our map of rooms
        // Join the player after the game has been created
        game.joinPlayer(socket.id, name, socket);
      }
    });
  });
}
