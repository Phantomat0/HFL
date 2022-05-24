import Room, { client } from "..";
import { FullPlayerObject } from "../HBClient";
import { SHOW_DEBUG_CHAT } from "../roomConfig";

export default function onJoin(player: FullPlayerObject) {
  Room.players.createAndAdd(player);

  if (!Room.isBotOn) return;

  if (SHOW_DEBUG_CHAT) {
    client.setPlayerAdmin(player.id, true);
    if (client.getPlayerList().length === 1) {
      client.startGame();
      client.setPlayerTeam(player.id, 1);
      client.setPlayerDiscProperties(player.id, { x: -150, y: 0 });
    } else {
      client.setPlayerTeam(player.id, 2);
      client.setPlayerDiscProperties(player.id, { x: 150, y: 0 });
    }
  }
}
