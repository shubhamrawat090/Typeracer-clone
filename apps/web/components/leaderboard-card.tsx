"use client";

import { Player } from "@/types/types";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

export default function LeaderboardCard({
  player,
  rank,
  host,
  you,
}: {
  player: Player;
  rank: number;
  host: string;
  you: boolean;
}) {
  return (
    <Card className="w-full flex p-5 gap-5 items-start">
      <div className="text-xl" title={"Player number " + rank}>
        #&nbsp;{rank}
      </div>
      <div className="text-xl" title={"Name of the player is " + player.name}>
        {player.name}
      </div>
      <div className="flex items-center gap-2">
        {you && (
          <p>
            <Badge
              variant={"secondary"}
              title={"Player number " + rank + " is the YOU"}
            >
              YOU
            </Badge>
          </p>
        )}
        {player.id === host && (
          <p>
            <Badge
              variant={"destructive"}
              title={"Player number " + rank + " is the host"}
            >
              HOST
            </Badge>
          </p>
        )}
      </div>
      <div
        className="ml-auto text-xl"
        title={
          "Player number " + rank + " has scored " + player.score + " points"
        }
      >
        {player.score}
      </div>
    </Card>
  );
}
