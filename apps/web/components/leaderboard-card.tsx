"use client";

import { Player } from "@/types/types";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";

export default function LeaderboardCard({
  player,
  rank,
  host,
}: {
  player: Player;
  rank: number;
  host: string;
}) {
  return (
    <Card className="w-full flex p-5 gap-5 items-start">
      <div className="text-xl" title={"Player number " + rank}>
        #&nbsp;{rank}
      </div>
      <div className="text-xl" title={"Name of the player is " + player.name}>
        {player.name}
      </div>
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
